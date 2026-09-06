/**
 * Plain-language meaning of each of the 12 houses (bhavas), en/hi.
 *
 * Beginner-first: `title` is the life-area in two or three words, `meaning` is
 * one sentence a non-astrologer can read. Wording mirrors the areas the engine
 * already reasons about in lib/astrology/blend.ts and lalkitab.ts.
 */

export type HouseSignification = {
  house: number;
  title: { en: string; hi: string };
  meaning: { en: string; hi: string };
};

export const HOUSE_SIGNIFICATIONS: HouseSignification[] = [
  {
    house: 1,
    title: { en: "Self & body", hi: "स्वयं व शरीर" },
    meaning: {
      en: "You — your personality, health, vitality and how you meet the world.",
      hi: "आप स्वयं — व्यक्तित्व, स्वास्थ्य, जीवन-शक्ति और दुनिया से मिलने का ढंग।",
    },
  },
  {
    house: 2,
    title: { en: "Wealth & speech", hi: "धन व वाणी" },
    meaning: {
      en: "Money, possessions, family, food and the way you speak.",
      hi: "धन, संपत्ति, परिवार, भोजन और आपकी वाणी।",
    },
  },
  {
    house: 3,
    title: { en: "Courage & effort", hi: "साहस व प्रयास" },
    meaning: {
      en: "Courage, siblings, communication and self-made effort.",
      hi: "साहस, भाई-बहन, संवाद और स्वयं के प्रयास।",
    },
  },
  {
    house: 4,
    title: { en: "Home & mother", hi: "घर व माँ" },
    meaning: {
      en: "Home, mother, comfort and inner peace of mind.",
      hi: "घर, माता, सुख और मन की शांति।",
    },
  },
  {
    house: 5,
    title: { en: "Creativity & children", hi: "सृजन व संतान" },
    meaning: {
      en: "Creativity, children, romance, learning and intelligence.",
      hi: "सृजन, संतान, प्रेम, शिक्षा और बुद्धि।",
    },
  },
  {
    house: 6,
    title: { en: "Health & service", hi: "स्वास्थ्य व सेवा" },
    meaning: {
      en: "Daily work, health, service, and the obstacles you overcome.",
      hi: "दैनिक कार्य, स्वास्थ्य, सेवा और बाधाओं पर विजय।",
    },
  },
  {
    house: 7,
    title: { en: "Partnership", hi: "साझेदारी" },
    meaning: {
      en: "Marriage, partnerships and one-to-one relationships.",
      hi: "विवाह, साझेदारी और आमने-सामने के रिश्ते।",
    },
  },
  {
    house: 8,
    title: { en: "Change & depth", hi: "परिवर्तन व गहराई" },
    meaning: {
      en: "Transformation, shared resources, longevity and hidden matters.",
      hi: "रूपांतरण, साझा संसाधन, आयु और गुप्त विषय।",
    },
  },
  {
    house: 9,
    title: { en: "Fortune & dharma", hi: "भाग्य व धर्म" },
    meaning: {
      en: "Fortune, faith, higher learning, teachers and long journeys.",
      hi: "भाग्य, आस्था, उच्च शिक्षा, गुरु और लंबी यात्राएँ।",
    },
  },
  {
    house: 10,
    title: { en: "Career & standing", hi: "करियर व प्रतिष्ठा" },
    meaning: {
      en: "Career, reputation, status and your action in the world.",
      hi: "करियर, प्रतिष्ठा, स्थान और संसार में आपका कर्म।",
    },
  },
  {
    house: 11,
    title: { en: "Gains & friends", hi: "लाभ व मित्र" },
    meaning: {
      en: "Income, gains, friendships, networks and hopes fulfilled.",
      hi: "आय, लाभ, मित्रता, नेटवर्क और आशाओं की पूर्ति।",
    },
  },
  {
    house: 12,
    title: { en: "Release & spirit", hi: "त्याग व आध्यात्म" },
    meaning: {
      en: "Letting go, solitude, expenses, rest and the path to liberation.",
      hi: "त्याग, एकांत, व्यय, विश्राम और मोक्ष का मार्ग।",
    },
  },
];

export function houseSignification(house: number): HouseSignification | undefined {
  return HOUSE_SIGNIFICATIONS[house - 1];
}
