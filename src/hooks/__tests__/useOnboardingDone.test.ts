/**
 * Pure mirror of useOnboardingDone's gate — keeps tabs / index / routing
 * from drifting apart again (signed-in + !complete used to bounce forever).
 */
function onboardingDone(opts: {
  forceReplay: boolean;
  complete: boolean;
  isSignedIn: boolean;
}): boolean {
  return opts.forceReplay ? false : opts.complete || opts.isSignedIn;
}

describe("onboardingDone gate", () => {
  it("lets signed-in users through even when the local flag is false", () => {
    expect(
      onboardingDone({ forceReplay: false, complete: false, isSignedIn: true })
    ).toBe(true);
  });

  it("lets guests through only after the local flag is set", () => {
    expect(
      onboardingDone({
        forceReplay: false,
        complete: false,
        isSignedIn: false,
      })
    ).toBe(false);
    expect(
      onboardingDone({ forceReplay: false, complete: true, isSignedIn: false })
    ).toBe(true);
  });

  it("honors forceReplay over a restored session", () => {
    expect(
      onboardingDone({ forceReplay: true, complete: true, isSignedIn: true })
    ).toBe(false);
  });
});
