import { TokenBuffer } from "../TokenBuffer";

describe("TokenBuffer", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("batches tokens pushed within one window into a single flush", () => {
    const onFlush = jest.fn();
    const buffer = new TokenBuffer(onFlush, 50);

    buffer.push("Hello");
    buffer.push(", ");
    buffer.push("world");

    expect(onFlush).not.toHaveBeenCalled();

    jest.advanceTimersByTime(50);

    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith("Hello, world");

    buffer.destroy();
  });

  it("delivers tokens from later windows in later flushes, losing none", () => {
    const chunks: string[] = [];
    const buffer = new TokenBuffer((c) => chunks.push(c), 50);

    buffer.push("a");
    buffer.push("b");
    jest.advanceTimersByTime(50);

    buffer.push("c");
    jest.advanceTimersByTime(20);
    buffer.push("d");
    jest.advanceTimersByTime(30);

    expect(chunks).toEqual(["ab", "cd"]);
    expect(chunks.join("")).toBe("abcd");

    buffer.destroy();
  });

  it("flush() delivers pending tokens immediately and cancels the timer", () => {
    const onFlush = jest.fn();
    const buffer = new TokenBuffer(onFlush, 50);

    buffer.push("partial");
    buffer.flush();

    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith("partial");

    // The cancelled timer must not fire a second, empty flush.
    jest.advanceTimersByTime(100);
    expect(onFlush).toHaveBeenCalledTimes(1);

    buffer.destroy();
  });

  it("flush() with nothing pending does not invoke the callback", () => {
    const onFlush = jest.fn();
    const buffer = new TokenBuffer(onFlush, 50);

    buffer.flush();
    expect(onFlush).not.toHaveBeenCalled();

    buffer.destroy();
  });

  it("keeps buffering after a flush without losing tokens", () => {
    const chunks: string[] = [];
    const buffer = new TokenBuffer((c) => chunks.push(c), 50);

    buffer.push("one ");
    buffer.flush();
    buffer.push("two ");
    buffer.push("three");
    jest.advanceTimersByTime(50);

    expect(chunks.join("")).toBe("one two three");

    buffer.destroy();
  });

  it("destroy() drops pending tokens and ignores later pushes", () => {
    const onFlush = jest.fn();
    const buffer = new TokenBuffer(onFlush, 50);

    buffer.push("doomed");
    buffer.destroy();

    jest.advanceTimersByTime(100);
    expect(onFlush).not.toHaveBeenCalled();

    buffer.push("ignored");
    buffer.flush();
    jest.advanceTimersByTime(100);
    expect(onFlush).not.toHaveBeenCalled();
  });

  it("leaves no timers behind after destroy()", () => {
    const buffer = new TokenBuffer(() => undefined, 50);
    buffer.push("x");
    buffer.destroy();
    expect(jest.getTimerCount()).toBe(0);
  });
});
