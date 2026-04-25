import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Sparkles, Send, Bot, User, CheckCircle2,
  XCircle, Package, MapPin, Building2, Brain, RotateCcw, AlertCircle,
  Mic, MicOff, Loader2, Scale, Truck, Zap,
} from 'lucide-react';
import type { DonationPlanPayload, PlanReceiver } from '../../lib/donation-plan-types';
import type { DonationWorkflowSnapshot } from '../../lib/donation-workflow-types';
import type { DonationImageAnalysisResult, PhotoVerificationStatus } from '../../lib/donation-image-analysis';

type Condition = 'Good' | 'Worn' | 'Damaged' | 'Unknown';
type Stage =
  | 'greeting'
  | 'details'
  | 'awaiting_image'
  | 'analyzing'
  | 'result_suitable'
  | 'result_unsuitable'
  | 'awaiting_delivery_choice';

interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text?: string;
  imageUrl?: string;
  type: 'text' | 'image' | 'analysis';
  condition?: Condition;
  suitable?: boolean;
  /** Vision screening: unrelated photo vs wrong category vs OK. */
  photoVerification?: PhotoVerificationStatus;
  /** Short model description of what appears in the image. */
  visibleSummary?: string;
  detectedCategory?: string;
  keyDetails?: string[];
  /** Server-ranked NGO matches for this assistant turn (chat API). */
  matchedAgents?: PlanReceiver[];
  /** Deterministic workflow snapshot from `/api/donation-assistant/chat` (intent → structure → match). */
  workflow?: DonationWorkflowSnapshot;
  /** Which backend generated this turn. */
  source?: 'glm' | 'fallback';
  /** Optional backend explanation for fallback mode. */
  sourceReason?: string;
}

interface ChatThread {
  id: string;
  title: string;
  updatedAt: number;
  stage: Stage;
  detectedItem: string;
  messages: ChatMessage[];
}

type DbSessionRow = {
  id: string;
  title: string;
  current_stage: Stage;
  detected_item: string;
  updated_at: string;
};

type DbMessageRow = {
  id: string;
  role: 'user' | 'bot';
  type: 'text' | 'image' | 'analysis';
  text: string | null;
  payload: Record<string, unknown> | null;
};

function buildInitialMessages(): ChatMessage[] {
  return [
    {
      id: '0',
      role: 'bot',
      type: 'text',
      text: "Hi there! 👋 I’m your AI Donation Assistant for **item donations**. Tell me what item(s) you want to donate, then upload a clear photo so I can check condition and match the best NGOs.",
    },
  ];
}

function createFreshThread(): ChatThread {
  return {
    id: `chat-${Date.now()}`,
    title: 'New Chat',
    updatedAt: Date.now(),
    stage: 'greeting',
    detectedItem: 'Clothing / Mixed Items',
    messages: buildInitialMessages(),
  };
}

function getThreadTitle(msgs: ChatMessage[]): string {
  const firstUser = msgs.find((m) => m.role === 'user' && m.type === 'text' && m.text?.trim());
  if (!firstUser?.text) return 'New Chat';
  return firstUser.text.trim().slice(0, 38);
}

const CONDITION_COLORS: Record<Condition, string> = {
  Good: 'bg-green-50 text-green-700 border-green-200',
  Worn: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Damaged: 'bg-red-50 text-[#da1a32] border-red-200',
  Unknown: 'bg-gray-50 text-gray-600 border-gray-200',
};

const FALLBACK_ALLOCATION: PlanReceiver[] = [
  {
    ngoId: 'ngo_hope_orphanage',
    name: 'Hope Orphanage',
    location: 'Kuala Lumpur • 2.5 km',
    allocation: 60,
    percent: 60,
    urgency: 'High',
    reason: ['High urgency — disaster-affected families', 'Higher daily demand', 'Fewer recent donations received'],
  },
  {
    ngoId: 'ngo_care_foundation',
    name: 'Care Foundation',
    location: 'Petaling Jaya • 5.1 km',
    allocation: 40,
    percent: 40,
    urgency: 'Medium',
    reason: ['Consistent need pattern', 'Serves elderly community', 'Good delivery accessibility'],
  },
];

/** Classify donation from user text; returns updated label (caller passes current label as fallback). */
function resolveDetectedCategory(text: string, current: string): string {
  const t = text.trim();
  if (!t) return current;
  const lower = t.toLowerCase();
  if (lower.includes('food') || lower.includes('rice') || lower.includes('pack')) return 'Food Packs';
  if (lower.includes('cloth') || lower.includes('shirt') || lower.includes('wear')) return 'Clothing';
  if (lower.includes('book') || lower.includes('school') || lower.includes('suppli')) return 'School Supplies';
  if (lower.includes('blank') || lower.includes('pillow') || lower.includes('bed')) return 'Blankets & Bedding';
  if (lower.includes('medic') || lower.includes('drug')) return 'Medical Supplies';
  return current;
}

function buildChatPayload(msgs: ChatMessage[]): { role: 'user' | 'assistant'; content: string }[] {
  const out: { role: 'user' | 'assistant'; content: string }[] = [];
  for (const m of msgs) {
    if (m.type === 'analysis') continue;
    if (m.type === 'image') {
      out.push({ role: 'user', content: '[User shared a donation item photo in the thread]' });
      continue;
    }
    if (m.type === 'text' && m.text) {
      out.push({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text });
    }
  }
  return out.slice(-24);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const r = reader.result as string;
      const i = r.indexOf(',');
      resolve(i >= 0 ? r.slice(i + 1) : r);
    };
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(blob);
  });
}

/** Downscale large photos before vision API (browser-only). */
async function prepareImageForAnalysis(file: File): Promise<{ base64: string; mimeType: string }> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files can be analyzed for donation items.');
  }
  const maxEdge = 1400;
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  const scale = Math.min(1, maxEdge / Math.max(width, height, 1));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not read image.');
  ctx.drawImage(bitmap, 0, 0, w, h);
  const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), mimeType, 0.85);
  });
  const base64 = await blobToBase64(blob);
  return { base64, mimeType };
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function BotBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 bg-[#da1a32] rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="max-w-[80%]">{children}</div>
    </div>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 justify-end">
      <div className="max-w-[80%]">{children}</div>
      <div className="w-8 h-8 bg-[#000000] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
        <User className="w-4 h-4 text-white" />
      </div>
    </div>
  );
}

function matchedAgentHref(ngoId: string) {
  return `/donor/needs/${encodeURIComponent(ngoId)}`;
}

/** Chat: expanded match card → receiver detail. */

function parseDistanceKm(locationLabel: string): number | null {
  const m = locationLabel.match(/([\d.]+)\s*km/i);
  if (!m?.[1]) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) ? n : null;
}

function distanceTierLabel(locationLabel: string): string {
  const km = parseDistanceKm(locationLabel);
  if (km == null) return 'Unknown';
  if (km <= 5) return 'Near';
  if (km <= 12) return 'Moderate';
  return 'Far';
}

function guessDemandMatchLine(r: PlanReceiver): string {
  const blob = `${r.reason.join(' ')} ${r.name}`.toLowerCase();
  if (/food|meal|rice|formula|pantry/.test(blob)) return 'Food needed';
  if (/medical|clinic|health|hygiene/.test(blob)) return 'Medical / hygiene needed';
  if (/book|school|education|library/.test(blob)) return 'Education support needed';
  if (/shelter|blanket|bedding|night/.test(blob)) return 'Shelter essentials needed';
  return 'Catalog demand matched';
}

