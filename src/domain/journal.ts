export const journalCardTags = ['仕事', 'プライベート', '学習'] as const;

export type JournalCardTag = (typeof journalCardTags)[number];

export const triggerTypes = ['external', 'internal', 'physical'] as const;
export type TriggerType = (typeof triggerTypes)[number];

export const stepTypes = ['thought', 'emotion', 'action', 'body'] as const;
export type StepType = (typeof stepTypes)[number];

export type CardTrigger = {
  type: TriggerType;
  content: string;
};

export type CardStep = {
  id: string;
  order: number;
  type: StepType;
  content: string;
};

export type Card = {
  id: string;
  tag?: JournalCardTag;
  trigger: CardTrigger;
  steps: CardStep[];
  createdAt: string;
  updatedAt: string;
};

export const dayActivityKinds = ['event', 'todo'] as const;
export type DayActivityKind = (typeof dayActivityKinds)[number];

export const dayActivityStatuses = ['pending', 'done'] as const;
export type DayActivityStatus = (typeof dayActivityStatuses)[number];

export type DayActivity = {
  id: string;
  title: string;
  kind: DayActivityKind;
  status: DayActivityStatus;
  createdAt: string;
  updatedAt: string;
};

type LegacyCard = {
  id: string;
  tag?: JournalCardTag;
  fact?: string;
  thought?: string;
  emotion?: string;
  bodySensation?: string;
  createdAt: string;
  updatedAt: string;
};

export type Day = {
  date: string;
  cards: Card[];
  activities: DayActivity[];
  dailySummary: string;
  createdAt: string;
  updatedAt: string;
};

export type WeeklySummary = {
  weekKey: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
};

export type MonthlySummary = {
  monthKey: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
};

export type YearlySummary = {
  yearKey: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
};

export type WeekRecord = {
  weekKey: string;
  summary?: WeeklySummary;
  days: Day[];
};

export type MonthRecord = {
  monthKey: string;
  summary?: MonthlySummary;
  weeklySummaries: WeeklySummary[];
  days: Day[];
};

export type YearRecord = {
  yearKey: string;
  summary?: YearlySummary;
  monthlySummaries: MonthlySummary[];
};

export type JournalSnapshot = {
  days: Day[];
  weeklySummaries: WeeklySummary[];
  monthlySummaries: MonthlySummary[];
  yearlySummaries: YearlySummary[];
};

export type CreateCardInput = Omit<Card, 'id' | 'createdAt' | 'updatedAt'>;
export type CreateDayActivityInput = Omit<DayActivity, 'id' | 'createdAt' | 'updatedAt'>;

type CardContentLike = {
  trigger?: {
    content?: string;
  };
  steps?: Array<{
    content?: string;
  }>;
};

export const triggerTypeLabels: Record<TriggerType, string> = {
  external: '外部出来事',
  internal: '内部発生',
  physical: '身体状態',
};

export const stepTypeLabels: Record<StepType, string> = {
  thought: '思考',
  emotion: '感情',
  action: '行動',
  body: '身体反応',
};

export const dayActivityKindLabels: Record<DayActivityKind, string> = {
  event: 'イベント',
  todo: 'TODO',
};

export const dayActivityStatusLabels: Record<DayActivityStatus, string> = {
  pending: '未完',
  done: '完了',
};

export const createEmptyJournalSnapshot = (): JournalSnapshot => ({
  days: [],
  weeklySummaries: [],
  monthlySummaries: [],
  yearlySummaries: [],
});

export const createEmptyTrigger = (): CardTrigger => ({
  type: 'external',
  content: '',
});

export const createDayActivity = (input: CreateDayActivityInput): DayActivity => {
  const now = new Date().toISOString();

  return {
    id: globalThis.crypto?.randomUUID?.() ?? `activity-${Date.now()}`,
    title: input.title.trim(),
    kind: input.kind,
    status: input.status,
    createdAt: now,
    updatedAt: now,
  };
};

export const createCardStep = (order: number): CardStep => ({
  id: globalThis.crypto?.randomUUID?.() ?? `step-${Date.now()}-${order}`,
  order,
  type: 'thought',
  content: '',
});

export const isJournalCardTag = (value: unknown): value is JournalCardTag =>
  typeof value === 'string' && journalCardTags.includes(value as JournalCardTag);

