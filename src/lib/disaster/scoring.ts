import { DISASTER_KEYWORDS, type IncidentSourceType, type SignalInput } from './types';

const SOURCE_WEIGHTS: Record<IncidentSourceType, number> = {
  nadma: 0.5,
  news: 0.32,
  social: 0.18,
  manual: 0.22,
  webhook: 0.28,
};

const SEVERITY_KEYWORDS = [
  'severe',
  'major',
  'urgent',
  'critical',
  'darurat',
  'ditutup',
  'rescue',
];

export function extractSignalKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  return DISASTER_KEYWORDS.filter((keyword) => lower.includes(keyword));
}

export function extractLocations(text: string): string[] {
  const matches = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g) ?? [];
  const blocked = new Set(['Flood', 'Nadma', 'Pps', 'Relief Center', 'Malaysia']);
  return [...new Set(matches.map((m) => m.trim()).filter((m) => !blocked.has(m)).slice(0, 6))];
}

export function summarizeSignal(text: string, sourceName: string, locations: string[]): string {
  const compact = text.replace(/\s+/g, ' ').trim().slice(0, 220);
  const where = locations.length ? ` near ${locations.join(', ')}` : '';
  return `${sourceName} reported a potential disaster${where}: ${compact}`;
}

export function scoreSignal(input: SignalInput): {
  confidenceScore: number;
  detectedKeywords: string[];
  detectedLocations: string[];
  severity: 'low' | 'medium' | 'high';
} {
  const normalizedText = input.normalizedText.trim();
  const detectedKeywords = input.detectedKeywords?.length
    ? [...new Set(input.detectedKeywords.map((x) => x.toLowerCase()))]
    : extractSignalKeywords(normalizedText);
  const detectedLocations = input.detectedLocations?.length
    ? [...new Set(input.detectedLocations)]
    : extractLocations(normalizedText);

  let score = SOURCE_WEIGHTS[input.sourceType] ?? 0.1;
  score += Math.min(0.26, detectedKeywords.length * 0.06);
  score += Math.min(0.16, detectedLocations.length * 0.04);

  const lower = normalizedText.toLowerCase();
  if (SEVERITY_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    score += 0.1;
  }
  if (/\b\d+\s+(famil(y|ies)|people|mangsa|victims|shelters?)\b/i.test(normalizedText)) {
    score += 0.08;
  }

  const confidenceScore = Math.max(0, Math.min(0.99, Number(score.toFixed(4))));
  const severity = confidenceScore >= 0.78 ? 'high' : confidenceScore >= 0.58 ? 'medium' : 'low';

  return {
    confidenceScore,
    detectedKeywords,
    detectedLocations,
    severity,
  };
}

export function eventTitleForSignal(locations: string[], detectedKeywords: string[]): string {
  const location = locations[0] ?? 'Unknown Region';
  const type =
    detectedKeywords.find((keyword) => ['banjir', 'flood', 'landslide'].includes(keyword)) ?? 'disaster';

  return `${type.toUpperCase()} incident - ${location}`;
}
