import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { getSupabaseAdminClient } from './supabase/admin';

const RESET_CODE_MINUTES = 2;
const MAX_CODE_ATTEMPTS = 5;

type ResetState = {
  code_hash: string;
  expires_at: string;
  consumed_at: string | null;
  attempt_count: number;
};

function getCodeSecret(): string {
  return process.env.PASSWORD_RESET_CODE_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'fallback-reset-secret';
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashCode(email: string, code: string): string {
  const payload = `${normalizeEmail(email)}:${code}:${getCodeSecret()}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export function createPasswordResetCode(): string {
  return `${Math.floor(1000 + Math.random() * 9000)}`;
}

async function findUserByEmail(email: string) {
  const supabaseAdmin = getSupabaseAdminClient();
  const normalizedEmail = normalizeEmail(email);

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      throw new Error(error.message);
    }
    const found = data.users.find((u) => (u.email ?? '').toLowerCase() === normalizedEmail);
    if (found) {
      return found;
    }
    if (!data.users.length) break;
  }

  return null;
}

async function sendPasswordResetEmail(email: string, code: string) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !user || !pass || !from) {
    throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to: normalizeEmail(email),
    subject: 'Your 4-digit password reset code',
    text: `Your verification code is ${code}. It expires in ${RESET_CODE_MINUTES} minutes.`,
    html: `<p>Your verification code is <strong>${code}</strong>.</p><p>This code expires in ${RESET_CODE_MINUTES} minutes.</p>`,
  });
}

export async function issuePasswordResetCode(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const code = createPasswordResetCode();
  const codeHash = hashCode(normalizedEmail, code);
  const expiresAt = new Date(Date.now() + RESET_CODE_MINUTES * 60 * 1000).toISOString();
  const supabaseAdmin = getSupabaseAdminClient();
  const user = await findUserByEmail(normalizedEmail);
  if (!user?.id) {
    throw new Error('No account exists for this email.');
  }

  const nextMetadata = {
    ...(user.user_metadata ?? {}),
    password_reset: {
      code_hash: codeHash,
      expires_at: expiresAt,
      consumed_at: null,
      attempt_count: 0,
    } satisfies ResetState,
  };

  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: nextMetadata,
  });
  if (error) throw new Error(error.message);

  await sendPasswordResetEmail(normalizedEmail, code);
  return { expiresAt };
}

export async function confirmPasswordReset(email: string, code: string, newPassword: string) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedCode = code.trim();
  const supabaseAdmin = getSupabaseAdminClient();
  const user = await findUserByEmail(normalizedEmail);
  if (!user?.id) {
    throw new Error('No account exists for this email.');
  }

  const resetState = (user.user_metadata?.password_reset ?? null) as ResetState | null;
  if (!resetState || resetState.consumed_at) {
    throw new Error('Invalid verification code.');
  }

  const expiresAtMs = new Date(resetState.expires_at).getTime();
  if (!Number.isFinite(expiresAtMs) || expiresAtMs < Date.now()) {
    throw new Error('Verification code has expired. Request a new code.');
  }

  const expectedHash = hashCode(normalizedEmail, normalizedCode);
  if (expectedHash !== resetState.code_hash) {
    const attemptCount = (resetState.attempt_count ?? 0) + 1;
    const nextMetadata = {
      ...(user.user_metadata ?? {}),
      password_reset: {
        ...resetState,
        attempt_count: attemptCount,
      } satisfies ResetState,
    };
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: nextMetadata,
    });
    if (error) throw new Error(error.message);
    if (attemptCount >= MAX_CODE_ATTEMPTS) {
      throw new Error('Too many invalid attempts. Request a new verification code.');
    }
    throw new Error('Invalid verification code.');
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });
  if (updateError) {
    throw new Error(updateError.message);
  }

  const consumedMetadata = {
    ...(user.user_metadata ?? {}),
    password_reset: {
      ...resetState,
      consumed_at: new Date().toISOString(),
    } satisfies ResetState,
  };
  const { error: consumeError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: consumedMetadata,
  });
  if (consumeError) {
    throw new Error(consumeError.message);
  }
}
