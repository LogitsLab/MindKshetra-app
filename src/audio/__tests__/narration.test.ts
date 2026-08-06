/**
 * Ownership semantics for global narration — story SpeakButton mount must not
 * kill an in-flight Sanskrit session.
 */

type Callbacks = {
  onStopped?: () => void;
  onError?: () => void;
};

let session = 0;
let activeStopped: (() => void) | null = null;

function clearActive(): void {
  activeStopped = null;
}

function stopNarration(): void {
  session += 1;
  const prev = activeStopped;
  clearActive();
  prev?.();
}

function stopNarrationIfOwner(ownerSession: number): void {
  if (ownerSession === session) stopNarration();
}

function getNarrationSession(): number {
  return session;
}

function bindActive(cb: Callbacks): void {
  activeStopped = cb.onStopped ?? null;
}

function startPlay(cb: Callbacks): number {
  stopNarration();
  const my = session;
  bindActive(cb);
  return my;
}

describe("narration ownership", () => {
  beforeEach(() => {
    session = 0;
    activeStopped = null;
  });

  it("notifies the previous owner when a new play stops narration", () => {
    const firstStopped = jest.fn();
    const owner = startPlay({ onStopped: firstStopped });
    expect(owner).toBe(1);

    startPlay({ onStopped: jest.fn() });
    expect(firstStopped).toHaveBeenCalledTimes(1);
    expect(getNarrationSession()).toBe(2);
  });

  it("stopNarrationIfOwner is a no-op for a non-owner (story mount)", () => {
    const ownerStopped = jest.fn();
    const owner = startPlay({ onStopped: ownerStopped });
    expect(owner).toBe(1);

    // Fresh SpeakButton mount has no owner session — must not stop.
    stopNarrationIfOwner(-1);
    expect(ownerStopped).not.toHaveBeenCalled();
    expect(getNarrationSession()).toBe(1);

    // Owner teardown still works.
    stopNarrationIfOwner(owner);
    expect(ownerStopped).toHaveBeenCalledTimes(1);
    expect(getNarrationSession()).toBe(2);
  });

  it("prop-change stop only affects the owning session", () => {
    const aStopped = jest.fn();
    const bStopped = jest.fn();
    const a = startPlay({ onStopped: aStopped });
    // B starts and takes ownership (like user tapping story Listen).
    const b = startPlay({ onStopped: bStopped });
    expect(aStopped).toHaveBeenCalledTimes(1);

    // A's stale owner id must not stop B.
    stopNarrationIfOwner(a);
    expect(bStopped).not.toHaveBeenCalled();
    expect(getNarrationSession()).toBe(b);

    stopNarrationIfOwner(b);
    expect(bStopped).toHaveBeenCalledTimes(1);
  });
});
