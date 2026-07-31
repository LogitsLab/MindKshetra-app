import { shouldMerge } from "../should-merge";

const anon = { id: "anon-1", is_anonymous: true };
const alice = { id: "alice", is_anonymous: false };
const bob = { id: "bob", is_anonymous: false };

describe("shouldMerge", () => {
  it("merges anonymous → signed-in (the magic-link path that was lost)", () => {
    expect(shouldMerge(anon, alice)).toBe(true);
  });

  it("merges signed-out → signed-in (guest data can exist with no auth user)", () => {
    expect(shouldMerge(null, alice)).toBe(true);
    expect(shouldMerge(undefined, alice)).toBe(true);
  });

  it("merges on account switch", () => {
    expect(shouldMerge(alice, bob)).toBe(true);
  });

  it("never merges into an anonymous or absent user", () => {
    expect(shouldMerge(null, anon)).toBe(false);
    expect(shouldMerge(alice, null)).toBe(false);
    expect(shouldMerge(anon, anon)).toBe(false);
  });

  it("does not merge a same-account re-authentication", () => {
    expect(shouldMerge(alice, alice)).toBe(false);
  });
});
