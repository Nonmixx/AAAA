import { NextResponse } from 'next/server';
import { issuePasswordResetCode } from '@/lib/password-reset';

interface RequestBody {
  email?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const email = body.email?.trim() ?? '';
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
  }

  try {
    const { expiresAt } = await issuePasswordResetCode(email);
    return NextResponse.json({ success: true, expiresAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send verification code.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
