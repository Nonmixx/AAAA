/**
 * Goal-first monetary orchestration: interpret donor goals, pack RM into
 * demo "impact cases", attach catalog NGOs — structured output for chat UI + GLM.
 */
import { getNgoById } from './ngos-demand-catalog';

export type DonorGoalSignal =
  | 'maximize_reach'
  | 'urgent_relief'
  | 'education'
  | 'maximize_impact_depth'
  | 'unspecified';

export interface ImpactCaseTemplate {
  id: string;
  label: string;
  rmPerCase: number;
  peoplePerCase: number;
  /** Primary routing partner in this demo. */
  primaryNgoId: string;
  categoryTag: 'food' | 'health' | 'education' | 'shelter';
}

/** Demo impact units — RM + people are illustrative for product storytelling. */
export const IMPACT_CASE_TEMPLATES: ImpactCaseTemplate[] = [
  {
    id: 'food_case_std',
    label: 'Food security case (dry pack + meal credits)',
    rmPerCase: 25,
    peoplePerCase: 3,
    primaryNgoId: 'ngo_green_pantry',
    categoryTag: 'food',
  },
  {
    id: 'hygiene_case',
    label: 'Hygiene & basics bundle',
    rmPerCase: 20,
    peoplePerCase: 2,
    primaryNgoId: 'ngo_river_clinic',
    categoryTag: 'health',
  },
  {
    id: 'edu_kit',
    label: 'School supplies mini-kit',
    rmPerCase: 30,
    peoplePerCase: 2,
    primaryNgoId: 'ngo_pages_library',
    categoryTag: 'education',
  },
  {
    id: 'baby_nutrition',
    label: 'Baby nutrition top-up',
    rmPerCase: 35,
    peoplePerCase: 2,
    primaryNgoId: 'ngo_green_pantry',
    categoryTag: 'food',
  },
  {
    id: 'shelter_night_pack',
    label: 'Night shelter essentials pack',
    rmPerCase: 40,
    peoplePerCase: 2,
    primaryNgoId: 'ngo_urban_shelter',
    categoryTag: 'shelter',
  },
];

export interface GoalOrchestrationLine {
  caseTemplateId: string;
  label: string;
  count: number;
  rmEach: number;
  rmSubtotal: number;
  peopleHelped: number;
  routedToNgoId: string;
  routedToName: string;
}

export interface GoalOrchestrationPayload {
  goalSignal: DonorGoalSignal;
  goalLabel: string;
  budgetRm: number;
  strategySummary: string;
  totalPeopleHelped: number;
  remainderRm: number;
  lines: GoalOrchestrationLine[];
}

