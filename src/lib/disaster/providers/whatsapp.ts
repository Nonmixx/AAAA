import { createHmac, timingSafeEqual } from 'crypto';
import { disasterConfig, requireConfig } from '../config';

export type OutboundWhatsAppMessage = {
  to: string;
  body: string;
};

export async function sendWhatsAppMessage(input: OutboundWhatsAppMessage) {
  if (disasterConfig.whatsapp.provider !== 'twilio') {
    throw new Error(`Unsupported WhatsApp provider "${disasterConfig.whatsapp.provider}". Replace provider logic in src/lib/disaster/providers/whatsapp.ts.`);
  }

  const accountSid = requireConfig(
    disasterConfig.whatsapp.twilioAccountSid,
    'Set TWILIO_ACCOUNT_SID to enable WhatsApp sending.',
  );
  const authToken = requireConfig(
    disasterConfig.whatsapp.twilioAuthToken,
    'Set TWILIO_AUTH_TOKEN to enable WhatsApp sending.',
  );
  const from = requireConfig(
    disasterConfig.whatsapp.twilioWhatsAppFrom,
    'Set TWILIO_WHATSAPP_FROM to enable WhatsApp sending.',
  );

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const body = new URLSearchParams({
    From: from,
    To: input.to.startsWith('whatsapp:') ? input.to : `whatsapp:${input.to}`,
    Body: input.body,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Twilio WhatsApp request failed: ${response.status} ${text}`);
  }

  return response.json();
}

function buildExpectedTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string | string[]>,
) {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      const value = params[key];
      if (Array.isArray(value)) {
        return `${acc}${key}${[...value].sort().join('')}`;
      }
      return `${acc}${key}${value}`;
    }, url);

  return createHmac('sha1', authToken).update(Buffer.from(data, 'utf-8')).digest('base64');
}

export function validateTwilioWebhookSignature(input: {
  signature: string | null;
  url: string;
  params: Record<string, string | string[]>;
}) {
  const authToken = requireConfig(
    disasterConfig.whatsapp.twilioAuthToken,
    'Set TWILIO_AUTH_TOKEN to validate incoming Twilio webhook requests.',
  );

  if (!input.signature) return false;

  const expected = buildExpectedTwilioSignature(authToken, input.url, input.params);
  const expectedBuffer = Buffer.from(expected, 'utf-8');
  const providedBuffer = Buffer.from(input.signature, 'utf-8');

  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}
