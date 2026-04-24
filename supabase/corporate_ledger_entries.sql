-- Corporate donation & sponsorship ledger (per corporate_partners row).
-- Requires existing table: public.corporate_partners (id uuid, owner_profile_id uuid = auth.users.id).
-- Run in Supabase SQL Editor after corporate_partners exists.

CREATE TABLE IF NOT EXISTS public.corporate_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_partner_id uuid NOT NULL REFERENCES public.corporate_partners (id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  activity_type text NOT NULL,
  amount_or_qty text NOT NULL,
  esg_focus text NOT NULL DEFAULT 'SDG 12',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'delivered')),
  notes text,
  bulk_details jsonb
);

CREATE INDEX IF NOT EXISTS corporate_ledger_entries_partner_occurred_idx
  ON public.corporate_ledger_entries (corporate_partner_id, occurred_at DESC);

ALTER TABLE public.corporate_ledger_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS corporate_ledger_entries_select_own ON public.corporate_ledger_entries;
CREATE POLICY corporate_ledger_entries_select_own
  ON public.corporate_ledger_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.corporate_partners cp
      WHERE cp.id = corporate_ledger_entries.corporate_partner_id
        AND cp.owner_profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS corporate_ledger_entries_insert_own ON public.corporate_ledger_entries;
CREATE POLICY corporate_ledger_entries_insert_own
  ON public.corporate_ledger_entries
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.corporate_partners cp
      WHERE cp.id = corporate_ledger_entries.corporate_partner_id
        AND cp.owner_profile_id = auth.uid()
    )
  );

GRANT SELECT, INSERT ON public.corporate_ledger_entries TO authenticated;
