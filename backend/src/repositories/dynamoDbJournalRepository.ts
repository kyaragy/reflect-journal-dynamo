import { addDays, eachWeekOfInterval, endOfMonth, endOfWeek, format, parseISO, startOfMonth } from 'date-fns';
import type {
  Card,
  CreateCardInput,
  Day,
  DayActivity,
  JournalSnapshot,
  MonthRecord,
  MonthlySummary,
  WeekRecord,
  WeeklySummary,
  YearRecord,
  YearlySummary,
} from '../../../src/domain/journal';
import { createCardStep, createEmptyTrigger, hasMeaningfulCardContent, normalizeCard, normalizeDay, normalizeSnapshot } from '../../../src/domain/journal';
import {
  createEmptyThinkingDayRecord,
  createEmptyThinkingWeekRecord,
  hasMeaningfulThinkingMemoContent,
  normalizeThinkingDayRecord,
  normalizeThinkingReflectionResult,
  normalizeThinkingQuestionResponse,
  normalizeThinkingWeekRecord,
  type CreateThinkingMemoCardInput,
  type ThinkingDayRecord,
  type ThinkingMonthRecord,
  type ThinkingWeekRecord,
  type ThinkingReflectionResult,
  type ThinkingMemoCard,
  type ThinkingQuestionResponse,
  type UpdateThinkingMemoCardInput,
  type UpsertThinkingQuestionResponseInput,
  type WeeklyReflectionResult,
  type WeeklyUserNote,
} from '../../../src/domain/thinkingReflection';
import {
  createEmptyTodoSnapshot,
  normalizeTodoLabel,
  normalizeTodoTask,
  pickTodoLabelColorByIndex,
  toDateKey,
  todayKey,
  type CreateTodoLabelInput,
  type CreateTodoTaskInput,
  type TodoLabel,
  type TodoSnapshot,
  type TodoTask,
  type UpdateTodoLabelInput,
  type UpdateTodoTaskInput,
} from '../../../src/domain/todo';
import { DynamoDbClient } from '../db/dynamoDbClient';
import { notFoundError, validationError } from '../libs/errors';
import type { JournalDataRepository } from './journalRepository';

type DayItem = {
  PK: string;
  SK: string;
  entityType: 'DAY';
  date: string;
  dailySummary: string;
  cards: Card[];
  activities: DayActivity[];
  createdAt: string;
  updatedAt: string;
};

type WeeklySummaryItem = {
  PK: string;
  SK: string;
  entityType: 'WEEKLY_SUMMARY';
  weekKey: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
};

type MonthlySummaryItem = {
  PK: string;
  SK: string;
  entityType: 'MONTHLY_SUMMARY';
  monthKey: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
};

type YearlySummaryItem = {
  PK: string;
  SK: string;
  entityType: 'YEARLY_SUMMARY';
  yearKey: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
};

type ThinkingDayItem = {
  PK: string;
  SK: string;
  entityType: 'THINKING_DAY';
  date: string;
  memoCards: ThinkingMemoCard[];
  thinkingReflection: ThinkingReflectionResult | null;
  questionResponses: ThinkingQuestionResponse[];
  createdAt: string;
  updatedAt: string;
};

type ThinkingWeekItem = {
  PK: string;
  SK: string;
  entityType: 'THINKING_WEEK';
  weekStart: string;
  weekEnd: string;
  reflection: WeeklyReflectionResult | null;
  userNote: WeeklyUserNote | null;
  updatedAt: string;
};

type TodoTaskItem = {
  PK: string;
  SK: string;
  entityType: 'TODO_TASK';
  task: TodoTask;
  updatedAt: string;
};

type TodoLabelItem = {
  PK: string;
  SK: string;
  entityType: 'TODO_LABEL';
  label: TodoLabel;
  updatedAt: string;
};

type JournalItem =
  | DayItem
  | WeeklySummaryItem
  | MonthlySummaryItem
  | YearlySummaryItem
  | ThinkingDayItem
  | ThinkingWeekItem
  | TodoTaskItem
  | TodoLabelItem;

