// Mock data fallback when API is unavailable

export const ENERGY_DATA = [
  { v: 280 },
  { v: 310 },
  { v: 295 },
  { v: 340 },
  { v: 380 },
  { v: 420 },
  { v: 395 },
  { v: 440 },
  { v: 410 },
  { v: 460 },
  { v: 480 },
  { v: 500 },
];

export const CARBON_DATA = [
  { v: 280 },
  { v: 320 },
  { v: 290 },
  { v: 350 },
  { v: 310 },
  { v: 270 },
  { v: 340 },
];

export const INTENSITY_DATA = [
  { v: 120 },
  { v: 115 },
  { v: 112 },
  { v: 108 },
  { v: 105 },
  { v: 103 },
  { v: 100 },
  { v: 99 },
  { v: 97 },
  { v: 96 },
  { v: 97 },
  { v: 98 },
];

export const COST_DATA = [
  { v: 180 },
  { v: 210 },
  { v: 195 },
  { v: 240 },
  { v: 280 },
  { v: 310 },
  { v: 290 },
  { v: 330 },
  { v: 350 },
  { v: 370 },
  { v: 385 },
  { v: 400 },
];

export const RENEWABLE_DATA = [
  { v: 78 },
  { v: 80 },
  { v: 81 },
  { v: 80 },
  { v: 82 },
  { v: 84 },
  { v: 83 },
  { v: 85 },
  { v: 84 },
  { v: 86 },
  { v: 85 },
  { v: 85 },
];

export const LOAD_DATA = [
  { v: 55 },
  { v: 58 },
  { v: 60 },
  { v: 63 },
  { v: 61 },
  { v: 60 },
  { v: 58 },
  { v: 59 },
  { v: 60 },
  { v: 62 },
  { v: 61 },
  { v: 60 },
];

export const CARD_VALUES = {
  totalEnergy: { value: "8,456", delta: "+12%", deltaVariant: "up-bad" as const },
  carbonEmission: { value: "2,340", delta: "+2%", deltaVariant: "up-bad" as const },
  energyIntensity: { value: "98", delta: "−7%", deltaVariant: "down-good" as const },
  todayCost: { value: "5,240", delta: "+8%", deltaVariant: "up-bad" as const },
  renewableRate: { value: "85", deltaVariant: "neutral" as const, progressValue: 85 },
  loadStatus: { value: "60", deltaVariant: "up-good" as const, progressValue: 60 },
};
