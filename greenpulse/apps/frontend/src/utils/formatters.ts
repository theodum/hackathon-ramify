// =============================================================
// GREENPULSE — Formatters
// =============================================================

/**
 * Format CO2 grams to a readable string.
 * Examples: 450g → "450 g" | 1200g → "1.2 kg"
 */
export function formatCo2(grams: number): string {
  if (grams < 1000) {
    return `${Math.round(grams)} g CO₂`;
  }
  const kg = grams / 1000;
  return `${kg % 1 === 0 ? kg.toFixed(0) : kg.toFixed(2)} kg CO₂`;
}

/**
 * Format energy in kWh.
 * Example: 3.42 → "3.42 kWh"
 */
export function formatEnergy(kwh: number): string {
  if (kwh < 0.01) {
    return `${(kwh * 1000).toFixed(0)} Wh`;
  }
  return `${kwh.toFixed(2)} kWh`;
}

/**
 * Format duration in milliseconds.
 * Example: 245000 → "4min 5s"
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) {
    return `${seconds}s`;
  }
  return `${minutes}min ${seconds}s`;
}

/**
 * Format an ISO date string using FR locale.
 * Example: "2025-05-19T10:30:00Z" → "19 mai 2025 à 10:30"
 */
export function formatDate(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * Format a date as relative time (e.g. "il y a 2 jours").
 */
export function formatRelativeDate(iso: string): string {
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'À l\'instant';
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `Il y a ${weeks} semaine${weeks > 1 ? 's' : ''}`;
    }
    return formatDate(iso);
  } catch {
    return iso;
  }
}

/**
 * Format file size in bytes to a human-readable string.
 * Example: 2500000 → "2.4 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

/**
 * Format a score as "72/100".
 */
export function formatScore(score: number): string {
  return `${Math.round(score)}/100`;
}

/**
 * Return letter grade from a 0-100 score.
 */
export function getScoreGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

/**
 * Format a monetary value in USD.
 * Example: 42.5 → "$42.50/mois"
 */
export function formatCost(usd: number): string {
  return `$${usd.toFixed(2)}/mois`;
}

/**
 * Format a percentage with optional sign.
 * Example: -12.5 → "-12.5%"
 */
export function formatPercent(value: number, showSign = false): string {
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}
