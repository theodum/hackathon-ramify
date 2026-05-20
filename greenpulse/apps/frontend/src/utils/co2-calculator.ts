// =============================================================
// GREENPULSE — CO2 Client-Side Estimations
// Based on GreenIT Research & Boavizta methodology
// =============================================================

/**
 * CO2 emission factors (gCO2eq per unit)
 */
export const CO2_FACTORS = {
  /** gCO2eq per kWh (average EU grid intensity 2024) */
  ELECTRICITY_EU_G_PER_KWH: 295,

  /** gCO2eq per kWh (French grid — mostly nuclear) */
  ELECTRICITY_FR_G_PER_KWH: 58,

  /** gCO2eq per kWh (global average) */
  ELECTRICITY_GLOBAL_G_PER_KWH: 490,

  /** Energy per GB transferred over the Internet (kWh/GB) */
  NETWORK_KWH_PER_GB: 0.06,

  /** Energy per API call — average (kWh) */
  API_CALL_KWH: 0.000002,

  /** kWh per 1000 GPT-3.5-turbo tokens */
  AI_TOKEN_KWH_PER_1K_GPT35: 0.00042,

  /** kWh per 1000 GPT-4 tokens */
  AI_TOKEN_KWH_PER_1K_GPT4: 0.0035,

  /** kWh per 1000 Claude Sonnet tokens */
  AI_TOKEN_KWH_PER_1K_CLAUDE_SONNET: 0.0008,

  /** kWh per 1000 Claude Opus tokens */
  AI_TOKEN_KWH_PER_1K_CLAUDE_OPUS: 0.004,

  /** A single tree absorbs ~22 kg CO2/year */
  TREE_ABSORPTION_KG_CO2_PER_YEAR: 22,

  /** Average car emits ~120 gCO2/km */
  CAR_G_CO2_PER_KM: 120,
} as const;

/**
 * Estimate CO2 emissions from a web page size.
 * @param kb - page weight in kilobytes
 * @param gridFactor - gCO2eq/kWh (default: EU average)
 */
export function estimateCo2FromPageSize(
  kb: number,
  gridFactor = CO2_FACTORS.ELECTRICITY_EU_G_PER_KWH,
): number {
  const gb = kb / 1_000_000;
  const kwh = gb * CO2_FACTORS.NETWORK_KWH_PER_GB;
  return kwh * gridFactor;
}

/**
 * Estimate CO2 from API calls.
 * @param calls - number of API calls
 * @param avgMs - average response time in ms (higher = more server CPU)
 * @param gridFactor - gCO2eq/kWh
 */
export function estimateCo2FromApiCalls(
  calls: number,
  avgMs: number,
  gridFactor = CO2_FACTORS.ELECTRICITY_EU_G_PER_KWH,
): number {
  // Energy scales linearly with response time (simple model)
  const processingFactor = Math.max(1, avgMs / 100);
  const kwh = calls * CO2_FACTORS.API_CALL_KWH * processingFactor;
  return kwh * gridFactor;
}

/**
 * Estimate CO2 from AI token usage.
 * @param tokens - number of tokens
 * @param model - AI model identifier
 * @param gridFactor - gCO2eq/kWh
 */
export function estimateCo2FromAiTokens(
  tokens: number,
  model: string,
  gridFactor = CO2_FACTORS.ELECTRICITY_EU_G_PER_KWH,
): number {
  const lower = model.toLowerCase();
  let kwhPer1k: number;

  if (lower.includes('opus') || lower.includes('gpt-4')) {
    kwhPer1k = lower.includes('claude')
      ? CO2_FACTORS.AI_TOKEN_KWH_PER_1K_CLAUDE_OPUS
      : CO2_FACTORS.AI_TOKEN_KWH_PER_1K_GPT4;
  } else if (lower.includes('claude')) {
    kwhPer1k = CO2_FACTORS.AI_TOKEN_KWH_PER_1K_CLAUDE_SONNET;
  } else {
    kwhPer1k = CO2_FACTORS.AI_TOKEN_KWH_PER_1K_GPT35;
  }

  const kwh = (tokens / 1000) * kwhPer1k;
  return kwh * gridFactor;
}

/**
 * Extrapolate annual CO2 from a monthly figure.
 * @param monthly - monthly CO2 in grams
 */
export function estimateAnnualCo2(monthly: number): number {
  return monthly * 12;
}

/**
 * Convert CO2 grams to the number of trees needed to absorb it in 1 year.
 * @param grams - CO2 in grams
 */
export function co2ToTreeEquivalent(grams: number): number {
  const kg = grams / 1000;
  return kg / CO2_FACTORS.TREE_ABSORPTION_KG_CO2_PER_YEAR;
}

/**
 * Convert CO2 grams to equivalent kilometers driven by an average car.
 * @param grams - CO2 in grams
 */
export function co2ToKmCarEquivalent(grams: number): number {
  return grams / CO2_FACTORS.CAR_G_CO2_PER_KM;
}

/**
 * Convert CO2 grams to equivalent number of smartphone charges.
 * (Average charge ≈ 8.22 gCO2eq)
 */
export function co2ToSmartphoneCharges(grams: number): number {
  const CO2_PER_CHARGE = 8.22;
  return grams / CO2_PER_CHARGE;
}

/**
 * Convert kWh to CO2 grams using a given grid intensity.
 */
export function kwhToCo2(
  kwh: number,
  gridFactor = CO2_FACTORS.ELECTRICITY_EU_G_PER_KWH,
): number {
  return kwh * gridFactor;
}