export const isTriggerType = (value: unknown): value is TriggerType =>
  typeof value === 'string' && triggerTypes.includes(value as TriggerType);

export const isStepType = (value: unknown): value is StepType =>
  typeof value === 'string' && stepTypes.includes(value as StepType);

export const isDayActivityKind = (value: unknown): value is DayActivityKind =>
  typeof value === 'string' && dayActivityKinds.includes(value as DayActivityKind);

export const isDayActivityStatus = (value: unknown): value is DayActivityStatus =>
  typeof value === 'string' && dayActivityStatuses.includes(value as DayActivityStatus);

export const getTriggerTypeLabel = (type: TriggerType) => triggerTypeLabels[type];

export const getStepTypeLabel = (type: StepType) => stepTypeLabels[type];
export const getDayActivityKindLabel = (kind: DayActivityKind) => dayActivityKindLabels[kind];
export const getDayActivityStatusLabel = (status: DayActivityStatus) => dayActivityStatusLabels[status];

export const hasMeaningfulCardContent = (card: CardContentLike) =>
  Boolean(card.trigger?.content?.trim()) || Boolean(card.steps?.some((step) => step.content?.trim()));

export const normalizeCardSteps = (steps: CardStep[]): CardStep[] =>
  [...steps]
    .sort((left, right) => left.order - right.order)
    .map((step, index) => ({
      id: step.id || `step-${index + 1}`,
      order: index + 1,
      type: isStepType(step.type) ? step.type : 'thought',
      content: step.content ?? '',
    }));

export const normalizeDayActivities = (activities: DayActivity[]): DayActivity[] =>
  [...activities]
    .filter((activity) => typeof activity?.title === 'string' && activity.title.trim().length > 0)
    .map((activity, index) => ({
      id: activity.id || `activity-${index + 1}`,
      title: activity.title.trim(),
      kind: isDayActivityKind(activity.kind) ? activity.kind : 'todo',
      status: isDayActivityStatus(activity.status) ? activity.status : 'pending',
      createdAt: activity.createdAt ?? new Date().toISOString(),
      updatedAt: activity.updatedAt ?? activity.createdAt ?? new Date().toISOString(),
    }));

export const isLegacyCard = (value: unknown): value is LegacyCard => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return 'fact' in value || 'thought' in value || 'emotion' in value || 'bodySensation' in value;
};

export const isCard = (value: unknown): value is Card => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<Card>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.updatedAt === 'string' &&
    Boolean(candidate.trigger) &&
    isTriggerType(candidate.trigger?.type) &&
    typeof candidate.trigger?.content === 'string' &&
    Array.isArray(candidate.steps)
  );
};

export const normalizeCard = (value: Card | LegacyCard): Card => {
  if (isCard(value)) {
    return {
      ...value,
      tag: isJournalCardTag(value.tag) ? value.tag : undefined,
      trigger: {
        type: isTriggerType(value.trigger.type) ? value.trigger.type : 'external',
        content: value.trigger.content ?? '',
      },
      steps: normalizeCardSteps(value.steps),
    };
  }

  const steps: CardStep[] = [];
  if (value.thought) {
    steps.push({
      id: `${value.id}-thought-1`,
      order: steps.length + 1,
      type: 'thought',
      content: value.thought,
    });
  }
  if (value.emotion) {
    steps.push({
      id: `${value.id}-emotion-1`,
      order: steps.length + 1,
      type: 'emotion',
      content: value.emotion,
    });
  }
  if (value.bodySensation) {
    steps.push({
      id: `${value.id}-body-1`,
      order: steps.length + 1,
      type: 'body',
      content: value.bodySensation,
    });
  }

  return {
    id: value.id,
    tag: isJournalCardTag(value.tag) ? value.tag : undefined,
    trigger: {
      type: 'external',
      content: value.fact ?? '',
    },
    steps,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
};

export const normalizeDay = (day: Day): Day => ({
  ...day,
  cards: day.cards.map((card) => normalizeCard(card)),
  activities: normalizeDayActivities(day.activities ?? []),
});

export const normalizeSnapshot = (snapshot: JournalSnapshot): JournalSnapshot => ({
  days: snapshot.days.map(normalizeDay),
  weeklySummaries: snapshot.weeklySummaries,
  monthlySummaries: snapshot.monthlySummaries,
  yearlySummaries: snapshot.yearlySummaries,
});