function urgentContextLine(r: PlanReceiver): string {
  const blob = r.reason.join(' ');
  const gap = r.reason[1] || '';
  if (/flood|disaster|displaced/i.test(blob)) return 'Flood impact';
  if (/critical|critically short|running low|waitlist|short/i.test(gap)) return 'Critical shortage';
  if (/nightly arrivals|urgent|high urgency/i.test(blob)) return 'High active demand';
  return 'Needs-based prioritization';
}

function fairnessLine(r: PlanReceiver): string {
  if (r.percent >= 60) return 'Low recent donations';
  if (r.percent >= 45) return 'Balanced partner coverage';
  return 'Complements primary allocation';
}

function VisualReasoningPanel({ r }: { r: PlanReceiver }) {
  const urgencyTone =
    r.urgency === 'High'
      ? 'text-[#da1a32]'
      : r.urgency === 'Low'
        ? 'text-gray-600'
        : 'text-amber-700';
  const demandLine = guessDemandMatchLine(r);
  const distanceTier = distanceTierLabel(r.location);

  return (
    <div className="mt-3 rounded-xl border border-[#e5e5e5] bg-white p-3">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Visual reasoning</p>
      <div className="grid sm:grid-cols-2 gap-2">
        <div className="rounded-lg bg-red-50 border border-red-100 px-2.5 py-2 text-xs">
          <span className="font-semibold">Urgency:</span>{' '}
          <span className={urgencyTone}>{r.urgency === 'High' ? '🔴 High' : r.urgency === 'Low' ? '🟢 Low' : '🟡 Medium'}</span>
          <div className="text-[10px] text-gray-600 mt-1">{urgentContextLine(r)}</div>
        </div>
        <div className="rounded-lg bg-green-50 border border-green-100 px-2.5 py-2 text-xs">
          <span className="font-semibold">Demand Match:</span> ✅ {demandLine}
          <div className="text-[10px] text-gray-600 mt-1">Reasoning from catalog + donor intent</div>
        </div>
        <div className="rounded-lg bg-[#edf2f4] border border-[#e5e5e5] px-2.5 py-2 text-xs">
          <span className="font-semibold">Fairness:</span> ⚖️ {fairnessLine(r)}
          <div className="text-[10px] text-gray-600 mt-1">Prevents over-concentration on one partner</div>
        </div>
        <div className="rounded-lg bg-[#edf2f4] border border-[#e5e5e5] px-2.5 py-2 text-xs">
          <span className="font-semibold">Distance:</span> 📍 {distanceTier}
          <div className="text-[10px] text-gray-600 mt-1">{r.location}</div>
        </div>
      </div>
    </div>
  );
}

function categoryEmoji(slug: string): string {
  if (slug === 'clothes') return '👕';
  if (slug === 'food_packs') return '🍚';
  if (slug === 'school_supplies') return '📚';
  if (slug === 'blankets_bedding') return '🛏️';
  if (slug === 'medical_supplies') return '⚕️';
  return '📦';
}

function humanizeSourceReason(reason: string): string {
  if (reason === 'missing_api_key') return 'missing API key in server env';
  if (reason.startsWith('glm_http_401')) return 'GLM auth failed (check API key/base)';
  if (reason.startsWith('glm_http_404')) return 'GLM endpoint not found (check API base)';
  if (reason === 'network_or_runtime_error') return 'network/runtime error';
  if (reason === 'empty_glm_reply') return 'empty model reply';
  return reason;
}

