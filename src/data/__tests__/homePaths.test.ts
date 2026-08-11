/** @jest-environment node */

import { HOME_PATHS } from "../homePaths";
import { leelaDedicatedAssets } from "@/theme/leelaDedicatedAssets";
import {
  LEELA_HOME_TILE_ARTWORK_KEY,
  LEELA_HUB_ARTWORK_KEY,
} from "@/theme/leelaArtworkKeys";
import {
  resolveLeelaHomeTileArtwork,
  resolveLeelaHubArtwork,
} from "@/theme/leelaArt";
import { resolveLeelaHomeTileArtworkFocus } from "@/theme/leelaSceneFocus";

describe("HOME_PATHS discovery", () => {
  it("includes Krishna Leela as a shared Home/Path entry to /leela", () => {
    const leela = HOME_PATHS.find((path) => path.titleKey === "homeLeelaTitle");
    expect(leela).toBeDefined();
    expect(leela?.href).toBe("/leela");
    expect(leela?.blurbKey).toBe("homeLeelaBlurb");
    expect(leela?.image).toBeTruthy();
  });

  it("uses portrait-friendly flute art on Home, not the panoramic hub hero", () => {
    expect(LEELA_HOME_TILE_ARTWORK_KEY).toBe("leela-flute-vrindavan");
    expect(LEELA_HUB_ARTWORK_KEY).toBe("leela-hub-hero");
    const leela = HOME_PATHS.find((path) => path.titleKey === "homeLeelaTitle");
    expect(leela?.image).toBe(resolveLeelaHomeTileArtwork());
    expect(leela?.image).toBe(leelaDedicatedAssets["leela-flute-vrindavan"]);
    expect(leela?.image).not.toBe(resolveLeelaHubArtwork());
    expect(resolveLeelaHubArtwork()).toBe(
      leelaDedicatedAssets["leela-hub-hero"]
    );
  });

  it("uses center cover-fill on the Home PathTile to avoid a top fringe", () => {
    expect(resolveLeelaHomeTileArtworkFocus()).toBe("center");
    const leela = HOME_PATHS.find((path) => path.titleKey === "homeLeelaTitle");
    expect(leela?.imageFocus).toBe("center");
  });

  it("keeps unique indexes and a single Leela destination", () => {
    const indexes = HOME_PATHS.map((path) => path.index);
    expect(new Set(indexes).size).toBe(indexes.length);
    expect(
      HOME_PATHS.filter((path) => path.href === "/leela")
    ).toHaveLength(1);
  });

  it("places Krishna Leela last in Paths Into", () => {
    expect(HOME_PATHS.map((p) => p.titleKey)).toEqual([
      "homeExploreTitle",
      "homeMoodTitle",
      "homeMeditationTitle",
      "homeMadhavTitle",
      "homeAstroTitle",
      "homeBlockPathsTitle",
      "homeLeelaTitle",
    ]);
    expect(HOME_PATHS[HOME_PATHS.length - 1]?.titleKey).toBe("homeLeelaTitle");
    expect(HOME_PATHS[HOME_PATHS.length - 1]?.index).toBe("07");
  });
});
