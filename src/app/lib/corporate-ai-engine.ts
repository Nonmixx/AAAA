export type ExecutionMode = 'fully_autonomous' | 'approval_required';

export interface CorporateMemory {
  targetSdgs: string[];
  logisticsWalletBalance: number;
  executionMode: ExecutionMode;
}

export interface ParsedCorporateQuery {
  intent: 'inventory_impact' | 'esg_metric' | 'ngo_delivery' | 'general';
  metrics: string[];
  period: string;
  department: string;
  destination: string;
  sqlLikeQuery: string;
}

export interface WorkflowStep {
  id:
    | 'need_detected'
    | 'inventory_matched'
    | 'wallet_deducted'
    | 'logistics_api_pinged'
    | 'receiver_portal_updated'
    | 'delivery_failed'
    | 'glm_rerouting'
    | 'recovery_successful';
  label: string;
  status: 'pending' | 'in_progress' | 'done' | 'error';
  detail?: string;
}

export interface WorkflowResult {
  steps: WorkflowStep[];
  finalWalletBalance: number;
  recoveredFromFailure: boolean;
}

const MEMORY_KEY = 'corporate_ai_memory_v1';

const DEFAULT_MEMORY: CorporateMemory = {
  targetSdgs: ['sdg4', 'sdg12'],
  logisticsWalletBalance: 5000,
  executionMode: 'approval_required',
};

export function getCorporateMemory(): CorporateMemory {
  if (typeof window === 'undefined') return DEFAULT_MEMORY;
  try {
    const raw = window.localStorage.getItem(MEMORY_KEY);
    if (!raw) return DEFAULT_MEMORY;
    const parsed = JSON.parse(raw) as Partial<CorporateMemory>;
    const sdgs = Array.isArray(parsed.targetSdgs) ? parsed.targetSdgs.filter((x) => typeof x === 'string') : DEFAULT_MEMORY.targetSdgs;
    const wallet =
      typeof parsed.logisticsWalletBalance === 'number' && Number.isFinite(parsed.logisticsWalletBalance)
        ? parsed.logisticsWalletBalance
        : DEFAULT_MEMORY.logisticsWalletBalance;
    const mode = parsed.executionMode === 'fully_autonomous' ? 'fully_autonomous' : 'approval_required';
    return { targetSdgs: sdgs.length ? sdgs : DEFAULT_MEMORY.targetSdgs, logisticsWalletBalance: wallet, executionMode: mode };
  } catch {
    return DEFAULT_MEMORY;
  }
}

export function saveCorporateMemory(next: Partial<CorporateMemory>): CorporateMemory {
  const current = getCorporateMemory();
  const merged: CorporateMemory = {
    targetSdgs: next.targetSdgs ?? current.targetSdgs,
    logisticsWalletBalance: next.logisticsWalletBalance ?? current.logisticsWalletBalance,
    executionMode: next.executionMode ?? current.executionMode,
  };
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(MEMORY_KEY, JSON.stringify(merged));
  }
  return merged;
}

