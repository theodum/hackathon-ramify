// Facteurs d'émission CO₂ (gCO₂eq)
export const CO2_FACTORS = {
  // France (mix électrique ~52gCO₂/kWh)
  ELECTRICITY_FR_GCO2_PER_KWH: 52,
  // Europe moyenne
  ELECTRICITY_EU_GCO2_PER_KWH: 296,
  // Transfert réseau (gCO₂/GB)
  NETWORK_GCO2_PER_GB: 54,
  // Stockage cloud (gCO₂/GB/mois)
  CLOUD_STORAGE_GCO2_PER_GB_MONTH: 0.6,
  // Facteur datacenter PUE moyen
  DATACENTER_PUE: 1.58,
} as const;

// Seuils de scores Green IT
export const SCORE_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 60,
  AVERAGE: 40,
  POOR: 0,
} as const;

// Catégories de scan et leurs poids dans le score global
export const SCANNER_WEIGHTS = {
  frontend: 0.20,
  backend: 0.20,
  database: 0.15,
  infrastructure: 0.25,
  ai_usage: 0.10,
  network: 0.10,
} as const;

// Niveaux de sévérité et pénalités de score
export const SEVERITY_PENALTIES = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
  info: 0,
} as const;
