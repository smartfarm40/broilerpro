export type Role = "owner" | "manager" | "supervisor" | "operator" | "viewer";

export type CoopStatus = "active" | "empty" | "harvest" | "inactive";
export type FlockStatus = "active" | "closed" | "harvest";
export type FeedType = "starter" | "grower" | "finisher";
export type HealthCondition = "normal" | "warning" | "critical";
export type Strain = "ross_308" | "cobb_500" | "arbor_acres" | "other";

export interface PerformanceMetrics {
  fcr: number;
  adg: number;
  depletion: number;
  ipScore: number;
  livability: number;
  adfi: number;
}

// Standard weight data for strains (gram per day)
export const STRAIN_STANDARDS: Record<string, number[]> = {
  ross_308: [
    42, 57, 71, 89, 109, 131, 157, 186, 219, 256,
    297, 343, 393, 448, 507, 571, 639, 711, 787, 867,
    950, 1037, 1126, 1218, 1312, 1408, 1505, 1604, 1703, 1803,
    1903, 2003, 2103, 2202, 2300, 2397, 2493, 2587, 2680, 2771,
    2860, 2947, 3032,
  ],
  cobb_500: [
    44, 60, 76, 95, 117, 142, 170, 202, 238, 278,
    322, 370, 422, 478, 538, 602, 669, 740, 814, 891,
    971, 1054, 1139, 1227, 1317, 1409, 1502, 1597, 1693, 1790,
    1888, 1986, 2084, 2182, 2280, 2377, 2474, 2570, 2665, 2759,
    2851, 2942, 3031,
  ],
};

export function calculatePerformance(params: {
  totalFeed: number; // kg
  totalLiveWeight: number; // kg
  currentWeight: number; // gram
  previousWeight: number; // gram
  totalDead: number;
  totalCull: number;
  initialPopulation: number;
  currentPopulation: number;
  dayNumber: number;
  dailyFeedConsumed: number; // kg
}): PerformanceMetrics {
  const {
    totalFeed,
    totalLiveWeight,
    currentWeight,
    previousWeight,
    totalDead,
    totalCull,
    initialPopulation,
    currentPopulation,
    dayNumber,
    dailyFeedConsumed,
  } = params;

  const fcr = totalLiveWeight > 0 ? totalFeed / totalLiveWeight : 0;
  const adg = currentWeight - previousWeight;
  const depletion = initialPopulation > 0
    ? ((totalDead + totalCull) / initialPopulation) * 100
    : 0;
  const livability = 100 - depletion;
  const ipScore = fcr > 0 && dayNumber > 0
    ? (livability * (currentWeight / 1000) * 100) / (fcr * dayNumber)
    : 0;
  const adfi = currentPopulation > 0
    ? dailyFeedConsumed / currentPopulation
    : 0;

  return {
    fcr: Math.round(fcr * 1000) / 1000,
    adg: Math.round(adg * 10) / 10,
    depletion: Math.round(depletion * 100) / 100,
    ipScore: Math.round(ipScore * 10) / 10,
    livability: Math.round(livability * 100) / 100,
    adfi: Math.round(adfi * 1000) / 1000,
  };
}
