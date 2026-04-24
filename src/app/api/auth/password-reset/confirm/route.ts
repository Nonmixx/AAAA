import { NextResponse } from 'next/server';
import { confirmPasswordReset } from '@/lib/password-reset';

interface ConfirmBody {
  email?: string;
  code?: string;
  newPassword?: string;
}

function validCode(code: string): boolean {
  return /^\d{4}$/.test(code);
}

export async function POST(req: Request) {
  let body: ConfirmBody;
  try {
    body = (await req.json()) as ConfirmBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const email = body.email?.trim() ?? '';
  const code = body.code?.trim() ?? '';
  const newPassword = body.newPassword ?? '';

  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }
  if (!validCode(code)) {
    return NextResponse.json({ error: 'Verification code must be 4 digits.' }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'New password must be at least 6 characters.' }, { status: 400 });
  }

  try {
    await confirmPasswordReset(email, code, newPassword);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reset password.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
