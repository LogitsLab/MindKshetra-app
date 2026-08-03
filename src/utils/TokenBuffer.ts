/**
 * Accumulates streamed tokens and delivers them in batches via `onFlush`.
 *
 * SSE streaming can emit dozens of tokens per second; committing React state
 * per token forces a re-render each time. Batching to ~50ms keeps the stream
 * feeling live while capping re-renders at ~20/s.
 */
export class TokenBuffer {
  private pending = "";
  private timer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  constructor(
    private readonly onFlush: (chunk: string) => void,
    private readonly intervalMs = 50
  ) {}

  push(token: string): void {
    if (this.destroyed || !token) return;
    this.pending += token;
    if (this.timer === null) {
      this.timer = setTimeout(() => {
        this.timer = null;
        this.emit();
      }, this.intervalMs);
    }
  }

  /**
   * Deliver anything pending immediately — for when the streaming message is
   * replaced, completed, or errored. No-op when nothing is pending.
   */
  flush(): void {
    this.clearTimer();
    this.emit();
  }

  /** Cancel the timer and drop pending tokens. The buffer is inert after. */
  destroy(): void {
    this.clearTimer();
    this.pending = "";
    this.destroyed = true;
  }

  private emit(): void {
    if (!this.pending) return;
    const chunk = this.pending;
    this.pending = "";
    this.onFlush(chunk);
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
