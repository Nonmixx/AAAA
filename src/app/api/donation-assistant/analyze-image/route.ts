/**
 * Vision screening for in-kind donation photos (Z.AI GLM vision, OpenAI-compatible).
 *
 * Env: ZAI_API_KEY or BIGMODEL_API_KEY, ZAI_API_BASE, GLM_VISION_MODEL (default glm-4v-plus).
 */
import { NextResponse } from 'next/server';
import type { DonationImageAnalysisResult, PhotoVerificationStatus } from '../../../lib/donation-image-analysis';
import { normalizeCondition } from '../../../lib/donation-image-analysis';
import { buildWorkflowOrchestrationPromptSection } from '../../../lib/donation-assistant-workflow';
import {
  getAnthropicVisionModel,
  getGlmVisionModel,
  getZaiApiKey,
  getZaiCandidateBases,
  isAnthropicCompatibleBase,
} from '../../../lib/zai-env';

const MAX_BYTES = 4 * 1024 * 1024; // raw image file budget (approx before base64)

interface AnalyzeBody {
  imageBase64: string;
  mimeType?: string;
  detectedItem: string;
  /** Recent chat text for extra context */
  transcript?: string;
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1].trim() : trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) throw new Error('No JSON object in model output');
  return JSON.parse(candidate.slice(start, end + 1)) as unknown;
}

function fallbackAnalysis(reason: string): DonationImageAnalysisResult {
  return {
    verification: 'not_a_donation_photo',
    condition: 'Good',
    visibleSummary: 'Image could not be analyzed automatically.',
    guidance: reason,
    source: 'fallback',
  };
}

function parseVisionJson(raw: unknown): DonationImageAnalysisResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const itemRelevant = o.itemRelevant === true;
  const matchesCategory = o.matchesDeclaredCategory === true;
  const condition = normalizeCondition(typeof o.condition === 'string' ? o.condition : 'Good');
  const visibleSummary = typeof o.visibleSummary === 'string' ? o.visibleSummary.trim() : '';
  const detectedCategory =
    typeof o.detectedCategory === 'string' && o.detectedCategory.trim()
      ? o.detectedCategory.trim().slice(0, 80)
      : '';
  const keyDetails = Array.isArray(o.keyDetails)
    ? o.keyDetails
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .map((x) => x.trim().slice(0, 120))
        .slice(0, 4)
    : [];
  const rejectReason = typeof o.rejectReason === 'string' ? o.rejectReason.trim() : '';

  let verification: PhotoVerificationStatus = 'passed';
  if (!itemRelevant) verification = 'not_a_donation_photo';
  else if (!matchesCategory) verification = 'wrong_item_for_category';

  let guidance =
    typeof o.guidance === 'string' && o.guidance.trim()
      ? o.guidance.trim()
      : rejectReason ||
        (verification === 'not_a_donation_photo'
          ? 'Please send a clear photo of the physical item you want to donate (not a screenshot, document, or unrelated scene).'
          : verification === 'wrong_item_for_category'
            ? 'The photo does not match what you described. Send a new photo that clearly shows that item.'
            : '');

  if (verification === 'passed' && condition === 'Damaged' && !guidance) {
    guidance =
      'This item appears damaged or unusable for donation. Please donate something in at least fair, safe condition.';
  }

  return {
    verification,
    condition,
    detectedCategory: detectedCategory || undefined,
    keyDetails: keyDetails.length ? keyDetails : undefined,
    visibleSummary: visibleSummary || 'Donation item photo.',
    guidance,
    source: 'glm-vision',
  };
}