export function extractRmAmountFromText(text: string): number | null {
  const m = text.match(/(?:rm|myr)\s*([\d,.]+)|([\d,.]+)\s*(?:rm|myr)/i);
  const raw = (m?.[1] || m?.[2] || '').replace(/,/g, '');
  if (!raw) return null;
  const n = parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

export function inferDonorGoalSignal(blob: string): DonorGoalSignal {
  const t = blob.toLowerCase();
  if (
    /\b(as many|many people|most people|maximi[sz]e.*reach|maximi[sz]e.*people|more people|widest reach|headcount|reach more|help more people)\b/.test(
      t,
    )
  ) {
    return 'maximize_reach';
  }
  if (/\b(education|school|student|learn|textbook|read|stem|library)\b/.test(t)) {
    return 'education';
  }
  if (/\b(urgent|emergency|asap|immediate relief|critical|disaster|flood)\b/.test(t)) {
    return 'urgent_relief';
  }
  if (/\b(deep impact|transform|meaningful|fewer.*deeper|sustained impact|concentrat|focus on one)\b/.test(t)) {
    return 'maximize_impact_depth';
  }
  return 'unspecified';
}

function goalHumanLabel(signal: DonorGoalSignal): string {
  switch (signal) {
    case 'maximize_reach':
      return 'Maximize how many people are helped (spread budget across efficient cases)';
    case 'urgent_relief':
      return 'Prioritize urgent relief-style cases (food, shelter, medical-adjacent)';
    case 'education':
      return 'Support education & learning outcomes';
    case 'maximize_impact_depth':
      return 'Favor deeper per-person support (fewer, richer cases)';
    default:
      return 'Balanced demo mix (reach + resilience)';
  }
}

function reachEfficiency(t: ImpactCaseTemplate): number {
  return t.peoplePerCase / Math.max(t.rmPerCase, 1);
}

function rankTemplates(goal: DonorGoalSignal, preferredNgoIds: string[]): ImpactCaseTemplate[] {
  const templates = [...IMPACT_CASE_TEMPLATES];
  const ngoRank = (id: string) => {
    const i = preferredNgoIds.indexOf(id);
    return i === -1 ? 99 : i;
  };

  const sortKey = (a: ImpactCaseTemplate, b: ImpactCaseTemplate): number => {
    if (goal === 'maximize_reach') {
      const d = reachEfficiency(b) - reachEfficiency(a);
      if (Math.abs(d) > 1e-6) return d;
      return ngoRank(a.primaryNgoId) - ngoRank(b.primaryNgoId);
    }
    if (goal === 'education') {
      const ae = a.categoryTag === 'education' ? 1 : 0;
      const be = b.categoryTag === 'education' ? 1 : 0;
      if (be !== ae) return be - ae;
      return reachEfficiency(b) - reachEfficiency(a);
    }
    if (goal === 'urgent_relief') {
      const score = (x: ImpactCaseTemplate) =>
        (x.categoryTag === 'food' ? 4 : 0) +
        (x.categoryTag === 'shelter' ? 3 : 0) +
        (x.categoryTag === 'health' ? 3 : 0) +
        reachEfficiency(x);
      return score(b) - score(a);
    }
    if (goal === 'maximize_impact_depth') {
      const d = b.rmPerCase - a.rmPerCase;
      if (d !== 0) return d;
      return ngoRank(a.primaryNgoId) - ngoRank(b.primaryNgoId);
    }
    /* unspecified: balanced — prefer mid efficiency + NGO order */
    const mid = (x: ImpactCaseTemplate) => -Math.abs(reachEfficiency(x) - 0.1);
    const d = mid(b) - mid(a);
    if (Math.abs(d) > 1e-6) return d;
    return ngoRank(a.primaryNgoId) - ngoRank(b.primaryNgoId);
  };

  return templates.sort(sortKey);
}

function greedyPack(budgetRm: number, ranked: ImpactCaseTemplate[]): { lines: GoalOrchestrationLine[]; remainderRm: number } {
  const counts = new Map<string, { t: ImpactCaseTemplate; count: number }>();
  let rmLeft = Math.round(budgetRm * 100) / 100;
  let guard = 0;

  while (rmLeft >= 1 && guard < 400) {
    guard += 1;
    const pick = ranked.find((t) => t.rmPerCase <= rmLeft + 1e-6);
    if (!pick) break;
    rmLeft = Math.round((rmLeft - pick.rmPerCase) * 100) / 100;
    const cur = counts.get(pick.id);
    if (cur) cur.count += 1;
    else counts.set(pick.id, { t: pick, count: 1 });
  }

  const lines: GoalOrchestrationLine[] = [];
  for (const { t, count } of counts.values()) {
    const ngo = getNgoById(t.primaryNgoId);
    const name = ngo?.name ?? t.primaryNgoId;
    lines.push({
      caseTemplateId: t.id,
      label: t.label,
      count,
      rmEach: t.rmPerCase,
      rmSubtotal: Math.round(count * t.rmPerCase * 100) / 100,
      peopleHelped: count * t.peoplePerCase,
      routedToNgoId: t.primaryNgoId,
      routedToName: name,
    });
  }

  /* Stable display: most RM first */
  lines.sort((a, b) => b.rmSubtotal - a.rmSubtotal);
  const remainderRm = Math.max(0, Math.round(rmLeft * 100) / 100);
  return { lines, remainderRm };
}

function strategySummaryPayload(
  lines: GoalOrchestrationLine[],
  totalPeople: number,
  budgetRm: number,
  remainderRm: number,
): string {
  const used = Math.round((budgetRm - remainderRm) * 100) / 100;
  const parts = lines.map((l) => `${l.count}× ${l.label.split('(')[0].trim()}`);
  const tail =
    remainderRm > 0
      ? ` RM ${remainderRm.toFixed(remainderRm % 1 ? 2 : 0)} unallocated in this demo grid (add more RM or adjust case sizes in a live product).`
      : '';
  return `Orchestrated **RM ${budgetRm}** → **${parts.join(' · ')}** (~RM ${used} mapped to cases, **~${totalPeople} people** helped in this illustrative model).${tail}`;
}

/**
 * Build structured goal orchestration for monetary chat turns.
 * `preferredNgoIds` should be matcher order (e.g. top matched agents).
 */
export function buildGoalOrchestration(
  budgetRm: number,
  goalSignal: DonorGoalSignal,
  preferredNgoIds: string[],
): GoalOrchestrationPayload | null {
  if (!Number.isFinite(budgetRm) || budgetRm < 10) return null;

  const ranked = rankTemplates(goalSignal, preferredNgoIds);
  const { lines, remainderRm } = greedyPack(budgetRm, ranked);
  if (lines.length === 0) return null;

  const totalPeopleHelped = lines.reduce((s, l) => s + l.peopleHelped, 0);
  return {
    goalSignal,
    goalLabel: goalHumanLabel(goalSignal),
    budgetRm,
    strategySummary: strategySummaryPayload(lines, totalPeopleHelped, budgetRm, remainderRm),
    totalPeopleHelped,
    remainderRm,
    lines,
  };
}
