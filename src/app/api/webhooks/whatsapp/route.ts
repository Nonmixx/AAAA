import { NextResponse } from 'next/server';
import { validateTwilioWebhookSignature } from '@/lib/disaster/providers/whatsapp';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

function normalizePhone(value: string) {
  return value.replace(/^whatsapp:/i, '').replace(/[^\d+]/g, '');
}

function toParamRecord(params: URLSearchParams) {
  const record: Record<string, string | string[]> = {};
  for (const [key, value] of params.entries()) {
    const existing = record[key];
    if (existing === undefined) {
      record[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      record[key] = [existing, value];
    }
  }
  return record;
}

function isTwilioRequest(req: Request, params: URLSearchParams) {
  return validateTwilioWebhookSignature({
    signature: req.headers.get('x-twilio-signature'),
    url: req.url,
    params: toParamRecord(params),
  });
}

export async function POST(req: Request) {
  const contentType = req.headers.get('content-type') ?? '';
  let params = new URLSearchParams();
  let metadata: Record<string, unknown> = {};

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const form = await req.formData();
    for (const [key, value] of form.entries()) {
      params.append(key, typeof value === 'string' ? value : value.name);
    }
    metadata = Object.fromEntries(params.entries());
  } else if (contentType.includes('application/json')) {
    const payload = (await req.json()) as Record<string, unknown>;
    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined || value === null) continue;
      params.append(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
    metadata = payload;
  } else {
    const raw = await req.text();
    params = new URLSearchParams(raw);
    metadata = Object.fromEntries(params.entries());
  }

  if (!isTwilioRequest(req, params)) {
    return NextResponse.json({ error: 'Invalid Twilio signature.' }, { status: 403 });
  }

  const from = params.get('From') ?? params.get('from') ?? 'unknown';
  const body = params.get('Body') ?? params.get('body') ?? '';
  const normalizedFrom = normalizePhone(from);

  const supabase = getSupabaseAdminClient();
  const { data: activePlatform } = await supabase
    .from('platform_status')
    .select('active_disaster_event_id')
    .eq('status_key', 'primary')
    .maybeSingle();

  const { data: shelterContact } = normalizedFrom
    ? await supabase
        .from('shelter_contacts')
        .select('id, organization_id, phone')
        .or(`phone.eq.${normalizedFrom},phone.eq.whatsapp:${normalizedFrom},phone.ilike.%${normalizedFrom.replace(/^\+/, '')}`)
        .order('is_primary', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  await supabase.from('communications').insert({
    disaster_event_id: activePlatform?.active_disaster_event_id ?? null,
    organization_id: shelterContact?.organization_id ?? null,
    channel: 'whatsapp',
    direction: 'inbound',
    sender_role: 'external',
    recipient: from,
    transcript: body,
    metadata: {
      ...metadata,
      normalizedFrom,
      shelterContactId: shelterContact?.id ?? null,
    },
    message_status: 'received',
  } as never);

  return NextResponse.json({
    ok: true,
    linkedOrganizationId: shelterContact?.organization_id ?? null,
    activeDisasterEventId: activePlatform?.active_disaster_event_id ?? null,
  });
}