const toUserPk = (userId: string) => `USER#${userId}`;
const toDaySk = (date: string) => `DAY#${date}`;
const toWeekSk = (weekKey: string) => `WEEK#${weekKey}`;
const toMonthSk = (monthKey: string) => `MONTH#${monthKey}`;
const toYearSk = (yearKey: string) => `YEAR#${yearKey}`;
const toThinkingDaySk = (date: string) => `THINKING_DAY#${date}`;
const toThinkingWeekSk = (weekStart: string) => `THINKING_WEEK#${weekStart}`;
const toTodoTaskSk = (taskId: string) => `TODO_TASK#${taskId}`;
const toTodoLabelSk = (labelId: string) => `TODO_LABEL#${labelId}`;

const toDayItem = (userId: string, day: Day): DayItem => ({
  PK: toUserPk(userId),
  SK: toDaySk(day.date),
  entityType: 'DAY',
  date: day.date,
  dailySummary: day.dailySummary,
  cards: day.cards,
  activities: day.activities,
  createdAt: day.createdAt,
  updatedAt: day.updatedAt,
});

const toDay = (item: DayItem): Day =>
  normalizeDay({
    date: item.date,
    dailySummary: item.dailySummary,
    cards: (item.cards ?? []).map((card) => normalizeCard(card)),
    activities: item.activities ?? [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  });

const toWeeklySummary = (item?: WeeklySummaryItem): WeeklySummary | undefined =>
  item
    ? {
        weekKey: item.weekKey,
        summary: item.summary,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }
    : undefined;

const toMonthlySummary = (item?: MonthlySummaryItem): MonthlySummary | undefined =>
  item
    ? {
        monthKey: item.monthKey,
        summary: item.summary,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }
    : undefined;

const toYearlySummary = (item?: YearlySummaryItem): YearlySummary | undefined =>
  item
    ? {
        yearKey: item.yearKey,
        summary: item.summary,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }
    : undefined;

const createEmptyDay = (date: string, now: string): Day => ({
  date,
  dailySummary: '',
  cards: [],
  activities: [],
  createdAt: now,
  updatedAt: now,
});

const toThinkingDayItem = (userId: string, day: ThinkingDayRecord): ThinkingDayItem => ({
  PK: toUserPk(userId),
  SK: toThinkingDaySk(day.date),
  entityType: 'THINKING_DAY',
  date: day.date,
  memoCards: day.memoCards,
  thinkingReflection: day.thinkingReflection,
  questionResponses: day.questionResponses,
  createdAt: day.createdAt,
  updatedAt: day.updatedAt,
});

const toThinkingDay = (item: ThinkingDayItem): ThinkingDayRecord =>
  normalizeThinkingDayRecord({
    date: item.date,
    memoCards: item.memoCards ?? [],
    thinkingReflection: item.thinkingReflection ?? null,
    questionResponses: item.questionResponses ?? [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  });

const toThinkingWeekItem = (userId: string, week: ThinkingWeekRecord): ThinkingWeekItem => ({
  PK: toUserPk(userId),
  SK: toThinkingWeekSk(week.weekStart),
  entityType: 'THINKING_WEEK',
  weekStart: week.weekStart,
  weekEnd: week.weekEnd,
  reflection: week.reflection,
  userNote: week.userNote,
  updatedAt: week.userNote?.updated_at ?? week.reflection?.importedAt ?? new Date().toISOString(),
});

const toThinkingWeek = (item: ThinkingWeekItem): ThinkingWeekRecord =>
  normalizeThinkingWeekRecord({
    weekStart: item.weekStart,
    weekEnd: item.weekEnd,
    reflection: item.reflection,
    userNote: item.userNote,
  });

const toTodoTaskItem = (userId: string, task: TodoTask): TodoTaskItem => ({
  PK: toUserPk(userId),
  SK: toTodoTaskSk(task.id),
  entityType: 'TODO_TASK',
  task: normalizeTodoTask(task),
  updatedAt: task.updatedAt,
});

const toTodoLabelItem = (userId: string, label: TodoLabel): TodoLabelItem => ({
  PK: toUserPk(userId),
  SK: toTodoLabelSk(label.id),
  entityType: 'TODO_LABEL',
  label: normalizeTodoLabel(label),
  updatedAt: label.updatedAt,
});

export class DynamoDbJournalRepository implements JournalDataRepository {
  constructor(private readonly client: DynamoDbClient) {}

  async getDay(userId: string, date: string) {
    const item = await this.client.getItem<DayItem>({
      PK: toUserPk(userId),
      SK: toDaySk(date),
    });
    return item ? toDay(item) : null;
  }

  async saveDay(userId: string, day: Day) {
    const normalizedDay = normalizeDay(day);
    await this.client.putItem(toDayItem(userId, normalizedDay));
    return normalizedDay;
  }

  async saveDailySummary(userId: string, date: string, summary: string) {
    const now = new Date().toISOString();
    const current = (await this.getDay(userId, date)) ?? createEmptyDay(date, now);
    const nextDay: Day = {
      ...current,
      dailySummary: summary,
      updatedAt: now,
    };

    await this.client.putItem(toDayItem(userId, nextDay));
    return nextDay;
  }

  async createCard(userId: string, date: string, input: CreateCardInput) {
    if (!hasMeaningfulCardContent(input)) {
      throw validationError('INVALID_REQUEST_BODY', 'Card must include trigger content or at least one step');
    }

    const now = new Date().toISOString();
    const day = (await this.getDay(userId, date)) ?? createEmptyDay(date, now);
    const card: Card = {
      id: crypto.randomUUID(),
      tag: input.tag,
      trigger: {
        type: input.trigger?.type ?? createEmptyTrigger().type,
        content: input.trigger?.content ?? '',
      },
      steps: (input.steps ?? []).map((step, index) => ({
        ...step,
        id: step.id || createCardStep(index + 1).id,
        order: index + 1,
      })),
      createdAt: now,
      updatedAt: now,
    };

    const nextDay: Day = {
      ...day,
      cards: [...day.cards, card],
      updatedAt: now,
    };

    await this.client.putItem(toDayItem(userId, nextDay));
    return card;
  }

  async updateCard(userId: string, date: string, cardId: string, input: Partial<CreateCardInput>) {
    const day = await this.getDay(userId, date);
    const existing = day?.cards.find((card) => card.id === cardId);
    if (!day || !existing) {
      throw notFoundError('Card not found', { date, cardId });
    }

    const updatedCard: Card = {
      ...existing,
      tag: input.tag ?? existing.tag,
      trigger: input.trigger
        ? {
            type: input.trigger.type,
            content: input.trigger.content,
          }
        : existing.trigger,
      steps: input.steps
        ? input.steps.map((step, index) => ({
            ...step,
            id: step.id || existing.steps[index]?.id || createCardStep(index + 1).id,
            order: index + 1,
          }))
        : existing.steps,
      updatedAt: new Date().toISOString(),
    };

    if (!hasMeaningfulCardContent(updatedCard)) {
      throw validationError('INVALID_REQUEST_BODY', 'Card must include trigger content or at least one step');
    }

    const nextDay: Day = {
      ...day,
      updatedAt: updatedCard.updatedAt,
      cards: day.cards.map((card) => (card.id === cardId ? updatedCard : card)),
    };

    await this.client.putItem(toDayItem(userId, nextDay));
    return updatedCard;
  }

  async deleteCard(userId: string, date: string, cardId: string) {
    const day = await this.getDay(userId, date);
    if (!day?.cards.some((card) => card.id === cardId)) {
      throw notFoundError('Card not found', { date, cardId });
    }

    await this.client.putItem(
      toDayItem(userId, {
        ...day,
        updatedAt: new Date().toISOString(),
        cards: day.cards.filter((card) => card.id !== cardId),
      })
    );
  }

  async getWeek(userId: string, weekKey: string): Promise<WeekRecord> {
    const endDate = format(endOfWeek(parseISO(weekKey), { weekStartsOn: 0 }), 'yyyy-MM-dd');
    const [days, weeklySummaryItem] = await Promise.all([
      this.client.queryBetween<DayItem>(toUserPk(userId), toDaySk(weekKey), toDaySk(endDate)),
      this.client.getItem<WeeklySummaryItem>({
        PK: toUserPk(userId),
        SK: toWeekSk(weekKey),
      }),
    ]);

    return {
      weekKey,
      days: days.map(toDay),
      summary: toWeeklySummary(weeklySummaryItem),
    };
  }

  async saveWeekSummary(userId: string, weekKey: string, summary: string): Promise<WeekRecord> {
    const now = new Date().toISOString();
    const existing = await this.client.getItem<WeeklySummaryItem>({
      PK: toUserPk(userId),
      SK: toWeekSk(weekKey),
    });

    await this.client.putItem({
      PK: toUserPk(userId),
      SK: toWeekSk(weekKey),
      entityType: 'WEEKLY_SUMMARY',
      weekKey,
      summary,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    } satisfies WeeklySummaryItem);

    return this.getWeek(userId, weekKey);
  }

  async getMonth(userId: string, monthKey: string): Promise<MonthRecord> {
    const pk = toUserPk(userId);
    const startDate = parseISO(`${monthKey}-01`);
    const endDate = endOfMonth(startDate);
    const weekKeys = eachWeekOfInterval(
      {
        start: startDate,
        end: endDate,
      },
      { weekStartsOn: 0 }
    ).map((date) => format(date, 'yyyy-MM-dd'));

    const [days, monthSummaryItem, weeklySummaryItems] = await Promise.all([
      this.client.queryByPrefix<DayItem>(pk, `DAY#${monthKey}`),
      this.client.getItem<MonthlySummaryItem>({
        PK: pk,
        SK: toMonthSk(monthKey),
      }),
      this.client.batchGetItems<WeeklySummaryItem>(
        weekKeys.map((weekKey) => ({
          PK: pk,
          SK: toWeekSk(weekKey),
        }))
      ),
    ]);

    return {
      monthKey,
      days: days.map(toDay),
      weeklySummaries: weeklySummaryItems
        .map((item) => toWeeklySummary(item))
        .filter((item): item is WeeklySummary => Boolean(item))
        .sort((left, right) => left.weekKey.localeCompare(right.weekKey)),
      summary: toMonthlySummary(monthSummaryItem),
    };
  }

  async saveMonthSummary(userId: string, monthKey: string, summary: string): Promise<MonthRecord> {
    const now = new Date().toISOString();
    const existing = await this.client.getItem<MonthlySummaryItem>({
      PK: toUserPk(userId),
      SK: toMonthSk(monthKey),
    });

    await this.client.putItem({
      PK: toUserPk(userId),
      SK: toMonthSk(monthKey),
      entityType: 'MONTHLY_SUMMARY',
      monthKey,
      summary,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    } satisfies MonthlySummaryItem);

    return this.getMonth(userId, monthKey);
  }

  async getYear(userId: string, yearKey: string): Promise<YearRecord> {
    const [monthlySummaryItems, yearlySummaryItem] = await Promise.all([
      this.client.queryByPrefix<MonthlySummaryItem>(toUserPk(userId), `MONTH#${yearKey}`),
      this.client.getItem<YearlySummaryItem>({
        PK: toUserPk(userId),
        SK: toYearSk(yearKey),
      }),
    ]);

    return {
      yearKey,
      monthlySummaries: monthlySummaryItems
        .map((item) => toMonthlySummary(item))
        .filter((item): item is MonthlySummary => Boolean(item))
        .sort((left, right) => left.monthKey.localeCompare(right.monthKey)),
      summary: toYearlySummary(yearlySummaryItem),
    };
  }

  async saveYearSummary(userId: string, yearKey: string, summary: string): Promise<YearRecord> {
    const now = new Date().toISOString();
    const existing = await this.client.getItem<YearlySummaryItem>({
      PK: toUserPk(userId),
      SK: toYearSk(yearKey),
    });

    await this.client.putItem({
      PK: toUserPk(userId),
      SK: toYearSk(yearKey),
      entityType: 'YEARLY_SUMMARY',
      yearKey,
      summary,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    } satisfies YearlySummaryItem);

    return this.getYear(userId, yearKey);
  }

  async getThinkingDay(userId: string, date: string) {
    const item = await this.client.getItem<ThinkingDayItem>({
      PK: toUserPk(userId),
      SK: toThinkingDaySk(date),
    });

    return item ? toThinkingDay(item) : null;
  }

  async getThinkingMonth(userId: string, monthKey: string): Promise<ThinkingMonthRecord> {
    const items = await this.client.queryByPrefix<ThinkingDayItem>(toUserPk(userId), `THINKING_DAY#${monthKey}`);
    return {
      monthKey,
      days: items.map(toThinkingDay).sort((left, right) => left.date.localeCompare(right.date)),
    };
  }

  async getThinkingWeek(userId: string, weekStart: string): Promise<ThinkingWeekRecord> {
    const item = await this.client.getItem<ThinkingWeekItem>({
      PK: toUserPk(userId),
      SK: toThinkingWeekSk(weekStart),
    });
    const weekEnd = format(addDays(parseISO(weekStart), 6), 'yyyy-MM-dd');
    return item ? toThinkingWeek(item) : createEmptyThinkingWeekRecord(weekStart, weekEnd);
  }

  async createThinkingMemoCard(userId: string, date: string, input: CreateThinkingMemoCardInput) {
    if (!hasMeaningfulThinkingMemoContent(input)) {
      throw validationError('INVALID_REQUEST_BODY', 'Memo card must include both trigger and body');
    }

    const now = new Date().toISOString();
    const current = (await this.getThinkingDay(userId, date)) ?? createEmptyThinkingDayRecord(date, now);
    const nextDay: ThinkingDayRecord = {
      ...current,
      memoCards: [
        ...current.memoCards,
        {
          id: crypto.randomUUID(),
          trigger: input.trigger.trim(),
          body: input.body.trim(),
          createdAt: now,
          updatedAt: now,
        },
      ],
      updatedAt: now,
    };

    await this.client.putItem(toThinkingDayItem(userId, nextDay));
    return nextDay;
  }

  async updateThinkingMemoCard(userId: string, date: string, memoCardId: string, input: UpdateThinkingMemoCardInput) {
    if (!hasMeaningfulThinkingMemoContent(input)) {
      throw validationError('INVALID_REQUEST_BODY', 'Memo card must include both trigger and body');
    }

    const current = await this.getThinkingDay(userId, date);
    if (!current?.memoCards.some((item) => item.id === memoCardId)) {
      throw notFoundError('Thinking memo card not found', { date, memoCardId });
    }

    const now = new Date().toISOString();
    const nextDay: ThinkingDayRecord = {
      ...current,
      memoCards: current.memoCards.map((item) =>
        item.id === memoCardId
          ? {
              ...item,
              trigger: input.trigger.trim(),
              body: input.body.trim(),
              updatedAt: now,
            }
          : item
      ),
      updatedAt: now,
    };

    await this.client.putItem(toThinkingDayItem(userId, nextDay));
    return nextDay;
  }

  async deleteThinkingMemoCard(userId: string, date: string, memoCardId: string) {
    const current = await this.getThinkingDay(userId, date);
    if (!current?.memoCards.some((item) => item.id === memoCardId)) {
      throw notFoundError('Thinking memo card not found', { date, memoCardId });
    }

    const nextDay: ThinkingDayRecord = {
      ...current,
      memoCards: current.memoCards.filter((item) => item.id !== memoCardId),
      updatedAt: new Date().toISOString(),
    };

    await this.client.putItem(toThinkingDayItem(userId, nextDay));
  }

  async saveThinkingReflection(userId: string, date: string, reflection: ThinkingReflectionResult) {
    const now = new Date().toISOString();
    const current = (await this.getThinkingDay(userId, date)) ?? createEmptyThinkingDayRecord(date, now);
    const nextDay: ThinkingDayRecord = {
      ...current,
      thinkingReflection: normalizeThinkingReflectionResult(reflection),
      updatedAt: now,
    };

    await this.client.putItem(toThinkingDayItem(userId, nextDay));
    return nextDay;
  }

  async saveThinkingQuestionResponses(userId: string, date: string, questionResponses: UpsertThinkingQuestionResponseInput[]) {
    const now = new Date().toISOString();
    const current = (await this.getThinkingDay(userId, date)) ?? createEmptyThinkingDayRecord(date, now);
    const previousByQuestion = new Map(current.questionResponses.map((item) => [item.question, item]));
    const nextDay: ThinkingDayRecord = {
      ...current,
      questionResponses: questionResponses
        .filter((item) => item.question.trim().length > 0)
        .map((item) =>
          normalizeThinkingQuestionResponse({
            id: previousByQuestion.get(item.question)?.id ?? crypto.randomUUID(),
            question: item.question,
            response: item.response,
            createdAt: previousByQuestion.get(item.question)?.createdAt ?? now,
            updatedAt: now,
          })
        ),
      updatedAt: now,
    };

    await this.client.putItem(toThinkingDayItem(userId, nextDay));
    return nextDay;
  }

  async saveWeeklyReflection(userId: string, weekStart: string, reflection: WeeklyReflectionResult) {
    const current = await this.getThinkingWeek(userId, weekStart);
    const nextWeek: ThinkingWeekRecord = {
      ...current,
      reflection,
    };
    await this.client.putItem(toThinkingWeekItem(userId, nextWeek));
    return nextWeek;
  }

  async saveWeeklyUserNote(userId: string, weekStart: string, userNote: WeeklyUserNote) {
    const current = await this.getThinkingWeek(userId, weekStart);
    const nextWeek: ThinkingWeekRecord = {
      ...current,
      userNote,
    };
    await this.client.putItem(toThinkingWeekItem(userId, nextWeek));
    return nextWeek;
  }

  async getTodoSnapshot(userId: string, from: string, to: string): Promise<TodoSnapshot> {
    const pk = toUserPk(userId);
    const [taskItems, labelItems] = await Promise.all([
      this.client.queryByPrefix<TodoTaskItem>(pk, 'TODO_TASK#'),
      this.client.queryByPrefix<TodoLabelItem>(pk, 'TODO_LABEL#'),
    ]);

    return {
      ...createEmptyTodoSnapshot(),
      tasks: taskItems
        .map((item) => normalizeTodoTask(item.task))
        .filter((task) => task.scheduledDate >= from && task.scheduledDate <= to)
        .sort((left, right) => left.sortOrder - right.sortOrder),
      labels: labelItems.map((item) => normalizeTodoLabel(item.label)).sort((left, right) => left.name.localeCompare(right.name, 'ja')),
    };
  }

  async createTodoTask(userId: string, input: CreateTodoTaskInput): Promise<TodoTask> {
    const nowDate = new Date();
    const now = nowDate.toISOString();
    const existingTasks = await this.client.queryByPrefix<TodoTaskItem>(toUserPk(userId), 'TODO_TASK#');
    const task = normalizeTodoTask({
      id: crypto.randomUUID(),
      title: input.title.trim(),
      description: input.description ?? '',
      registeredDate: toDateKey(nowDate),
      scheduledDate: input.scheduledDate || todayKey(),
      dueDate: input.dueDate ?? null,
      sortOrder: existingTasks.reduce((maxOrder, current) => Math.max(maxOrder, current.task.sortOrder), -1) + 1,
      labelIds: input.labelIds ?? [],
      status: 'open',
      completedDate: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    await this.client.putItem(toTodoTaskItem(userId, task));
    return task;
  }

  async updateTodoTask(userId: string, taskId: string, input: UpdateTodoTaskInput): Promise<TodoTask | null> {
    const currentItem = await this.client.getItem<TodoTaskItem>({
      PK: toUserPk(userId),
      SK: toTodoTaskSk(taskId),
    });
    if (!currentItem) {
      return null;
    }

    const current = normalizeTodoTask(currentItem.task);
    const status = input.status ?? current.status;
    const completedAt = status === 'completed' ? input.completedAt ?? current.completedAt ?? new Date().toISOString() : null;
    const updated = normalizeTodoTask({
      ...current,
      ...input,
      title: input.title === undefined ? current.title : input.title.trim(),
      description: input.description === undefined ? current.description : input.description,
      dueDate: input.dueDate === undefined ? current.dueDate : input.dueDate,
      status,
      completedDate: completedAt ? toDateKey(new Date(completedAt)) : null,
      completedAt,
      updatedAt: new Date().toISOString(),
    });

    await this.client.putItem(toTodoTaskItem(userId, updated));
    return updated;
  }

  async reorderTodoTasks(userId: string, taskIds: string[]): Promise<void> {
    const pk = toUserPk(userId);
    const tasks = await this.client.queryByPrefix<TodoTaskItem>(pk, 'TODO_TASK#');
    const orderMap = new Map(taskIds.map((taskId, index) => [taskId, index]));
    const now = new Date().toISOString();

    await Promise.all(
      tasks.map(async (item) => {
        const nextOrder = orderMap.get(item.task.id);
        if (nextOrder === undefined) {
          return;
        }
        const nextTask = normalizeTodoTask({
          ...item.task,
          sortOrder: nextOrder,
          updatedAt: now,
        });
        await this.client.putItem(toTodoTaskItem(userId, nextTask));
      })
    );
  }

  async deleteTodoTask(userId: string, taskId: string): Promise<void> {
    await this.client.deleteItem({
      PK: toUserPk(userId),
      SK: toTodoTaskSk(taskId),
    });
  }

  async createTodoLabel(userId: string, input: CreateTodoLabelInput): Promise<TodoLabel> {
    const now = new Date().toISOString();
    const existingLabels = await this.client.queryByPrefix<TodoLabelItem>(toUserPk(userId), 'TODO_LABEL#');
    const nextColor = input.color ?? pickTodoLabelColorByIndex(existingLabels.length);
    const label = normalizeTodoLabel({
      id: crypto.randomUUID(),
      name: input.name.trim(),
      color: nextColor,
      createdAt: now,
      updatedAt: now,
    });
    await this.client.putItem(toTodoLabelItem(userId, label));
    return label;
  }

  async updateTodoLabel(userId: string, labelId: string, input: UpdateTodoLabelInput): Promise<TodoLabel | null> {
    const currentItem = await this.client.getItem<TodoLabelItem>({
      PK: toUserPk(userId),
      SK: toTodoLabelSk(labelId),
    });
    if (!currentItem) {
      return null;
    }
    const current = normalizeTodoLabel(currentItem.label);
    const updated = normalizeTodoLabel({
      ...current,
      ...input,
      name: input.name === undefined ? current.name : input.name.trim(),
      color: input.color === undefined ? current.color : input.color,
      updatedAt: new Date().toISOString(),
    });
    await this.client.putItem(toTodoLabelItem(userId, updated));
    return updated;
  }

  async deleteTodoLabel(userId: string, labelId: string): Promise<void> {
    const pk = toUserPk(userId);
    await this.client.deleteItem({
      PK: pk,
      SK: toTodoLabelSk(labelId),
    });

    const tasks = await this.client.queryByPrefix<TodoTaskItem>(pk, 'TODO_TASK#');
    await Promise.all(
      tasks.map(async (item) => {
        if (!item.task.labelIds.includes(labelId)) {
          return;
        }
        const nextTask = normalizeTodoTask({
          ...item.task,
          labelIds: item.task.labelIds.filter((currentLabelId) => currentLabelId !== labelId),
          updatedAt: new Date().toISOString(),
        });
        await this.client.putItem(toTodoTaskItem(userId, nextTask));
      })
    );
  }

  async importSnapshot(userId: string, snapshot: JournalSnapshot) {
    const pk = toUserPk(userId);
    const normalizedSnapshot = normalizeSnapshot(snapshot);
    const existingItems = await this.client.queryByPartition<JournalItem>(pk);

    await Promise.all(
      existingItems.map((item) =>
        this.client.deleteItem({
          PK: item.PK,
          SK: item.SK,
        })
      )
    );

    await Promise.all(normalizedSnapshot.days.map((day) => this.client.putItem(toDayItem(userId, day))));
    await Promise.all(
      normalizedSnapshot.weeklySummaries.map((summary) =>
        this.client.putItem({
          PK: pk,
          SK: toWeekSk(summary.weekKey),
          entityType: 'WEEKLY_SUMMARY',
          weekKey: summary.weekKey,
          summary: summary.summary,
          createdAt: summary.createdAt,
          updatedAt: summary.updatedAt,
        } satisfies WeeklySummaryItem)
      )
    );
    await Promise.all(
      normalizedSnapshot.monthlySummaries.map((summary) =>
        this.client.putItem({
          PK: pk,
          SK: toMonthSk(summary.monthKey),
          entityType: 'MONTHLY_SUMMARY',
          monthKey: summary.monthKey,
          summary: summary.summary,
          createdAt: summary.createdAt,
          updatedAt: summary.updatedAt,
        } satisfies MonthlySummaryItem)
      )
    );
    await Promise.all(
      normalizedSnapshot.yearlySummaries.map((summary) =>
        this.client.putItem({
          PK: pk,
          SK: toYearSk(summary.yearKey),
          entityType: 'YEARLY_SUMMARY',
          yearKey: summary.yearKey,
          summary: summary.summary,
          createdAt: summary.createdAt,
          updatedAt: summary.updatedAt,
        } satisfies YearlySummaryItem)
      )
    );

    return {
      days: normalizedSnapshot.days.sort((left, right) => left.date.localeCompare(right.date)),
      weeklySummaries: normalizedSnapshot.weeklySummaries.sort((left, right) => left.weekKey.localeCompare(right.weekKey)),
      monthlySummaries: normalizedSnapshot.monthlySummaries.sort((left, right) => left.monthKey.localeCompare(right.monthKey)),
      yearlySummaries: normalizedSnapshot.yearlySummaries.sort((left, right) => left.yearKey.localeCompare(right.yearKey)),
    };
  }
}
