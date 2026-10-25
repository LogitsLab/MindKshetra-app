/** @jest-environment node */
import { dictionary } from "../dictionary";

/**
 * i18n completeness guard (mobile mirror of the web test).
 *
 * The composed `hi` dictionary is typed against `en`, so TypeScript catches a
 * missing Hindi KEY but not an empty Hindi VALUE — which is how
 * `homeLifestyleBlurb: ""` shipped blank. These runtime checks fail loudly on
 * empties and on any en/hi key drift.
 */
describe("i18n dictionary parity", () => {
  const enKeys = Object.keys(dictionary.en).sort();
  const hiKeys = Object.keys(dictionary.hi).sort();

  it("has the same keys in en and hi", () => {
    const missingInHi = enKeys.filter((k) => !(k in dictionary.hi));
    const extraInHi = hiKeys.filter((k) => !(k in dictionary.en));
    expect({ missingInHi, extraInHi }).toEqual({
      missingInHi: [],
      extraInHi: [],
    });
  });

  it("has no empty English strings", () => {
    const empty = enKeys.filter(
      (k) => !String(dictionary.en[k as keyof typeof dictionary.en]).trim()
    );
    expect(empty).toEqual([]);
  });

  it("has no empty Hindi strings", () => {
    const empty = hiKeys.filter(
      (k) => !String(dictionary.hi[k as keyof typeof dictionary.hi]).trim()
    );
    expect(empty).toEqual([]);
  });
});
