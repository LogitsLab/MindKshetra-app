import { deskChartFromBlob, formatDmsInSign, vargaOf } from "../chartModel";

describe("deskChartFromBlob", () => {
  it("maps compute JSON into desk planets, vargas, and KP", () => {
    const desk = deskChartFromBlob({
      tobUnknown: false,
      ephemerisMode: "swiss",
      ayanamsa: 23.7,
      planets: [
        {
          id: "moon",
          longitude: 318.5,
          sign: "aquarius",
          signIndex: 10,
          degreeInSign: 18.5,
          nakshatra: "Shatabhisha",
          pada: 1,
          nakshatraLord: "rahu",
          house: 7,
        },
      ],
      ascendant: {
        id: "ascendant",
        longitude: 145.7,
        sign: "leo",
        signIndex: 4,
        degreeInSign: 25.7,
        nakshatra: "Purva Phalguni",
        pada: 4,
        house: 1,
      },
      vargas: {
        d3: {
          ascendant: {
            id: "ascendant",
            longitude: 10,
            sign: "aries",
            signIndex: 0,
            degreeInSign: 10,
            nakshatra: "Ashwini",
            pada: 1,
            house: 1,
          },
          planets: [],
        },
      },
      kp: {
        cusps: [{ house: 1, longitude: 145.7, sign: "leo", subLord: "saturn" }],
        planets: [],
        significators: [{ house: 7, significators: ["venus", "jupiter"] }],
      },
      yogas: [{ id: "gaja", name: "Gajakesari", present: true, detail: "Moon-Jupiter" }],
    });

    expect(desk?.ephemerisMode).toBe("swiss");
    expect(desk?.planets[0]?.nakshatraLord).toBe("rahu");
    expect(desk?.kp?.cusps[0]?.subLord).toBe("saturn");
    expect(vargaOf(desk!, "d3")?.ascendant?.sign).toBe("aries");
    expect(desk?.yogas[0]?.present).toBe(true);
    expect(formatDmsInSign(13.76, "Leo")).toMatch(/13° Leo/);
  });
});
