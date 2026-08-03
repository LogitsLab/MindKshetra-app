/** @jest-environment node */

import {
  birthPayloadFromDetails,
  dateFromDob,
  dobFromDate,
  emptyBirthDetails,
  isCompleteBirthDetails,
  tobFromDate,
} from "../birthDetails";

const place = {
  label: "Ujjain, Madhya Pradesh",
  lat: 23.18,
  lng: 75.78,
  ianaTz: "Asia/Kolkata",
};

describe("birthPayloadFromDetails", () => {
  it("returns null until dob and place are both set", () => {
    expect(birthPayloadFromDetails(emptyBirthDetails)).toBeNull();
    expect(
      birthPayloadFromDetails({ ...emptyBirthDetails, dob: "1992-08-14" })
    ).toBeNull();
    expect(
      birthPayloadFromDetails({ ...emptyBirthDetails, place })
    ).toBeNull();
  });

  it("sends the picked time with tobUnknown false", () => {
    const payload = birthPayloadFromDetails({
      dob: "1992-08-14",
      tob: "06:45",
      tobUnknown: false,
      place,
    });
    expect(payload).toEqual({
      dob: "1992-08-14",
      tob: "06:45",
      tobUnknown: false,
      placeLabel: place.label,
      lat: place.lat,
      lng: place.lng,
      ianaTz: place.ianaTz,
    });
  });

  it("sends tob null and tobUnknown true when the switch is on", () => {
    const payload = birthPayloadFromDetails({
      dob: "1992-08-14",
      tob: "06:45",
      tobUnknown: true,
      place,
    });
    expect(payload).toMatchObject({ tob: null, tobUnknown: true });
  });

  it("is complete without a valid tob when the time is unknown", () => {
    expect(
      isCompleteBirthDetails({
        dob: "1992-08-14",
        tob: "",
        tobUnknown: true,
        place,
      })
    ).toBe(true);
  });

  it("passes utcOffsetMinutes through when the geocoder provides it", () => {
    const payload = birthPayloadFromDetails({
      dob: "1992-08-14",
      tob: "06:45",
      tobUnknown: false,
      place: { ...place, utcOffsetMinutes: 330 },
    });
    expect(payload).toMatchObject({ utcOffsetMinutes: 330 });
  });
});

describe("date round-trips", () => {
  it("dob survives Date conversion without timezone drift", () => {
    expect(dobFromDate(dateFromDob("1992-08-14"))).toBe("1992-08-14");
    expect(dobFromDate(dateFromDob("2001-01-01"))).toBe("2001-01-01");
  });

  it("tob formats with zero padding", () => {
    expect(tobFromDate(new Date(2020, 0, 1, 6, 5))).toBe("06:05");
    expect(tobFromDate(new Date(2020, 0, 1, 23, 59))).toBe("23:59");
  });
});
