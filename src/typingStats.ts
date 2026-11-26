/**
 * 打字统计：今日字数 + 实时速度（字/分）。
 *
 * 说明：这个模块只统计"键次"，不记录任何具体字符内容——收到的事件里本来就只有
 * 虚拟键码（vk），这里只做计数，不落盘、不上传任何按键明细。
 */

const STORAGE_KEY = 'kurocat.typing-stats.v1';
const SPEED_WINDOW_MS = 10_000; // 速度统计窗口：最近 10 秒
const SPEED_MIN_SPAN_MS = 2_000; // 起步阶段的分母下限，避免刚敲两下就飙到几百
const IDLE_RESET_MS = 4_000; // 停手超过 4 秒，速度显示归零
const FLUSH_DELAY_MS = 1_500; // 写入 localStorage 的防抖间隔
const HISTORY_DAYS = 60; // 每日历史保留天数

export interface TypingStatsSnapshot {
  /** 今日累计字数 */
  today: number;
  /** 最近 10 秒折算的每分钟字数 */
  cpm: number;
  /** 当前统计归属的自然日（本地时区） */
  day: string;
}

interface PersistedState {
  day: string;
  today: number;
  history: Record<string, number>;
}

/** 修饰键 / 锁定键 / 系统键：这些不该算作"打字" */
const IGNORED_VKS = new Set<number>([
  0x10, // Shift
  0x11, // Ctrl
  0x12, // Alt
  0x14, // CapsLock
  0x5b, // LWin
  0x5c, // RWin
  0x5d, // Menu
  0x90, // NumLock
  0x91, // ScrollLock
  0x2c, // PrintScreen
  0xff, // 无映射
]);

function localDayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function emptyState(): PersistedState {
  return { day: localDayKey(), today: 0, history: {} };
}

function readState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const day = typeof parsed.day === 'string' ? parsed.day : localDayKey();
    const today = Number.isFinite(parsed.today) ? Math.max(0, Math.floor(parsed.today as number)) : 0;
    const history: Record<string, number> = {};
    if (parsed.history && typeof parsed.history === 'object') {
      for (const [key, value] of Object.entries(parsed.history)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(key) && Number.isFinite(value)) {
          history[key] = Math.max(0, Math.floor(value as number));
        }
      }
    }
    return { day, today, history };
  } catch {
    return emptyState();
  }
}

export class TypingStats {
  private state: PersistedState;
  private stamps: number[] = [];
  private flushTimer: number | undefined;
  private dirty = false;

  constructor() {
    this.state = readState();
    this.rollover();
    window.addEventListener('beforeunload', () => this.flush());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flush();
    });
  }

  /** 记录一次有效击键。调用方负责过滤修饰键与自动重复。 */
  record(now = Date.now()): void {
    this.rollover(new Date(now));
    this.state.today += 1;
    this.state.history[this.state.day] = this.state.today;
    this.stamps.push(now);
    this.prune(now);
    this.dirty = true;
    this.scheduleFlush();
  }

  /** 判断某个虚拟键码是否值得计数 */
  static isCountableVk(vk: number): boolean {
    return !IGNORED_VKS.has(vk);
  }

  snapshot(now = Date.now()): TypingStatsSnapshot {
    this.rollover(new Date(now));
    this.prune(now);
    return { today: this.state.today, cpm: this.speed(now), day: this.state.day };
  }

  private speed(now: number): number {
    if (!this.stamps.length) return 0;
    const last = this.stamps[this.stamps.length - 1];
    if (now - last > IDLE_RESET_MS) return 0;
    const first = Math.max(this.stamps[0], now - SPEED_WINDOW_MS);
    const span = Math.max(now - first, SPEED_MIN_SPAN_MS);
    return Math.round((this.stamps.length * 60_000) / span);
  }

  private prune(now: number): void {
    const cutoff = now - SPEED_WINDOW_MS;
    let index = 0;
    while (index < this.stamps.length && this.stamps[index] < cutoff) index += 1;
    if (index) this.stamps.splice(0, index);
  }

  /** 跨天自动清零今日计数，并把昨天归档进历史 */
  private rollover(date = new Date()): void {
    const day = localDayKey(date);
    if (this.state.day === day) return;
    if (this.state.today > 0) this.state.history[this.state.day] = this.state.today;
    this.state.day = day;
    this.state.today = this.state.history[day] ?? 0;
    this.stamps = [];
    this.dirty = true;
    this.scheduleFlush();
    this.trimHistory();
  }

  private trimHistory(): void {
    const days = Object.keys(this.state.history).sort();
    while (days.length > HISTORY_DAYS) {
      const oldest = days.shift();
      if (oldest) delete this.state.history[oldest];
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer !== undefined) return;
    this.flushTimer = window.setTimeout(() => {
      this.flushTimer = undefined;
      this.flush();
    }, FLUSH_DELAY_MS);
  }

  flush(): void {
    if (!this.dirty) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      this.dirty = false;
    } catch {
      /* 存储配额或隐私模式下写不进去，忽略即可 */
    }
  }
}