export async function POST(req: Request) {
  let body: AnalyzeBody;
  try {
    body = (await req.json()) as AnalyzeBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const detectedItem = typeof body.detectedItem === 'string' ? body.detectedItem.trim() : '';
  const mime = typeof body.mimeType === 'string' && body.mimeType.startsWith('image/') ? body.mimeType : 'image/jpeg';
  const b64 =
    typeof body.imageBase64 === 'string' ? body.imageBase64.replace(/^data:image\/\w+;base64,/, '').trim() : '';

  if (!detectedItem || !b64) {
    return NextResponse.json({ error: 'imageBase64 and detectedItem required' }, { status: 400 });
  }

  const approxBytes = Math.floor((b64.length * 3) / 4);
  if (approxBytes > MAX_BYTES) {
    return NextResponse.json(
      {
        analysis: fallbackAnalysis('Image is too large. Please send a smaller photo (under ~4 MB) or a clearer crop.'),
      },
      { status: 200 },
    );
  }

  const apiKey = getZaiApiKey();
  if (!apiKey) {
    return NextResponse.json({
      analysis: fallbackAnalysis(
        'Image analysis needs **ZAI_API_KEY** and a **vision** model. Set `GLM_VISION_MODEL` (e.g. `glm-4v-plus`) in your environment, then try again.',
      ),
    });
  }

  const model = getGlmVisionModel();
  const anthropicVisionModel = getAnthropicVisionModel();
  const baseCandidates = getZaiCandidateBases();

  const transcript =
    typeof body.transcript === 'string' && body.transcript.trim()
      ? body.transcript.trim().slice(-3500)
      : '(no transcript)';

  const system = `${buildWorkflowOrchestrationPromptSection('vision')}

You are DonateAI's **donation item photo validator**. You must look at the image carefully.

The donor previously described their donation category (may be broad) as:
**DECLARED_CATEGORY:** ${detectedItem}

Recent chat context (may be partial):
${transcript}

Your tasks:
1) **itemRelevant** — Is this a usable photo of **physical goods** appropriate for charity donation screening?  
   Set **false** for: random scenery, memes, selfies/portraits with no goods, pets only, blank walls, screenshots, UI/computer-only shots, documents/IDs/receipts-only, cash/banknotes close-up as the main subject, pure food-plate close-ups when DECLARED is clearly non-food (e.g. clothing only), watermarks only, unreadable blur, empty room with no item.
   Set **true** only if one or more **donatable objects** are clearly visible (clothes, books, food packs, blankets, hygiene kits, toys, furniture, electronics as goods, etc.).

2) **matchesDeclaredCategory** — Does the main visible object **reasonably fit** DECLARED_CATEGORY?  
   - If DECLARED is broad (e.g. "Clothing / Mixed Items", "mixed"), accept common household donations.  
   - If DECLARED is specific (e.g. "Food Packs", "Medical Supplies", "School Supplies") but the image clearly shows something else as the main donation (e.g. only clothes when they said food packs), set **false**.  
   - If unsure but plausible, set **true**.

3) **condition** — For the main donatable object: **Good** (clean/fair), **Worn** (usable but clearly used), **Damaged** (holes, heavy stains, broken/sharp unsafe, mold, unusable).

Output **only** valid JSON (no markdown) with keys:
itemRelevant (boolean)
matchesDeclaredCategory (boolean)
condition ("Good"|"Worn"|"Damaged")
detectedCategory (string, short, e.g. "Clothing", "Food packs", "Books")
keyDetails (array of up to 4 short strings, visible facts only)
visibleSummary (one short sentence, what you see)
rejectReason (string, empty if itemRelevant and matchesDeclaredCategory)
guidance (one short sentence for the donor: either what is wrong with the photo or the next step)`;

  const dataUrl = `data:${mime};base64,${b64}`;

  const userContent: unknown[] = [
    { type: 'image_url', image_url: { url: dataUrl } },
    {
      type: 'text',
      text: 'Analyze this image for donation screening. Reply with JSON only as specified.',
    },
  ];

  try {
    let res: Response | null = null;
    for (const base of baseCandidates) {
      const anthropic = isAnthropicCompatibleBase(base);
      const url = anthropic ? `${base}/v1/messages` : `${base}/chat/completions`;
      const headerCandidates: Record<string, string>[] = anthropic
        ? [
            {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json',
            },
            {
              Authorization: `Bearer ${apiKey}`,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json',
            },
          ]
        : [
            { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            { 'api-key': apiKey, 'Content-Type': 'application/json' },
          ];
      for (const headers of headerCandidates) {
        const payload = anthropic
          ? {
              model: anthropicVisionModel,
              max_tokens: 500,
              temperature: 0.15,
              system,
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'image',
                      source: {
                        type: 'base64',
                        media_type: mime,
                        data: b64,
                      },
                    },
                    {
                      type: 'text',
                      text: 'Analyze this image for donation screening. Reply with JSON only as specified.',
                    },
                  ],
                },
              ],
            }
          : {
              model,
              temperature: 0.15,
              max_tokens: 500,
              messages: [
                { role: 'system', content: system },
                { role: 'user', content: userContent as Record<string, unknown>[] },
              ],
            };
        const candidate = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        if (candidate.ok) {
          res = candidate;
          break;
        }
        if (candidate.status !== 401 && candidate.status !== 404) {
          res = candidate;
          break;
        }
      }
      if (res) break;
    }
    if (!res) {
      return NextResponse.json({
        analysis: fallbackAnalysis(
          'Unable to reach GLM vision endpoint with current key/base. Please verify ZAI_API_KEY and ZAI_API_BASE, then retry.',
        ),
      });
    }

    if (!res.ok) {
      const t = await res.text().catch(() => '');
      console.error('GLM vision error', res.status, t);
      return NextResponse.json({
        analysis: fallbackAnalysis(
          'We could not analyze this image right now. Please try again with a well-lit, single clear photo of your donation item.',
        ),
      });
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      content?: { type?: string; text?: string }[];
    };
    const content =
      data.choices?.[0]?.message?.content?.trim() ||
      data.content?.find((c) => c.type === 'text')?.text?.trim();
    if (!content) {
      return NextResponse.json({
        analysis: fallbackAnalysis('No response from vision model. Please try uploading the photo again.'),
      });
    }

    let parsed: unknown;
    try {
      parsed = extractJsonObject(content);
    } catch {
      return NextResponse.json({
        analysis: fallbackAnalysis('Could not read the model response. Please send the photo again.'),
      });
    }

    const analysis = parseVisionJson(parsed);
    if (!analysis) {
      return NextResponse.json({
        analysis: fallbackAnalysis('Invalid analysis result. Please upload a clearer photo of your donation item.'),
      });
    }

    return NextResponse.json({ analysis, model, source: 'glm-vision' });
  } catch (e) {
    console.error('donation-assistant/analyze-image', e);
    return NextResponse.json({
      analysis: fallbackAnalysis('Something went wrong while analyzing the image. Please try again.'),
    });
  }
}