export function parseCorporateQuestion(question: string): ParsedCorporateQuery {
  const q = question.toLowerCase();
  const metrics: string[] = [];
  if (/\blaptop|electronics|device|computer\b/.test(q)) metrics.push('electronics_donated');
  if (/\bco2|carbon|emission\b/.test(q)) metrics.push('co2_saved');
  if (/\bindividual|people|beneficiar/.test(q)) metrics.push('beneficiaries_supported');
  if (/\bverified|handoff|delivery\b/.test(q)) metrics.push('verified_handoffs');
  if (!metrics.length) metrics.push('esg_summary');

  const period = /\bq1\b/.test(q)
    ? 'Q1 2026'
    : /\bq2\b/.test(q)
      ? 'Q2 2026'
      : /\bthis month\b/.test(q)
        ? 'Current month'
        : 'Last 90 days';

  const department = /\bit department|it\b/.test(q)
    ? 'IT'
    : /\bhr\b/.test(q)
      ? 'HR'
      : /\boperation/.test(q)
        ? 'Operations'
        : 'All Departments';

  const destination = /\bschool|library|education\b/.test(q)
    ? 'education_partners'
    : /\bngo|orphanage|shelter\b/.test(q)
      ? 'ngo_partners'
      : 'all_destinations';

  const intent: ParsedCorporateQuery['intent'] = /\bincoming|delivery|handoff/.test(q)
    ? 'ngo_delivery'
    : /\bco2|emission|esg|metric/.test(q)
      ? 'esg_metric'
      : /\blaptop|electronics|inventory|warehouse/.test(q)
        ? 'inventory_impact'
        : 'general';

  const sqlLikeQuery = `SELECT ${metrics.join(', ')} FROM corporate_impact WHERE period='${period}' AND department='${department}' AND destination='${destination}';`;
  return { intent, metrics, period, department, destination, sqlLikeQuery };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function executeCampaignWorkflow(opts: {
  deliveryFee: number;
  forceFailure?: boolean;
  onStep?: (steps: WorkflowStep[]) => void;
}): Promise<WorkflowResult> {
  const memory = getCorporateMemory();
  let balance = memory.logisticsWalletBalance;
  const steps: WorkflowStep[] = [
    { id: 'need_detected', label: 'Need Detected', status: 'pending' },
    { id: 'inventory_matched', label: 'Inventory Matched', status: 'pending' },
    { id: 'wallet_deducted', label: 'Wallet Deducted', status: 'pending' },
    { id: 'logistics_api_pinged', label: 'Logistics API Processing', status: 'pending' },
    { id: 'receiver_portal_updated', label: 'Receiver Portal Updated', status: 'pending' },
  ];

  const update = () => opts.onStep?.([...steps]);
  const setStatus = (id: WorkflowStep['id'], status: WorkflowStep['status'], detail?: string) => {
    const step = steps.find((s) => s.id === id);
    if (!step) return;
    step.status = status;
    if (detail) step.detail = detail;
    update();
  };

  setStatus('need_detected', 'in_progress');
  await sleep(350);
  setStatus('need_detected', 'done', 'Urgent Shah Alam need ingested from partner queue.');

  setStatus('inventory_matched', 'in_progress');
  await sleep(350);
  setStatus('inventory_matched', 'done', 'Matched 500kg winter clothing from warehouse inventory.');

  setStatus('wallet_deducted', 'in_progress');
  await sleep(320);
  balance = Math.max(0, balance - opts.deliveryFee);
  setStatus('wallet_deducted', 'done', `RM ${opts.deliveryFee} reserved from Logistics Wallet.`);

  setStatus('logistics_api_pinged', 'in_progress');
  await sleep(420);

  const shouldFail = Boolean(opts.forceFailure);
  if (shouldFail) {
    steps.push({ id: 'delivery_failed', label: 'Delivery Failed (Driver Canceled)', status: 'error', detail: 'Primary dispatch API returned no available driver.' });
    steps.push({ id: 'glm_rerouting', label: 'GLM Re-Routing', status: 'in_progress', detail: 'Booking secondary provider and bundling route for next-day dispatch...' });
    update();
    await sleep(650);
    const reroute = steps.find((s) => s.id === 'glm_rerouting');
    if (reroute) reroute.status = 'done';
    steps.push({ id: 'recovery_successful', label: 'Recovery Successful', status: 'done', detail: 'Secondary booking confirmed and NGOs auto-notified.' });
    setStatus('logistics_api_pinged', 'done', 'Primary dispatch failed, fallback route succeeded.');
  } else {
    setStatus('logistics_api_pinged', 'done', '3rd-party logistics API accepted dispatch job.');
  }

  setStatus('receiver_portal_updated', 'in_progress');
  await sleep(300);
  setStatus('receiver_portal_updated', 'done', 'Receiver portal status moved: Pending -> Incoming.');

  const nextMemory = saveCorporateMemory({ logisticsWalletBalance: balance });
  return {
    steps,
    finalWalletBalance: nextMemory.logisticsWalletBalance,
    recoveredFromFailure: shouldFail,
  };
}