function MatchedAgentChatCard({ r }: { r: PlanReceiver }) {
  return (
    <li className="rounded-lg border border-[#e5e5e5] overflow-hidden">
      <Link
        href={matchedAgentHref(r.ngoId)}
        className="block bg-[#edf2f4]/40 px-3 py-2 transition-all hover:bg-white hover:border-[#da1a32] hover:ring-1 hover:ring-[#da1a32]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#da1a32]"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#000000]">{r.name}</p>
            <p className="text-[10px] text-gray-500 flex items-center gap-0.5 mt-0.5">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {r.location}
            </p>
          </div>
          <span className="text-xs font-bold text-[#da1a32] flex-shrink-0">{r.percent}%</span>
        </div>
        <p className="text-[10px] text-gray-600 mt-1.5 leading-snug">{r.reason[0]}</p>
        {r.reason[1] ? (
          <p className="text-[10px] text-gray-400 mt-1 leading-snug border-t border-[#e5e5e5] pt-1.5">
            <span className="font-medium text-gray-500">Catalog need (goods / programs): </span>
            {r.reason[1]}
          </p>
        ) : null}
        <span
          className={`inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded border ${
            r.urgency === 'High'
              ? 'bg-red-50 text-red-700 border-red-200'
              : r.urgency === 'Low'
                ? 'bg-gray-50 text-gray-600 border-gray-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
        >
          Urgency: {r.urgency}
        </span>
      </Link>
    </li>
  );
}

export function AIDonation() {
  const [stage, setStage] = useState<Stage>('greeting');
  const [messages, setMessages] = useState<ChatMessage[]>(buildInitialMessages());
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [detectedItem, setDetectedItem] = useState('Clothing / Mixed Items');
  const [isRecording, setIsRecording] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [pendingImage, setPendingImage] = useState<{ file: File; preview: string } | null>(null);
  const [pendingAttachFiles, setPendingAttachFiles] = useState<File[]>([]);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const [glmPlan, setGlmPlan] = useState<DonationPlanPayload | null>(null);
  const [donationAccepted, setDonationAccepted] = useState(false);
  const [deliveryChoice, setDeliveryChoice] = useState<'self_dropoff' | 'partner_logistics' | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([createFreshThread()]);
  const [activeThreadId, setActiveThreadId] = useState<string>(chatThreads[0].id);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [confirmingDonation, setConfirmingDonation] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const detectedItemRef = useRef(detectedItem);
  detectedItemRef.current = detectedItem;
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef('');
  const donationFlowIdRef = useRef<string | null>(null);

  const displayReceivers = useMemo(
    () => (glmPlan?.receivers?.length ? glmPlan.receivers.slice(0, 1) : FALLBACK_ALLOCATION.slice(0, 1)),
    [glmPlan],
  );

  /** Render heavy workflow/match cards only on the latest bot text turn. */
  const latestBotTextMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      if (m.role === 'bot' && m.type === 'text') return m.id;
    }
    return null;
  }, [messages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    // Cleanup voice recognition on unmount
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  function stageFromValue(value: string | null | undefined): Stage {
    if (
      value === 'greeting' ||
      value === 'details' ||
      value === 'awaiting_image' ||
      value === 'analyzing' ||
      value === 'result_suitable' ||
      value === 'result_unsuitable' ||
      value === 'awaiting_delivery_choice'
    ) {
      return value;
    }
    return 'greeting';
  }

  function toClientThread(row: DbSessionRow): ChatThread {
    return {
      id: row.id,
      title: row.title || 'New Chat',
      updatedAt: Date.parse(row.updated_at) || Date.now(),
      stage: stageFromValue(row.current_stage),
      detectedItem: row.detected_item || 'Clothing / Mixed Items',
      messages: [],
    };
  }

  function toClientMessage(row: DbMessageRow): ChatMessage {
    const payload = (row.payload ?? {}) as Partial<ChatMessage>;
    return {
      id: row.id,
      role: row.role,
      type: row.type,
      text: row.text ?? undefined,
      imageUrl: typeof payload.imageUrl === 'string' ? payload.imageUrl : undefined,
      condition: payload.condition as Condition | undefined,
      suitable: typeof payload.suitable === 'boolean' ? payload.suitable : undefined,
      photoVerification: payload.photoVerification as PhotoVerificationStatus | undefined,
      visibleSummary: typeof payload.visibleSummary === 'string' ? payload.visibleSummary : undefined,
      detectedCategory: typeof payload.detectedCategory === 'string' ? payload.detectedCategory : undefined,
      keyDetails: Array.isArray(payload.keyDetails) ? (payload.keyDetails as string[]) : undefined,
      matchedAgents: Array.isArray(payload.matchedAgents) ? (payload.matchedAgents as PlanReceiver[]) : undefined,
      workflow: payload.workflow as DonationWorkflowSnapshot | undefined,
      source: payload.source as 'glm' | 'fallback' | undefined,
      sourceReason: typeof payload.sourceReason === 'string' ? payload.sourceReason : undefined,
    };
  }

  async function loadSessionsFromApi(): Promise<ChatThread[]> {
    const res = await fetch('/api/donor/ai-chat-history', { cache: 'no-store' });
    const data = (await res.json()) as { sessions?: DbSessionRow[]; error?: string };
    if (!res.ok) throw new Error(data.error || 'Unable to load chat sessions.');
    return (data.sessions ?? []).map(toClientThread);
  }

  async function createSessionInApi(): Promise<ChatThread> {
    const res = await fetch('/api/donor/ai-chat-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ withGreeting: true }),
    });
    const data = (await res.json()) as { session?: DbSessionRow; error?: string };
    if (!res.ok || !data.session) throw new Error(data.error || 'Unable to create chat session.');
    return toClientThread(data.session);
  }

  async function loadMessagesFromApi(sessionId: string): Promise<ChatMessage[]> {
    const res = await fetch(`/api/donor/ai-chat-history/messages?sessionId=${encodeURIComponent(sessionId)}`, {
      cache: 'no-store',
    });
    const data = (await res.json()) as { messages?: DbMessageRow[]; error?: string };
    if (!res.ok) throw new Error(data.error || 'Unable to load chat messages.');
    const mapped = (data.messages ?? []).map(toClientMessage);
    return mapped.length > 0 ? mapped : buildInitialMessages();
  }

  async function persistMessageToApi(sessionId: string, message: ChatMessage, stageForSession: Stage, itemLabel: string) {
    await fetch('/api/donor/ai-chat-history/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        role: message.role,
        type: message.type,
        text: message.text ?? null,
        currentStage: stageForSession,
        detectedItem: itemLabel,
        payload: {
          imageUrl: message.imageUrl ?? null,
          condition: message.condition ?? null,
          suitable: typeof message.suitable === 'boolean' ? message.suitable : null,
          photoVerification: message.photoVerification ?? null,
          visibleSummary: message.visibleSummary ?? null,
          detectedCategory: message.detectedCategory ?? null,
          keyDetails: message.keyDetails ?? null,
          matchedAgents: message.matchedAgents ?? null,
          workflow: message.workflow ?? null,
          source: message.source ?? null,
          sourceReason: message.sourceReason ?? null,
        },
      }),
    });
  }

  useEffect(() => {
    const bootstrap = async () => {
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        let sessions = await loadSessionsFromApi();
        if (sessions.length === 0) {
          const created = await createSessionInApi();
          sessions = [created];
        }
        const active = sessions[0];
        const msgs = await loadMessagesFromApi(active.id);
        setChatThreads(sessions.map((t) => (t.id === active.id ? { ...t, messages: msgs } : t)));
        setActiveThreadId(active.id);
        setMessages(msgs);
        setStage(active.stage);
        setDetectedItem(active.detectedItem);
      } catch (e) {
        setHistoryError(e instanceof Error ? e.message : 'Unable to load chat history.');
      } finally {
        setHistoryLoading(false);
      }
    };
    void bootstrap();
  }, []);

  useEffect(() => {
    setChatThreads((prev) =>
      prev.map((thread) =>
        thread.id === activeThreadId
          ? {
              ...thread,
              title: getThreadTitle(messages),
              updatedAt: Date.now(),
              messages,
              stage,
              detectedItem,
            }
          : thread,
      ),
    );
  }, [messages, stage, detectedItem, activeThreadId]);

  const addBotMessage = (text: string, extra?: Partial<ChatMessage>) => {
    const message: ChatMessage = { id: Date.now().toString(), role: 'bot', type: 'text', text, ...extra };
    setMessages((prev) => [...prev, message]);
    void persistMessageToApi(activeThreadId, message, stage, detectedItem).catch(() => {});
  };

  const addUserMessage = (text: string, extra?: Partial<ChatMessage>) => {
    const message: ChatMessage = { id: Date.now().toString(), role: 'user', type: 'text', text, ...extra };
    setMessages((prev) => [...prev, message]);
    void persistMessageToApi(activeThreadId, message, stage, detectedItem).catch(() => {});
  };

  const startImageConditionScan = async (file: File) => {
    setStage('analyzing');
    setIsTyping(true);

    try {
      const { base64, mimeType } = await prepareImageForAnalysis(file);
      const res = await fetch('/api/donation-assistant/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
          detectedItem: detectedItemRef.current,
          transcript: transcriptRef.current.trim(),
        }),
      });
      const json = (await res.json()) as { analysis?: DonationImageAnalysisResult; error?: string };
      const analysis = json.analysis;
      if (!analysis) {
        throw new Error(json.error || 'No analysis');
      }

      const verification = analysis.verification;
      const condition: Condition = analysis.condition;
      const okForAllocation = verification === 'passed' && condition !== 'Damaged';

      const analysisMessage: ChatMessage = {
        id: `${Date.now()}-analysis`,
        role: 'bot',
        type: 'analysis',
        condition,
        suitable: okForAllocation,
        photoVerification: verification,
        visibleSummary: analysis.visibleSummary,
        detectedCategory: analysis.detectedCategory,
        keyDetails: analysis.keyDetails,
      };
      setMessages((prev) => [...prev, analysisMessage]);
      void persistMessageToApi(activeThreadId, analysisMessage, stage, detectedItemRef.current).catch(() => {});

      if (verification !== 'passed') {
        setStage('awaiting_image');
        setTimeout(() => {
          addBotMessage(
            `**Please send another photo.**\n\n${analysis.guidance}\n\nUse one clear, well-lit shot of the **actual** items matching “**${detectedItemRef.current}**” (not screenshots, documents, or unrelated scenes).`,
          );
        }, 0);
        return;
      }

      if (condition === 'Damaged') {
        setStage('result_unsuitable');
        setTimeout(() => {
          addBotMessage(
            analysis.guidance ||
              '❌ This item looks **damaged or unusable** for donation. Charities need goods that are at least **fair** and safe. Please try again with something in **Good** or gently **Worn** condition.',
          );
        }, 0);
        return;
      }

      setStage('result_suitable');
      setPlanLoading(true);
      void (async () => {
        try {
          const planRes = await fetch('/api/donation-assistant/plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transcript: transcriptRef.current.trim() || '(no text yet)',
              detectedItem: detectedItemRef.current,
              condition,
            }),
          });
          const data = (await planRes.json()) as DonationPlanPayload;
          if (Array.isArray(data.receivers) && data.receivers.length > 0) {
            setGlmPlan(data);
          } else {
            setGlmPlan(null);
          }
        } catch {
          setGlmPlan(null);
        } finally {
          setPlanLoading(false);
        }
      })();
      setTimeout(() => {
        addBotMessage(
          `✅ Photo accepted: ${analysis.visibleSummary} I will recommend the best single organization for this donation.`,
        );
      }, 400);
    } catch {
      setStage('awaiting_image');
      setTimeout(() => {
        addBotMessage(
          'We could not analyze that image from your device. Use a **JPEG or PNG** under ~4 MB, then send again with a clear photo of your **donation item**.',
        );
      }, 0);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async () => {
    if (historyLoading) return;
    if (stage === 'result_suitable' || stage === 'awaiting_delivery_choice' || stage === 'result_unsuitable' || stage === 'analyzing' || isRecording) return;
    if (isTyping) return;

    const trimmed = inputText.trim();
    const hasPendingAttach = pendingAttachFiles.length > 0;

    if (pendingImage) {
      if (stage === 'greeting') {
        addBotMessage(
          'Start by typing what you would like to donate and press **Send**. Then queue a clear item photo and press **Send** again for screening.',
        );
        return;
      }

      const captionTrim = trimmed;
      const categoryForPhoto = captionTrim ? resolveDetectedCategory(captionTrim, detectedItem) : detectedItem;

      const { file, preview } = pendingImage;
      setPendingImage(null);
      setInputText('');

      if (trimmed) {
        const nd = resolveDetectedCategory(trimmed, detectedItem);
        setDetectedItem(nd);
        addUserMessage(trimmed);
        transcriptRef.current += `\nUser: ${trimmed}`;
      }

      addUserMessage('', { type: 'image', imageUrl: preview });
      transcriptRef.current += '\nUser: [submitted item photo for condition check]';

      void startImageConditionScan(file);
      return;
    }

    if (!trimmed && !hasPendingAttach) return;

    let userLine = trimmed;
    if (hasPendingAttach) {
      const names = pendingAttachFiles.map((f) => f.name).join(', ');
      const attachLine = `📎 Attached: ${names}`;
      userLine = trimmed ? `${trimmed}\n\n${attachLine}` : attachLine;
      setAttachedFiles((prev) => [...prev, ...pendingAttachFiles]);
      setPendingAttachFiles([]);
    }

    let nextDetected = detectedItem;
    if (trimmed) {
      nextDetected = resolveDetectedCategory(trimmed, detectedItem);
      setDetectedItem(nextDetected);
    }

    let nextStage: Stage = stage;
    // First text turn should collect missing details before photo gate.
    if (stage === 'greeting') nextStage = 'details';
    else if (stage === 'details') nextStage = 'details';
    else if (stage === 'awaiting_image') nextStage = 'awaiting_image';

    const userMsg: ChatMessage = {
      id: `${Date.now()}-u`,
      role: 'user',
      type: 'text',
      text: userLine,
    };
    const nextThread = [...messages, userMsg];
    setMessages(nextThread);
    void persistMessageToApi(activeThreadId, userMsg, nextStage, nextDetected).catch(() => {});
    transcriptRef.current += `\nUser: ${userLine}`;
    setInputText('');
    setStage(nextStage);

    setIsTyping(true);
    try {
      const payload = buildChatPayload(nextThread);
      const res = await fetch('/api/donation-assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: payload,
          stage: nextStage,
          detectedItem: nextDetected,
          userLatest: userLine,
          donationFlowId: donationFlowIdRef.current,
        }),
      });
      const data = (await res.json()) as {
        reply?: string;
        matchedAgents?: PlanReceiver[];
        workflow?: DonationWorkflowSnapshot;
        source?: 'glm' | 'fallback';
        sourceReason?: string;
      };
      const reply = data.reply?.trim() || 'Thanks — let me know how else I can help.';
      const agents =
        Array.isArray(data.matchedAgents) && data.matchedAgents.length > 0 ? data.matchedAgents : undefined;
      const extra: Partial<ChatMessage> = {};
      if (agents) extra.matchedAgents = agents;
      if (data.workflow && typeof data.workflow.flow_id === 'string') {
        extra.workflow = data.workflow;
        donationFlowIdRef.current = data.workflow.flow_id;
      }
      if (data.source === 'glm' || data.source === 'fallback') {
        extra.source = data.source;
      }
      if (typeof data.sourceReason === 'string' && data.sourceReason.trim()) {
        extra.sourceReason = data.sourceReason.trim();
      }
      addBotMessage(reply, Object.keys(extra).length ? extra : undefined);
      if (data.workflow && stage !== 'result_suitable' && stage !== 'awaiting_delivery_choice') {
        const wf = data.workflow;
        if (wf.intent !== 'donate_physical_item') {
          setStage('details');
        } else if (wf.structured_donation?.missing_fields?.length > 0) {
          setStage('details');
        } else {
          setStage('awaiting_image');
        }
      }
    } catch {
      addBotMessage('I could not reach the assistant just now. Please try again in a moment.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleReset = async () => {
    setHistoryError(null);
    let newThread: ChatThread | null = null;
    try {
      newThread = await createSessionInApi();
      const sessions = await loadSessionsFromApi();
      setChatThreads(sessions);
      setActiveThreadId(newThread.id);
      const nextMessages = await loadMessagesFromApi(newThread.id);
      setMessages(nextMessages);
      setStage(newThread.stage);
      setDetectedItem(newThread.detectedItem);
    } catch (e) {
      setHistoryError(e instanceof Error ? e.message : 'Unable to create a new chat.');
      return;
    }

    setStage('greeting');
    transcriptRef.current = '';
    donationFlowIdRef.current = null;
    setGlmPlan(null);
    setDonationAccepted(false);
    setDeliveryChoice(null);
    setPlanLoading(false);
    setPendingImage(null);
    setPendingAttachFiles([]);
    setDetectedItem('Clothing / Mixed Items');
    if (newThread) setMessages(buildInitialMessages());
    setInputText('');
    setIsTyping(false);
    setAttachedFiles([]);
    setIsRecording(false);
    setMicPermissionError(null);
    recognitionRef.current?.stop();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') void handleSend();
  };

  const handleVoiceInput = async () => {
    // Check browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setMicPermissionError('Voice input is not supported in your browser. Please use Chrome, Edge, or Safari.');
      setTimeout(() => setMicPermissionError(null), 5000);
      return;
    }

    if (isRecording) {
      // Stop recording
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    setMicPermissionError(null);

    // Check microphone permission status first
    if (navigator.permissions) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        console.log('Microphone permission status:', permissionStatus.state);

        if (permissionStatus.state === 'denied') {
          setMicPermissionError('🎤 Microphone denied. Go to browser settings → Site Settings → Microphone → Allow');
          setTimeout(() => setMicPermissionError(null), 10000);
          return;
        }
      } catch (e) {
        console.log('Permission query not supported, proceeding anyway');
      }
    }

    try {
      // Start speech recognition directly (it will handle permissions)
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('✅ Voice recognition started successfully - speak now!');
        setIsRecording(true);
        setMicPermissionError(null);
      };

      recognition.onresult = (event: any) => {
        console.log('✅ Voice recognition result received:', event.results);
        const transcript = event.results[0][0].transcript;
        console.log('✅ Transcript:', transcript);
        setInputText(transcript);
        setIsRecording(false);
      };

      recognition.onerror = (event: any) => {
        console.error('❌ Speech recognition error:', event.error, event);
        setIsRecording(false);
        if (event.error === 'no-speech') {
          setMicPermissionError('No speech detected. Speak louder and try again.');
          setTimeout(() => setMicPermissionError(null), 4000);
        } else if (event.error === 'not-allowed') {
          setMicPermissionError('Permission denied. To enable: Click lock icon in address bar → Microphone → Allow → Refresh page. Or continue typing without voice input.');
          // Don't auto-dismiss permission errors - let user dismiss manually
        } else if (event.error === 'aborted') {
          // User stopped recording, no error needed
        } else if (event.error === 'audio-capture') {
          setMicPermissionError('Microphone in use by another app. Close other apps and try again.');
          setTimeout(() => setMicPermissionError(null), 6000);
        } else if (event.error === 'network') {
          setMicPermissionError('No internet connection. Voice recognition needs internet.');
          setTimeout(() => setMicPermissionError(null), 5000);
        } else if (event.error === 'service-not-allowed') {
          setMicPermissionError('Voice service blocked. Try using HTTPS or Chrome/Edge browser.');
          setTimeout(() => setMicPermissionError(null), 6000);
        } else {
          setMicPermissionError(`Error: ${event.error}. Try refreshing the page.`);
          setTimeout(() => setMicPermissionError(null), 5000);
        }
      };

      recognition.onend = () => {
        console.log('Voice recognition ended');
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      console.log('🎤 Starting voice recognition...');
      recognition.start();
    } catch (err: any) {
      console.error('❌ Voice input initialization error:', err);
      setMicPermissionError('Cannot start voice input. Try refreshing page or using Chrome browser.');
      setTimeout(() => setMicPermissionError(null), 5000);
    }
  };

  const lastAnalysis = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      if (m.type === 'analysis') return m;
    }
    return null;
  }, [messages]);

  function parseQuantityFromTranscript(transcript: string): number {
    const explicit = transcript.match(/\b(\d{1,4})\s*(?:pieces?|items?|packs?|kg|units?|boxes?|bags?)\b/i);
    if (explicit?.[1]) return Math.max(1, Number(explicit[1]));
    const fallback = transcript.match(/\b(\d{1,4})\b/);
    if (fallback?.[1]) return Math.max(1, Number(fallback[1]));
    return 1;
  }

  function normalizeConditionForConfirm(condition: Condition | undefined): 'good' | 'worn' | 'damaged' {
    if (condition === 'Worn') return 'worn';
    if (condition === 'Damaged') return 'damaged';
    return 'good';
  }

  async function submitConfirmedDonation(choice: 'self_dropoff' | 'partner_logistics') {
    if (confirmingDonation) return;
    setConfirmError(null);
    setConfirmingDonation(true);
    try {
      const receivers = glmPlan?.receivers ?? [];
      if (!receivers.length) {
        throw new Error('No AI allocation plan was found. Please re-run recommendation before confirming.');
      }

      const needsRes = await fetch('/api/donor/needs', { method: 'GET' });
      const needsJson = (await needsRes.json()) as {
        error?: string;
        needs?: Array<{
          id: string;
          organizations?: { id?: string } | Array<{ id?: string }> | null;
        }>;
      };
      if (!needsRes.ok || !Array.isArray(needsJson.needs)) {
        throw new Error(needsJson.error || 'Unable to fetch live needs for allocation mapping.');
      }

      const activeNeeds = needsJson.needs;
      const allocations = receivers
        .map((receiver) => {
          const matchedNeed = activeNeeds.find((need) => {
            const org = need.organizations;
            if (Array.isArray(org)) {
              return org.some((o) => o?.id === receiver.ngoId);
            }
            return org?.id === receiver.ngoId;
          });
          if (!matchedNeed) return null;
          return {
            needId: matchedNeed.id,
            percent: receiver.percent,
            reason: receiver.reason,
          };
        })
        .filter((row): row is { needId: string; percent: number; reason: string[] } => Boolean(row));

      if (!allocations.length) {
        throw new Error('AI matched organizations do not map to currently active needs. Please refresh and try again.');
      }

      const quantity = parseQuantityFromTranscript(transcriptRef.current);
      const conditionGrade = normalizeConditionForConfirm(lastAnalysis?.condition);
      const deliveryMethod = choice === 'self_dropoff' ? 'self_delivery' : 'platform_delivery';

      const recentBotTexts = messages
        .filter((m) => m.role === 'bot' && m.type === 'text' && m.text?.trim())
        .slice(-4)
        .map((m) => m.text!.trim());
      const trackingSummary = [glmPlan?.planSummary, ...recentBotTexts]
        .filter((s): s is string => Boolean(s && String(s).trim()))
        .join('\n\n')
        .trim()
        .slice(0, 4000);

      const confirmRes = await fetch('/api/donations/confirm-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: detectedItemRef.current,
          quantity,
          conditionGrade,
          deliveryMethod,
          allocations,
          planSummary: glmPlan?.planSummary,
          trackingSummary: trackingSummary || undefined,
          donorIntent: glmPlan?.donorIntent,
          urgencyEvaluation: glmPlan?.urgencyEvaluation,
        }),
      });

      const confirmJson = (await confirmRes.json()) as { error?: string };
      if (!confirmRes.ok) {
        throw new Error(confirmJson.error || 'Unable to submit donation for dispatch.');
      }

      addBotMessage(
        choice === 'self_dropoff'
          ? 'Donation submitted successfully. We have created your allocation and drop-off workflow. Redirecting you to tracking...'
          : 'Donation submitted successfully. We have created your allocation and pickup workflow. Redirecting you to tracking...',
      );
      window.setTimeout(() => {
        window.location.href = '/donor/tracking';
      }, 900);
    } catch (e) {
      setConfirmError(e instanceof Error ? e.message : 'Unable to submit donation.');
    } finally {
      setConfirmingDonation(false);
    }
  }

  const needsPhotoResend =
    stage === 'awaiting_image' &&
    lastAnalysis?.photoVerification &&
    lastAnalysis.photoVerification !== 'passed';

  const stageSummaryLabel =
    stage === 'greeting'
      ? 'Getting started'
      : stage === 'details'
        ? 'Collecting details'
        : stage === 'awaiting_image'
          ? needsPhotoResend
            ? 'Resend item photo'
            : 'Awaiting photo'
          : stage === 'analyzing'
            ? 'Analyzing…'
            : stage === 'result_suitable'
              ? 'Ready to allocate'
              : stage === 'result_unsuitable'
                ? 'Not suitable'
                : '';

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl mb-1 text-[#000000] font-bold">AI Donation Assistant</h1>
          <p className="text-gray-500">
            This is a <span className="text-[#000000] font-medium">stateful agentic workflow</span>: GLM interprets your
            messages and (when you send a photo) runs a vision gate, then a structured allocation pass — with server-side
            tools (NGO catalog match, JSON planners). Set{' '}
            <code className="text-xs bg-[#edf2f4] px-1.5 py-0.5 rounded">ZAI_API_KEY</code> and{' '}
            <code className="text-xs bg-[#edf2f4] px-1.5 py-0.5 rounded">ZAI_API_BASE</code> (e.g.{' '}
            <code className="text-xs bg-[#edf2f4] px-1.5 py-0.5 rounded">https://api.z.ai/api/paas/v4</code> or BigModel)
            plus <code className="text-xs bg-[#edf2f4] px-1.5 py-0.5 rounded">GLM_MODEL</code> /{' '}
            <code className="text-xs bg-[#edf2f4] px-1.5 py-0.5 rounded">GLM_VISION_MODEL</code>. Without the key, a
            heuristic fallback answers — coordinated multi-step reasoning is reduced.
          </p>
        </div>
        <button
          onClick={() => void handleReset()}
          className="flex items-center gap-2 px-4 py-2 border-2 border-[#e5e5e5] rounded-xl text-sm text-[#000000] hover:border-[#da1a32] hover:text-[#da1a32] transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Microphone Info - Only show once */}
      {micPermissionError && micPermissionError.includes('Permission denied') && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-yellow-900 mb-1">Voice Input Unavailable</h3>
              <p className="text-xs text-yellow-800 mb-2">
                Your browser has blocked microphone access. You can continue using the chat by typing.
              </p>
              <button
                onClick={() => setMicPermissionError(null)}
                className="text-xs text-yellow-700 hover:text-yellow-900 underline font-medium"
              >
                Dismiss this message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single combined workspace: summary + chat */}
      <div className="rounded-2xl border-2 border-[#e5e5e5] shadow-sm overflow-hidden flex flex-col lg:flex-row lg:items-stretch lg:h-[65vh] bg-white">
        {/* Donation Chat History — left */}
        <aside className="w-full lg:w-[min(100%,320px)] lg:flex-shrink-0 flex flex-col min-h-0 order-2 lg:order-1 border-t lg:border-t-0 lg:border-r border-[#e5e5e5] bg-[#f4f6f8]">
            <div className="px-4 py-3 border-b border-[#e5e5e5] bg-[#edf2f4]/60 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-[#000000] rounded-xl flex items-center justify-center flex-shrink-0">
                  <Package className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#000000]">Donation Chat History</h2>
                  <p className="text-xs text-gray-500">Conversation timeline</p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 max-h-[42vh] lg:max-h-none">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Chats</span>
                {historyLoading ? <p className="mt-1 text-[11px] text-gray-500">Loading chat history...</p> : null}
                {historyError ? <p className="mt-1 text-[11px] text-[#da1a32]">{historyError}</p> : null}
                <ul className="mt-2 space-y-1.5">
                  {chatThreads
                    .slice()
                    .sort((a, b) => b.updatedAt - a.updatedAt)
                    .map((thread) => (
                      <li key={thread.id}>
                        <button
                          type="button"
                          onClick={async () => {
                            setActiveThreadId(thread.id);
                            setHistoryError(null);
                            setHistoryLoading(true);
                            try {
                              const fetched = await loadMessagesFromApi(thread.id);
                              setMessages(fetched);
                              setChatThreads((prev) =>
                                prev.map((t) => (t.id === thread.id ? { ...t, messages: fetched } : t)),
                              );
                              setStage(thread.stage);
                              setDetectedItem(thread.detectedItem);
                            } catch (e) {
                              setHistoryError(e instanceof Error ? e.message : 'Unable to load this chat.');
                            } finally {
                              setHistoryLoading(false);
                            }
                            transcriptRef.current = '';
                            donationFlowIdRef.current = null;
                            setGlmPlan(null);
                            setDonationAccepted(false);
                            setDeliveryChoice(null);
                            setPlanLoading(false);
                            setInputText('');
                            setIsTyping(false);
                            setAttachedFiles([]);
                            setPendingImage(null);
                            setPendingAttachFiles([]);
                            setMicPermissionError(null);
                            setIsRecording(false);
                            recognitionRef.current?.stop();
                          }}
                          className={`w-full text-left rounded-lg border px-2.5 py-2 text-xs transition-all ${
                            thread.id === activeThreadId
                              ? 'bg-white border-[#da1a32] text-[#000000]'
                              : 'bg-[#edf2f4]/50 border-[#e5e5e5] text-gray-700 hover:bg-white'
                          }`}
                        >
                          <p className="font-semibold truncate">{thread.title}</p>
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Progress</span>
                <p className="text-sm font-medium text-[#000000] mt-0.5">{stageSummaryLabel}</p>
              </div>
              {messages.length <= 1 ? (
                <div className="rounded-xl border border-dashed border-[#e5e5e5] bg-[#edf2f4]/30 p-4 text-center">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Start chatting and your conversation history will appear here.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {messages
                    .filter((m) => m.type === 'text' && m.text?.trim())
                    .map((m) => (
                      <li
                        key={`history-${m.id}`}
                        className={`rounded-lg border px-3 py-2 text-xs ${
                          m.role === 'user'
                            ? 'bg-white border-[#e5e5e5] text-[#000000]'
                            : 'bg-[#edf2f4]/70 border-[#d9dfe4] text-gray-700'
                        }`}
                      >
                        <p className="font-semibold mb-0.5">{m.role === 'user' ? 'You' : 'DonateAI'}</p>
                        <p className="leading-relaxed whitespace-pre-line">{m.text}</p>
                      </li>
                    ))}
                </ul>
              )}
            </div>
        </aside>

        {/* AI Chat — right */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0 order-1 lg:order-2">
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center gap-3 px-5 py-4 bg-[#000000] flex-shrink-0">
          <div className="w-9 h-9 bg-[#da1a32] rounded-full flex items-center justify-center shadow">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-white font-medium text-sm">DonateAI Assistant</div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-white opacity-60">Online</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 bg-[#edf2f4] bg-opacity-30">
          {messages.map((msg) => {
            if (msg.role === 'user') {
              return (
                <UserBubble key={msg.id}>
                  {msg.type === 'image' && msg.imageUrl ? (
                    <div className="bg-[#000000] rounded-2xl rounded-tr-sm overflow-hidden shadow-sm">
                      <img src={msg.imageUrl} alt="uploaded" className="max-w-[220px] rounded-t-2xl" />
                      <p className="text-xs text-white opacity-60 px-3 py-1.5">Photo uploaded</p>
                    </div>
                  ) : (
                    <div className="bg-[#000000] text-white px-4 py-3 rounded-2xl rounded-tr-sm shadow-sm text-sm leading-relaxed whitespace-pre-line">
                      {msg.text}
                    </div>
                  )}
                </UserBubble>
              );
            }

            // Bot message
            if (msg.type === 'analysis') {
              const cond = msg.condition!;
              const pv = msg.photoVerification ?? 'passed';
              const photoRejected = pv !== 'passed';
              const suitabilityLabel = photoRejected
                ? 'Resend photo required'
                : msg.suitable
                  ? 'Suitable for donation'
                  : 'Not suitable';
              const headline = photoRejected
                ? pv === 'wrong_item_for_category'
                  ? 'Wrong item for your category'
                  : 'Not a donation-item photo'
                : 'AI photo screening';
              return (
                <BotBubble key={msg.id}>
                  <div
                    className={`rounded-2xl rounded-tl-sm p-4 shadow-sm w-full min-w-[280px] border-2 ${
                      photoRejected ? 'bg-amber-50 border-amber-200' : 'bg-white border-[#e5e5e5]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Brain className="w-4 h-4 text-[#da1a32]" />
                      <span className="text-sm font-medium text-[#000000]">{headline}</span>
                    </div>
                    {msg.visibleSummary ? (
                      <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                        <span className="font-medium text-[#000000]">What we see: </span>
                        {msg.visibleSummary}
                      </p>
                    ) : null}
                    <div className="overflow-x-auto rounded-lg border border-[#e5e5e5] bg-white">
                      <table className="w-full text-xs">
                        <tbody>
                          {[
                            ['Declared donation', detectedItem],
                            ['Detected category', msg.detectedCategory || '—'],
                            ['Photo relevance', pv === 'not_a_donation_photo' ? 'Failed' : 'Passed'],
                            ['Category match', pv === 'wrong_item_for_category' ? 'Failed' : 'Passed'],
                            ['Condition', cond],
                            ['Suitability', suitabilityLabel],
                          ].map(([k, v]) => (
                            <tr key={k} className="border-b border-[#edf2f4] last:border-b-0">
                              <th className="w-40 bg-[#fafafa] px-2.5 py-2 text-left font-semibold text-gray-600">{k}</th>
                              <td className="px-2.5 py-2 text-[#000000]">{v}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {msg.keyDetails?.length ? (
                      <div className="rounded-lg border border-[#e5e5e5] bg-white/70 px-3 py-2 text-xs text-gray-700">
                        <p className="mb-1 font-semibold text-gray-600">Detected details</p>
                        <ul className="list-disc space-y-0.5 pl-4">
                          {msg.keyDetails.map((d, i) => (
                            <li key={`${msg.id}-k-${i}`}>{d}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {photoRejected ? (
                      <div className="rounded-lg border border-amber-200 bg-white/80 px-3 py-2 text-xs text-amber-950 leading-relaxed">
                        This image does not pass screening. Please queue a new photo of your actual donation item and
                        press <strong>Send</strong> again.
                      </div>
                    ) : null}
                  </div>
                </BotBubble>
              );
            }

            return (
              <BotBubble key={msg.id}>
                <div className="space-y-3">
                  {msg.source ? (
                    <div className="text-[10px] text-gray-500">
                      Source:{' '}
                      <span className="rounded-full border border-[#e5e5e5] bg-white px-2 py-0.5 font-medium text-[#000000]">
                        {msg.source === 'glm' ? 'Z.AI GLM' : 'Fallback'}
                      </span>
                      {msg.source === 'fallback' && msg.sourceReason ? (
                        <span className="ml-2 text-amber-700">
                          ({humanizeSourceReason(msg.sourceReason)})
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="bg-white border border-[#e5e5e5] text-[#000000] px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm text-sm leading-relaxed whitespace-pre-line">
                    {msg.text}
                  </div>
                  {msg.matchedAgents && msg.matchedAgents.length > 0 && msg.id === latestBotTextMessageId ? (
                    <div className="bg-white border border-[#e5e5e5] rounded-2xl rounded-tl-sm shadow-sm p-3 text-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="w-4 h-4 text-[#da1a32] flex-shrink-0" />
                        <span className="font-semibold text-[#000000] text-xs uppercase tracking-wide">
                          Matched donation agents
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {msg.matchedAgents.map((r) => (
                          <MatchedAgentChatCard key={`${msg.id}-${r.ngoId}`} r={r} />
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </BotBubble>
            );
          })}

          {isTyping && (
            <BotBubble>
              <div className="bg-white border border-[#e5e5e5] rounded-2xl rounded-tl-sm shadow-sm">
                <TypingDots />
              </div>
            </BotBubble>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="flex-shrink-0 px-4 py-3 bg-white border-t border-[#e5e5e5]">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isRecording
                  ? 'Listening...'
                  : stage === 'result_suitable' || stage === 'result_unsuitable'
                    ? 'Start a new chat to donate again'
                    : stage === 'awaiting_delivery_choice'
                      ? 'Choose a delivery option below to save & show on Tracking'
                      : 'Type your message…'
              }
              disabled={
                stage === 'result_suitable' ||
                stage === 'awaiting_delivery_choice' ||
                stage === 'result_unsuitable' ||
                stage === 'analyzing' ||
                isRecording
              }
              className="flex-1 px-4 py-2.5 border-2 border-[#e5e5e5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleVoiceInput}
              disabled={
                stage === 'result_suitable' ||
                stage === 'awaiting_delivery_choice' ||
                stage === 'result_unsuitable' ||
                stage === 'analyzing'
              }
              className={`w-10 h-10 flex items-center justify-center rounded-xl border-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 ${
                isRecording
                  ? 'border-[#da1a32] bg-[#da1a32] text-white animate-pulse'
                  : 'border-[#e5e5e5] text-gray-400 hover:border-[#da1a32] hover:text-[#da1a32]'
              }`}
              title={isRecording ? 'Click to stop recording' : 'Voice input (optional - typing also works)'}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              onClick={() => void handleSend()}
              disabled={
                !inputText.trim() ||
                stage === 'result_suitable' ||
                stage === 'awaiting_delivery_choice' ||
                stage === 'result_unsuitable' ||
                stage === 'analyzing' ||
                isTyping
              }
              className="w-10 h-10 bg-[#da1a32] text-white rounded-xl flex items-center justify-center hover:bg-[#b01528] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 shadow-sm"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          {isRecording && (
            <p className="text-xs text-[#da1a32] mt-1.5 ml-12 animate-pulse">🎤 Listening... Speak now</p>
          )}
          {micPermissionError && !micPermissionError.includes('Permission denied') && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#da1a32] flex-shrink-0" />
                <p className="text-xs text-[#da1a32] leading-relaxed">{micPermissionError}</p>
              </div>
              <button
                onClick={() => setMicPermissionError(null)}
                className="text-[#da1a32] hover:text-[#b01528] flex-shrink-0"
                title="Dismiss"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
          </div>
        </div>
      </div>

      {/* Allocation Results (shown below chat when suitable) */}
      {(stage === 'result_suitable' || stage === 'awaiting_delivery_choice') && (
        <div className="mt-6 space-y-5">
          {planLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-[#edf2f4] border border-[#e5e5e5] rounded-xl px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-[#da1a32]" />
              Z.AI GLM is extracting intent, checking NGO demand, and selecting the best single organization…
            </div>
          )}

          {glmPlan && (glmPlan.donorIntent || glmPlan.ngoDemandCheck || glmPlan.urgencyEvaluation) && (
            <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-5 space-y-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className="font-semibold text-[#000000]">Structured plan</span>
                <span className="rounded-full bg-[#edf2f4] px-2 py-0.5 border border-[#e5e5e5]">
                  {glmPlan.source === 'glm' ? `Z.AI · ${glmPlan.model}` : 'Fallback engine'}
                </span>
              </div>
              {glmPlan.donorIntent ? (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Donor intent</h3>
                  <p className="text-sm text-[#000000] leading-relaxed">{glmPlan.donorIntent}</p>
                </div>
              ) : null}
              {glmPlan.ngoDemandCheck ? (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">NGO demand check</h3>
                  <p className="text-sm text-[#000000] leading-relaxed">{glmPlan.ngoDemandCheck}</p>
                </div>
              ) : null}
              {glmPlan.urgencyEvaluation ? (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Urgency evaluation</h3>
                  <p className="text-sm text-[#000000] leading-relaxed">{glmPlan.urgencyEvaluation}</p>
                </div>
              ) : null}
              {glmPlan.planSummary ? (
                <p className="text-sm font-medium text-[#da1a32] border-t border-[#e5e5e5] pt-3">{glmPlan.planSummary}</p>
              ) : null}
            </div>
          )}

          {/* Receiver Cards */}
          <div>
            <h2 className="text-xl font-bold text-[#000000] mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#da1a32]" />
              AI-Recommended Organization
            </h2>
            <div className="space-y-4">
              {displayReceivers.map((r, i) => (
                <div
                  key={r.ngoId}
                  className={`bg-white rounded-2xl p-6 border-2 shadow-sm ${i === 0 ? 'border-[#da1a32]' : 'border-[#e5e5e5]'}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-[#da1a32] rounded-xl flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-lg font-bold text-[#000000]">{r.name}</h3>
                          <span className="px-2 py-0.5 bg-[#edf2f4] text-[#000000] text-xs rounded-full border border-[#e5e5e5]">AI Matched</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full border font-medium ${r.urgency === 'High' ? 'bg-red-50 text-[#da1a32] border-red-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
                            {r.urgency} Priority
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> {r.location}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-semibold rounded-full border border-[#e5e5e5] bg-[#edf2f4] px-2 py-1 text-[#000000]">
                        Recommended
                      </div>
                    </div>
                  </div>

                  {/* AI Explanation Panel */}
                  <div className="bg-[#edf2f4] rounded-xl p-4 border border-[#e5e5e5]">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-4 h-4 text-[#da1a32]" />
                      <span className="text-sm font-medium text-[#000000]">Allocated to {r.name} because:</span>
                    </div>
                    <ul className="space-y-1">
                      {r.reason.map((point, j) => (
                        <li key={j} className="text-sm text-gray-600 flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                          {point}
                        </li>
                      ))}
                    </ul>
                    <VisualReasoningPanel r={r} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Impact preview before confirmation */}
          <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Scale className="w-4 h-4 text-[#da1a32]" />
              <h3 className="text-sm font-bold text-[#000000]">See your impact before donating</h3>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-[#e5e5e5] bg-[#edf2f4]/50 p-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">People helped</p>
                <p className="text-xl font-bold text-[#da1a32]">
                  ~{displayReceivers.reduce((s, r) => s + Math.max(1, Math.round(r.allocation / 10)), 0)}
                </p>
                <p className="text-[10px] text-gray-500">Illustrative estimate</p>
              </div>
              <div className="rounded-xl border border-[#e5e5e5] bg-[#edf2f4]/50 p-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Organization selected</p>
                <p className="text-xl font-bold text-[#000000]">1</p>
                <p className="text-[10px] text-gray-500">Best-fit recommendation</p>
              </div>
              <div className="rounded-xl border border-[#e5e5e5] bg-[#edf2f4]/50 p-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Urgent cases resolved</p>
                <p className="text-xl font-bold text-[#000000]">
                  {displayReceivers.filter((r) => r.urgency === 'High').length}
                </p>
                <p className="text-[10px] text-gray-500">High-priority partners covered</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-3 leading-relaxed">
              Impact preview is based on current item-condition fit and allocation across matched NGOs.
            </p>
          </div>

          {!donationAccepted ? (
            <button
              type="button"
              onClick={() => {
                const ngo = displayReceivers[0];
                setDonationAccepted(true);
                setStage('awaiting_delivery_choice');
                addBotMessage(
                  `Great choice. I will route this donation to **${ngo?.name ?? 'the recommended organization'}**.\n\nPlease choose delivery method:\n1) Drop off yourself\n2) Our logistics partner pickup`,
                );
              }}
              className="w-full bg-[#da1a32] text-white py-3.5 rounded-xl hover:bg-[#b01528] transition-all shadow-lg font-medium flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              Accept Organization & Continue
            </button>
          ) : (
            <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Truck className="w-4 h-4 text-[#da1a32]" />
                <h3 className="text-sm font-bold text-[#000000]">Choose delivery method</h3>
              </div>
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-950 leading-relaxed">
                <strong className="font-semibold">Tracking updates here:</strong> your donation is saved to the database only after you tap{' '}
                <strong>Drop off yourself</strong> or <strong>Logistics partner pickup</strong>. Then it appears on{' '}
                <strong>Your Impact Journey</strong> (Tracking). Chat messages alone do not create the donation record.
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={confirmingDonation}
                  onClick={() => {
                    setDeliveryChoice('self_dropoff');
                    addBotMessage(
                      'You selected **Drop off yourself**. I will provide partner location and handoff steps next.',
                    );
                    void submitConfirmedDonation('self_dropoff');
                  }}
                  className={`rounded-xl border-2 px-4 py-3 text-sm font-medium text-left transition-all ${
                    deliveryChoice === 'self_dropoff'
                      ? 'border-[#da1a32] bg-red-50 text-[#da1a32]'
                      : 'border-[#e5e5e5] hover:bg-[#edf2f4]'
                  }`}
                >
                  Drop off yourself
                </button>
                <button
                  type="button"
                  disabled={confirmingDonation}
                  onClick={() => {
                    setDeliveryChoice('partner_logistics');
                    addBotMessage(
                      'You selected **Logistics partner pickup**. I will proceed with pickup scheduling details.',
                    );
                    void submitConfirmedDonation('partner_logistics');
                  }}
                  className={`rounded-xl border-2 px-4 py-3 text-sm font-medium text-left transition-all ${
                    deliveryChoice === 'partner_logistics'
                      ? 'border-[#da1a32] bg-red-50 text-[#da1a32]'
                      : 'border-[#e5e5e5] hover:bg-[#edf2f4]'
                  }`}
                >
                  Logistics partner pickup
                </button>
              </div>
              {confirmingDonation ? (
                <p className="mt-3 text-xs text-gray-600">Submitting donation workflow...</p>
              ) : null}
              {confirmError ? (
                <p className="mt-3 text-xs text-[#da1a32]">{confirmError}</p>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Not Suitable Result */}
      {stage === 'result_unsuitable' && (
        <div className="mt-6 bg-red-50 border-2 border-red-100 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#da1a32] rounded-xl flex items-center justify-center flex-shrink-0">
              <XCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#da1a32] mb-1">Item Not Suitable for Donation</h3>
              <p className="text-sm text-red-700 mb-3">
                This item is not suitable for donation because it is damaged or unusable. Receiving organisations require items in at least fair condition to ensure safety and dignity for recipients.
              </p>
              <div className="flex items-start gap-2 bg-white border border-red-100 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-[#da1a32] mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-600">
                  Please consider donating items that are in <strong>Good</strong> or <strong>Worn</strong> condition. Even gently used items can make a huge difference!
                </p>
              </div>
              <button
                onClick={() => void handleReset()}
                className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-[#000000] text-white rounded-xl text-sm font-medium hover:bg-[#da1a32] transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Try Another Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
