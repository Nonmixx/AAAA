type ExtractedNeedSuggestion = {
  title: string;
  category: string;
  quantityRequested: number;
  urgency: 'low' | 'medium' | 'high';
  beneficiaryCount: number | null;
  rationale: string[];
  confidence: number;
};

const CATEGORY_PATTERNS: Array<{
  category: string;
  keywords: RegExp;
  title: string;
}> = [
  { category: 'food', keywords: /\b(food|rice|meal|ration|bread|water|drink|milk)\b/i, title: 'Emergency food and water supplies' },
  { category: 'medical', keywords: /\b(medical|medicine|mask|clinic|first aid|bandage|sanitary|hygiene|soap)\b/i, title: 'Medical and hygiene supplies' },
  { category: 'bedding', keywords: /\b(blanket|bedding|mattress|sleep|pillow)\b/i, title: 'Blankets and bedding support' },
  { category: 'clothing', keywords: /\b(cloth|clothes|shirt|pants|jacket|shoe|wear)\b/i, title: 'Clothing and wearable essentials' },
  { category: 'education', keywords: /\b(book|school|education|stationery|kit)\b/i, title: 'Education and stationery kits' },
  { category: 'baby', keywords: /\b(diaper|baby|formula|infant)\b/i, title: 'Baby and infant essentials' },
];

function parseFirstInteger(text: string): number | null {
  const match = text.match(/\b(\d{1,4})\b/);
  if (!match?.[1]) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBeneficiaryCount(text: string): number | null {
  const explicit = text.match(/\b(?:beneficiar(?:y|ies)|people|famil(?:y|ies)|evacuees|persons|victims)\D{0,12}(\d{1,4})\b/i);
  if (explicit?.[1]) return Number(explicit[1]);

  const reverse = text.match(/\b(\d{1,4})\D{0,12}(?:people|famil(?:y|ies)|evacuees|persons|victims)\b/i);
  if (reverse?.[1]) return Number(reverse[1]);

  return null;
}

function inferUrgency(text: string): 'low' | 'medium' | 'high' {
  if (/\b(urgent|immediate|critical|asap|tonight|now|running low|out of)\b/i.test(text)) {
    return 'high';
  }
  if (/\b(soon|need|requested|shortage|limited)\b/i.test(text)) {
    return 'medium';
  }
  return 'low';
}

function inferCategory(text: string) {
  return CATEGORY_PATTERNS.find((pattern) => pattern.keywords.test(text)) ?? CATEGORY_PATTERNS[0];
}

function buildTitle(baseTitle: string, text: string) {
  const shelterMatch = text.match(/\b(?:pps|shelter|relief centre|hall)\b.{0,40}/i);
  if (shelterMatch?.[0]) {
    return `${baseTitle} for ${shelterMatch[0].trim()}`;
  }
  return baseTitle;
}

export function extractNeedSuggestionFromTranscript(transcript: string): ExtractedNeedSuggestion {
  const normalized = transcript.trim();
  const category = inferCategory(normalized);
  const beneficiaryCount = parseBeneficiaryCount(normalized);
  const parsedQuantity = parseFirstInteger(normalized);
  const quantityRequested = Math.max(1, parsedQuantity ?? beneficiaryCount ?? 25);
  const urgency = inferUrgency(normalized);

  const rationale = [
    `Detected category keywords for ${category.category}.`,
    parsedQuantity ? `Found quantity signal of ${parsedQuantity}.` : 'No explicit quantity found, using conservative fallback.',
    beneficiaryCount ? `Detected beneficiary count of ${beneficiaryCount}.` : 'No beneficiary count found in the reply.',
  ];

  let confidence = 0.55;
  if (parsedQuantity) confidence += 0.15;
  if (beneficiaryCount) confidence += 0.1;
  if (urgency === 'high') confidence += 0.1;
  if (category.category !== 'food') confidence += 0.05;

  return {
    title: buildTitle(category.title, normalized),
    category: category.category,
    quantityRequested,
    urgency,
    beneficiaryCount,
    rationale,
    confidence: Number(Math.min(0.95, confidence).toFixed(2)),
  };
}

export type { ExtractedNeedSuggestion };
