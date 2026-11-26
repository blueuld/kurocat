import { invoke } from '@tauri-apps/api/core';

/**
 * 实时轮廓采样器。
 *
 * 目的：悬停让位/点击命中不再依赖「猫长什么样」的硬编码几何，而是直接读当前帧的 alpha 通道，
 * 换皮肤（大肥鱼、鲸鱼娘…）、改缩放、换姿态都能自动适配。
 *
 * 做法：把画布缩到很小的网格（默认 48×48），alpha 超过阈值的格子置 1，得到一张位图；
 * 变化时通过一次 IPC 推给主进程，主进程用光标位置查表即可，无需每帧通信。
 *
 * 注意：WebGL 画布离开渲染帧后内容会被清空，所以 3D 模式必须在渲染回调里同一帧内采样；
 * 2D 画布内容会保留，可以由定时器采样。
 */

const MASK_SIZE = 48;
const SAMPLE_INTERVAL_MS = 200;
const ALPHA_THRESHOLD = 24; // 约 9% 不透明度，滤掉抗锯齿边缘的噪点
const EMPTY_STREAK_LIMIT = 6; // 连续多次采到空白说明读不到画布，交回几何兜底

export class SilhouetteSampler {
  private readonly buffers: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private bits: Uint8Array;
  private lastSampleAt = 0;
  private emptyStreak = 0;
  private disabled = false;
  private overlaySelectors: string[] = [];

  constructor(overlaySelectors: string[] = []) {
    this.overlaySelectors = overlaySelectors;
    this.buffers = document.createElement('canvas');
    this.buffers.width = MASK_SIZE;
    this.buffers.height = MASK_SIZE;
    const ctx = this.buffers.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      this.disabled = true;
      this.ctx = null as unknown as CanvasRenderingContext2D;
      this.bits = new Uint8Array(0);
      return;
    }
    this.ctx = ctx;
    this.bits = new Uint8Array(((MASK_SIZE * MASK_SIZE) >> 3) + 1);
  }

  /** 设置需要一并算进掩码的 DOM 覆盖物（字数标签、更新提示条等） */
  setOverlaySelectors(selectors: string[]): void {
    this.overlaySelectors = selectors;
  }

  /**
   * 采样一帧。source 必须是当前正在显示的画布。
   * 3D（WebGL）必须在渲染回调内调用，否则读到空白。
   */
  sample(source: HTMLCanvasElement | null, now = performance.now()): void {
    if (this.disabled || !source || source.width === 0 || source.height === 0) return;
    if (now - this.lastSampleAt < SAMPLE_INTERVAL_MS) return;
    this.lastSampleAt = now;

    const next = new Uint8Array(this.bits.length);
    let painted = 0;

    try {
      this.ctx.clearRect(0, 0, MASK_SIZE, MASK_SIZE);
      this.ctx.drawImage(source, 0, 0, MASK_SIZE, MASK_SIZE);
      const data = this.ctx.getImageData(0, 0, MASK_SIZE, MASK_SIZE).data;
      for (let i = 0; i < MASK_SIZE * MASK_SIZE; i += 1) {
        if (data[i * 4 + 3] > ALPHA_THRESHOLD) {
          next[i >> 3] |= 1 << (i & 7);
          painted += 1;
        }
      }
    } catch {
      // 读画布失败（例如上下文丢失）：停止推送，让主进程回退几何判定
      void this.clear();
      return;
    }

    painted += this.paintOverlays(next);

    // 画布完全空白但窗口里明明有内容 —— 大概率是读不到 WebGL 缓冲，
    // 连续几次就放弃，避免把整只猫判定成「不可交互」。
    if (painted === 0) {
      this.emptyStreak += 1;
      if (this.emptyStreak >= EMPTY_STREAK_LIMIT && this.bits.some((b) => b !== 0)) {
        void this.clear();
      }
      return;
    }
    this.emptyStreak = 0;

    if (this.sameAs(next)) return;
    this.bits = next;
    void invoke('set_pet_mask', {
      bits: Array.from(next),
      size: MASK_SIZE,
    }).catch(() => {
      /* 窗口正在销毁时忽略 */
    });
  }

  /** 主动清空（主进程会回退到几何判定） */
  async clear(): Promise<void> {
    this.disabled = true;
    this.bits = new Uint8Array(0);
    try {
      await invoke('set_pet_mask', { bits: [], size: 0 });
    } catch {
      /* ignore */
    }
  }

  private paintOverlays(target: Uint8Array): number {
    if (this.overlaySelectors.length === 0) return 0;
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w <= 0 || h <= 0) return 0;
    let painted = 0;
    for (const selector of this.overlaySelectors) {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el || el.classList.contains('hidden')) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;
      const x0 = Math.max(0, Math.floor((rect.left / w) * MASK_SIZE));
      const x1 = Math.min(MASK_SIZE - 1, Math.floor(((rect.left + rect.width) / w) * MASK_SIZE));
      const y0 = Math.max(0, Math.floor((rect.top / h) * MASK_SIZE));
      const y1 = Math.min(MASK_SIZE - 1, Math.floor(((rect.top + rect.height) / h) * MASK_SIZE));
      for (let y = y0; y <= y1; y += 1) {
        for (let x = x0; x <= x1; x += 1) {
          const idx = y * MASK_SIZE + x;
          target[idx >> 3] |= 1 << (idx & 7);
          painted += 1;
        }
      }
    }
    return painted;
  }

  private sameAs(next: Uint8Array): boolean {
    if (next.length !== this.bits.length) return false;
    for (let i = 0; i < next.length; i += 1) {
      if (next[i] !== this.bits[i]) return false;
    }
    return true;
  }
}
