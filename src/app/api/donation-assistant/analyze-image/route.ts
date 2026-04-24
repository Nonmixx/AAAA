/**
 * Local fallback-only screening for donor-submitted item photos.
 *
 * This endpoint no longer calls a vision model. It performs lightweight validation
 * of the upload payload and asks the donor for a clearer replacement photo so the
 * rest of the donation assistant can continue without a vision dependency.
 */
import { NextResponse } from 'next/server';
import type { DonationImageAnalysisResult } from '../../../lib/donation-image-analysis';

const MAX_BYTES = 4 * 1024 * 1024;

interface AnalyzeBody {
  imageBase64: string;
  mimeType?: string;
  detectedItem: string;
}

function fallbackAnalysis(reason: string): DonationImageAnalysisResult {
  return {
    verification: 'not_a_donation_photo',
    condition: 'Good',
    visibleSummary: 'Photo screening is currently running in fallback mode.',
    guidance: reason,
    source: 'fallback',
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
  const mime = typeof body.mimeType === 'string' && body.mimeType.startsWith('image/') ? body.mimeType : '';
  const b64 =
    typeof body.imageBase64 === 'string' ? body.imageBase64.replace(/^data:image\/\w+;base64,/, '').trim() : '';

  if (!detectedItem || !b64) {
    return NextResponse.json({ error: 'imageBase64 and detectedItem required' }, { status: 400 });
  }

  if (!mime) {
    return NextResponse.json({
      analysis: fallbackAnalysis('Only JPEG or PNG donation photos are supported. Please upload a standard image file.'),
    });
  }

  const approxBytes = Math.floor((b64.length * 3) / 4);
  if (approxBytes > MAX_BYTES) {
    return NextResponse.json({
      analysis: fallbackAnalysis('Image is too large. Please send a smaller photo under about 4 MB or a clearer crop.'),
    });
  }

  return NextResponse.json({
    analysis: fallbackAnalysis(
      `Automatic photo recognition is disabled right now. Please continue by describing the condition of your ${detectedItem} in chat, or send a clearer single-item photo for manual review.`,
    ),
    source: 'fallback',
  });
}
