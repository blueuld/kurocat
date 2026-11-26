//! 通过 Windows UI Automation 读取「焦点输入框」的文本长度变化，得到实际录入的字符数。
//!
//! 设计原则：
//! - 只比对长度差值，**不保存、不传输、不显示**任何文本内容；
//! - 输入法上屏时文本才真正变长，因此拼音过程不会虚高；
//! - 退格/删除让长度变短，直接回退计数；
//! - 长度跳变超过阈值（切换窗口、打开大文档、粘贴）一律视为换上下文，不计数。
//!
//! 取文本走三级回退，尽量覆盖不同年代的应用：
//! 1. TextPattern          —— 现代应用（记事本、浏览器、Office、多数 Electron）
//! 2. ValuePattern         —— 标准编辑框的 Value 属性（大量老 Win32 / Qt 程序）
//! 3. LegacyIAccessible    —— MSAA 兜底，覆盖 Win7 时代的控件

use tauri::AppHandle;

#[cfg(not(windows))]
pub fn start_typing_text_watcher(_app: AppHandle) {}

#[cfg(windows)]
pub fn start_typing_text_watcher(app: AppHandle) {
    std::thread::spawn(move || run_windows(app));
}

#[cfg(windows)]
fn run_windows(app: AppHandle) {
    use std::time::Duration;
    use tauri::Emitter;
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_INPROC_SERVER, COINIT_MULTITHREADED,
    };
    use windows::Win32::UI::Accessibility::{
        CUIAutomation, IUIAutomation, IUIAutomationElement, IUIAutomationLegacyIAccessiblePattern,
        IUIAutomationTextPattern, IUIAutomationValuePattern, UIA_LegacyIAccessiblePatternId,
        UIA_TextPatternId, UIA_ValuePatternId,
    };
    use windows_sys::Win32::UI::WindowsAndMessaging::GetForegroundWindow;

    /// 单次读取上限：超过这个长度的大文档不参与统计（读起来太贵，收益也低）
    const MAX_CHARS: i32 = 40_000;
    /// 单次长度跳变阈值：超过视为切换上下文或粘贴，不计入
    const MAX_STEP: i64 = 20;
    const POLL_MS: u64 = 240;

    /// 按三级回退读取焦点控件的文本长度（字符数）。
    unsafe fn text_len_of(element: &IUIAutomationElement) -> Option<usize> {
        if let Ok(pattern) = element.GetCurrentPatternAs::<IUIAutomationTextPattern>(UIA_TextPatternId)
        {
            if let Ok(range) = pattern.DocumentRange() {
                if let Ok(text) = range.GetText(MAX_CHARS) {
                    let len = text.to_string().chars().count();
                    // 达到上限说明是超大文档，长度不可信，直接放弃
                    if len < MAX_CHARS as usize {
                        return Some(len);
                    }
                    return None;
                }
            }
        }

        if let Ok(pattern) = element.GetCurrentPatternAs::<IUIAutomationValuePattern>(UIA_ValuePatternId)
        {
            if let Ok(value) = pattern.CurrentValue() {
                return Some(value.to_string().chars().count());
            }
        }

        if let Ok(pattern) =
            element.GetCurrentPatternAs::<IUIAutomationLegacyIAccessiblePattern>(UIA_LegacyIAccessiblePatternId)
        {
            if let Ok(value) = pattern.CurrentValue() {
                return Some(value.to_string().chars().count());
            }
        }

        None
    }

    unsafe {
        let com_inited = CoInitializeEx(None, COINIT_MULTITHREADED).is_ok();
        let uia: IUIAutomation = match CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER) {
            Ok(value) => value,
            Err(_) => {
                if com_inited {
                    CoUninitialize();
                }
                return;
            }
        };

        let mut last_foreground: isize = 0;
        let mut last_len: i64 = -1;
        let mut last_mode: Option<bool> = None;

        loop {
            std::thread::sleep(Duration::from_millis(POLL_MS));

            let foreground = GetForegroundWindow() as isize;
            if foreground != last_foreground {
                last_foreground = foreground;
                last_len = -1;
            }

            let element = match uia.GetFocusedElement() {
                Ok(element) => element,
                Err(_) => continue,
            };

            // 密码框一律跳过（隐私优先）
            if element
                .CurrentIsPassword()
                .map(|flag| flag.as_bool())
                .unwrap_or(false)
            {
                last_len = -1;
                continue;
            }

            let len = match text_len_of(&element) {
                Some(len) => len as i64,
                None => {
                    // 三级都读不到（游戏、自绘控件）：通知前端改用键码兜底
                    last_len = -1;
                    if last_mode != Some(false) {
                        last_mode = Some(false);
                        let _ = app.emit("kuro-text-mode", false);
                    }
                    continue;
                }
            };

            if last_mode != Some(true) {
                last_mode = Some(true);
                let _ = app.emit("kuro-text-mode", true);
            }

            if last_len >= 0 {
                let delta = len - last_len;
                if delta != 0 && delta.abs() <= MAX_STEP {
                    let _ = app.emit("kuro-text-delta", delta as i32);
                }
            }
            last_len = len;
        }
    }
}
