import { randomUUID } from 'node:crypto';
import { addDays, format, parseISO } from 'date-fns';
import {
  createCardStep,
  createEmptyTrigger,
  createEmptyJournalSnapshot,
  hasMeaningfulCardContent,
  normalizeCard,
  normalizeDay,
  normalizeSnapshot,
  type Card,
  type CreateCardInput,
  type Day,
  type JournalSnapshot,
  type MonthlySummary,
  type WeekRecord,
  type WeeklySummary,
  type YearRecord,
  type YearlySummary,
  type MonthRecord,
} from '../../../src/domain/journal';
import {
  createEmptyThinkingDayRecord,
  createEmptyThinkingWeekRecord,
  hasMeaningfulThinkingMemoContent,
  normalizeThinkingDayRecord,
  normalizeThinkingReflectionResult,
  normalizeThinkingQuestionResponse,
  normalizeThinkingWeekRecord,
  replaceThinkingDay,
  type CreateThinkingMemoCardInput,
  type ThinkingDayRecord,
  type ThinkingMonthRecord,
  type ThinkingWeekRecord,
  type ThinkingReflectionResult,
  type UpdateThinkingMemoCardInput,
  type UpsertThinkingQuestionResponseInput,
  type WeeklyReflectionResult,
  type WeeklyUserNote,
} from '../../../src/domain/thinkingReflection';
import {
  createEmptyTodoSnapshot,
  normalizeTodoLabel,
  normalizeTodoSnapshot,
  normalizeTodoTask,
  todayKey,
  type CreateTodoLabelInput,
  type CreateTodoTaskInput,
  type TodoLabel,
  type TodoSnapshot,
  type TodoTask,
  type UpdateTodoLabelInput,
  type UpdateTodoTaskInput,
} from '../../../src/domain/todo';
import { notFoundError } from '../libs/errors';
import type { JournalDataRepository } from './journalRepository';
import { validationError } from '../libs/errors';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const replaceDay = (days: Day[], day: Day) =>
  [...days.filter((item) => item.date !== day.date), day].sort((left, right) => left.date.localeCompare(right.date));

const upsertWeeklySummary = (summaries: WeeklySummary[], weekKey: string, summary: string) => {
  const now = new Date().toISOString();
  const existing = summaries.find((item) => item.weekKey === weekKey);
  if (!existing) {
    return [...summaries, { weekKey, summary, createdAt: now, updatedAt: now }];
  }

  return summaries.map((item) => (item.weekKey === weekKey ? { ...item, summary, updatedAt: now } : item));
};

const upsertMonthlySummary = (summaries: MonthlySummary[], monthKey: string, summary: string) => {
  const now = new Date().toISOString();
  const existing = summaries.find((item) => item.monthKey === monthKey);
  if (!existing) {
    return [...summaries, { monthKey, summary, createdAt: now, updatedAt: now }];
  }

  return summaries.map((item) => (item.monthKey === monthKey ? { ...item, summary, updatedAt: now } : item));
};

const upsertYearlySummary = (summaries: YearlySummary[], yearKey: string, summary: string) => {
  const now = new Date().toISOString();
  const existing = summaries.find((item) => item.yearKey === yearKey);
  if (!existing) {
    return [...summaries, { yearKey, summary, createdAt: now, updatedAt: now }];
  }

  return summaries.map((item) => (item.yearKey === yearKey ? { ...item, summary, updatedAt: now } : item));
};

const sortSnapshot = (snapshot: JournalSnapshot): JournalSnapshot => ({
  days: [...snapshot.days].sort((left, right) => left.date.localeCompare(right.date)),
  weeklySummaries: [...snapshot.weeklySummaries].sort((left, right) => left.weekKey.localeCompare(right.weekKey)),
  monthlySummaries: [...snapshot.monthlySummaries].sort((left, right) => left.monthKey.localeCompare(right.monthKey)),
  yearlySummaries: [...snapshot.yearlySummaries].sort((left, right) => left.yearKey.localeCompare(right.yearKey)),
});

export class MemoryJournalRepository implements JournalDataRepository {
  private readonly snapshots = new Map<string, JournalSnapshot>();
  private readonly thinkingSnapshots = new Map<string, ThinkingDayRecord[]>();
  private readonly thinkingWeekSnapshots = new Map<string, ThinkingWeekRecord[]>();
  private readonly todoSnapshots = new Map<string, TodoSnapshot>();

  private getSnapshot(userId: string) {
    if (!this.snapshots.has(userId)) {
      this.snapshots.set(userId, createEmptyJournalSnapshot());
    }

    return this.snapshots.get(userId)!;
  }

  private setSnapshot(userId: string, snapshot: JournalSnapshot) {
    this.snapshots.set(userId, sortSnapshot(normalizeSnapshot(snapshot)));
  }

  private getThinkingSnapshot(userId: string) {
    if (!this.thinkingSnapshots.has(userId)) {
      this.thinkingSnapshots.set(userId, []);
    }

    return this.thinkingSnapshots.get(userId)!;
  }

  private setThinkingSnapshot(userId: string, days: ThinkingDayRecord[]) {
    this.thinkingSnapshots.set(
      userId,
      [...days].map(normalizeThinkingDayRecord).sort((left, right) => left.date.localeCompare(right.date))
    );
  }

  private getThinkingWeekSnapshot(userId: string) {
    if (!this.thinkingWeekSnapshots.has(userId)) {
      this.thinkingWeekSnapshots.set(userId, []);
    }

    return this.thinkingWeekSnapshots.get(userId)!;
  }

  private setThinkingWeekSnapshot(userId: string, weeks: ThinkingWeekRecord[]) {
    this.thinkingWeekSnapshots.set(
      userId,
      [...weeks].map(normalizeThinkingWeekRecord).sort((left, right) => left.weekStart.localeCompare(right.weekStart))
    );
  }

  private getTodoSnapshotState(userId: string) {
    if (!this.todoSnapshots.has(userId)) {
      this.todoSnapshots.set(userId, createEmptyTodoSnapshot());
    }
    return this.todoSnapshots.get(userId)!;
  }

  private setTodoSnapshotState(userId: string, snapshot: TodoSnapshot) {
    this.todoSnapshots.set(userId, normalizeTodoSnapshot(snapshot));
  }

  async getDay(userId: string, date: string) {
    const day = this.getSnapshot(userId).days.find((item) => item.date === date) ?? null;
    return day ? clone(normalizeDay(day)) : null;
  }

  async saveDay(userId: string, day: Day) {
    const nextDay = clone(day);
    const snapshot = this.getSnapshot(userId);
    this.setSnapshot(userId, {
      ...snapshot,
      days: replaceDay(snapshot.days, nextDay),
    });
    return clone(nextDay);
  }

  async saveDailySummary(userId: string, date: string, summary: string) {
    const snapshot = this.getSnapshot(userId);
    const current = snapshot.days.find((item) => item.date === date);
    const timestamp = new Date().toISOString();
    const nextDay: Day = current
      ? {
          ...current,
          dailySummary: summary,
          updatedAt: timestamp,
        }
      : {
          date,
          cards: [],
          activities: [],
          dailySummary: summary,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

    this.setSnapshot(userId, {
      ...snapshot,
      days: replaceDay(snapshot.days, nextDay),
    });
    return clone(nextDay);
  }

  async createCard(userId: string, date: string, input: CreateCardInput) {
    if (!hasMeaningfulCardContent(input)) {
      throw validationError('INVALID_REQUEST_BODY', 'Card must include trigger content or at least one step');
    }

    const snapshot = this.getSnapshot(userId);
    const timestamp = new Date().toISOString();
    const card: Card = {
      id: randomUUID(),
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
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const currentDay = snapshot.days.find((item) => item.date === date);
    const nextDay: Day = currentDay
      ? {
          ...currentDay,
          cards: [...currentDay.cards, card],
          updatedAt: timestamp,
        }
      : {
          date,
          cards: [card],
          activities: [],
          dailySummary: '',
          createdAt: timestamp,
          updatedAt: timestamp,
        };

    this.setSnapshot(userId, {
      ...snapshot,
      days: replaceDay(snapshot.days, nextDay),
    });

    return clone(card);
  }

  async updateCard(userId: string, date: string, cardId: string, input: Partial<CreateCardInput>) {
    const snapshot = this.getSnapshot(userId);
    const currentDay = snapshot.days.find((item) => item.date === date);
    const existing = currentDay?.cards.find((item) => item.id === cardId);
    if (!currentDay || !existing) {
      throw notFoundError('Card not found', { date, cardId });
    }

    const timestamp = new Date().toISOString();
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
      updatedAt: timestamp,
    };

    if (!hasMeaningfulCardContent(updatedCard)) {
      throw validationError('INVALID_REQUEST_BODY', 'Card must include trigger content or at least one step');
    }

    const nextDay: Day = {
      ...currentDay,
      updatedAt: timestamp,
      cards: currentDay.cards.map((item) => (item.id === cardId ? updatedCard : item)),
    };

    this.setSnapshot(userId, {
      ...snapshot,
      days: replaceDay(snapshot.days, nextDay),
    });

    return clone(normalizeCard(updatedCard));
  }

  async deleteCard(userId: string, date: string, cardId: string) {
    const snapshot = this.getSnapshot(userId);
    const currentDay = snapshot.days.find((item) => item.date === date);
    if (!currentDay?.cards.some((item) => item.id === cardId)) {
      throw notFoundError('Card not found', { date, cardId });
    }

    const timestamp = new Date().toISOString();
    const nextDay: Day = {
      ...currentDay,
      updatedAt: timestamp,
      cards: currentDay.cards.filter((item) => item.id !== cardId),
    };

    this.setSnapshot(userId, {
      ...snapshot,
      days: replaceDay(snapshot.days, nextDay),
    });
  }

  async getWeek(userId: string, weekKey: string): Promise<WeekRecord> {
    const snapshot = this.getSnapshot(userId);
    const days = Array.from({ length: 7 }, (_, index) => {
      const dayKey = format(addDays(parseISO(weekKey), index), 'yyyy-MM-dd');
      return snapshot.days.find((item) => item.date === dayKey);
    }).filter((day): day is Day => Boolean(day));

    return clone({
      weekKey,
      summary: snapshot.weeklySummaries.find((item) => item.weekKey === weekKey),
      days,
    });
  }

  async saveWeekSummary(userId: string, weekKey: string, summary: string): Promise<WeekRecord> {
    const snapshot = this.getSnapshot(userId);
    const nextSnapshot = {
      ...snapshot,
      weeklySummaries: upsertWeeklySummary(snapshot.weeklySummaries, weekKey, summary),
    };
    this.setSnapshot(userId, nextSnapshot);
    return this.getWeek(userId, weekKey);
  }

  async getMonth(userId: string, monthKey: string): Promise<MonthRecord> {
    const snapshot = this.getSnapshot(userId);
    return clone({
      monthKey,
      summary: snapshot.monthlySummaries.find((item) => item.monthKey === monthKey),
      weeklySummaries: snapshot.weeklySummaries.filter((item) => item.weekKey.startsWith(monthKey)),
      days: snapshot.days.filter((item) => item.date.startsWith(monthKey)),
    });
  }

  async saveMonthSummary(userId: string, monthKey: string, summary: string): Promise<MonthRecord> {
    const snapshot = this.getSnapshot(userId);
    const nextSnapshot = {
      ...snapshot,
      monthlySummaries: upsertMonthlySummary(snapshot.monthlySummaries, monthKey, summary),
    };
    this.setSnapshot(userId, nextSnapshot);
    return this.getMonth(userId, monthKey);
  }

  async getYear(userId: string, yearKey: string): Promise<YearRecord> {
    const snapshot = this.getSnapshot(userId);
    return clone({
      yearKey,
      summary: snapshot.yearlySummaries.find((item) => item.yearKey === yearKey),
      monthlySummaries: snapshot.monthlySummaries.filter((item) => item.monthKey.startsWith(yearKey)),
    });
  }

  async saveYearSummary(userId: string, yearKey: string, summary: string): Promise<YearRecord> {
    const snapshot = this.getSnapshot(userId);
    const nextSnapshot = {
      ...snapshot,
      yearlySummaries: upsertYearlySummary(snapshot.yearlySummaries, yearKey, summary),
    };
    this.setSnapshot(userId, nextSnapshot);
    return this.getYear(userId, yearKey);
  }

  async importSnapshot(userId: string, snapshot: JournalSnapshot) {
    this.setSnapshot(userId, clone(normalizeSnapshot(snapshot)));
    return clone(this.getSnapshot(userId));
  }

  async getThinkingDay(userId: string, date: string) {
    const day = this.getThinkingSnapshot(userId).find((item) => item.date === date) ?? null;
    return day ? clone(normalizeThinkingDayRecord(day)) : null;
  }

  async getThinkingMonth(userId: string, monthKey: string): Promise<ThinkingMonthRecord> {
    return {
      monthKey,
      days: clone(this.getThinkingSnapshot(userId).filter((item) => item.date.startsWith(monthKey))),
    };
  }

  async getThinkingWeek(userId: string, weekStart: string): Promise<ThinkingWeekRecord> {
    const weekEnd = format(addDays(parseISO(weekStart), 6), 'yyyy-MM-dd');
    const week = this.getThinkingWeekSnapshot(userId).find((item) => item.weekStart === weekStart);
    return week ? clone(week) : createEmptyThinkingWeekRecord(weekStart, weekEnd);
  }

  async createThinkingMemoCard(userId: string, date: string, input: CreateThinkingMemoCardInput) {
    if (!hasMeaningfulThinkingMemoContent(input)) {
      throw validationError('INVALID_REQUEST_BODY', 'Memo card must include both trigger and body');
    }

    const now = new Date().toISOString();
    const days = this.getThinkingSnapshot(userId);
    const current = days.find((item) => item.date === date) ?? createEmptyThinkingDayRecord(date, now);
    const nextDay: ThinkingDayRecord = {
      ...current,
      memoCards: [
        ...current.memoCards,
        {
          id: randomUUID(),
          trigger: input.trigger.trim(),
          body: input.body.trim(),
          createdAt: now,
          updatedAt: now,
        },
      ],
      updatedAt: now,
    };

    this.setThinkingSnapshot(userId, replaceThinkingDay(days, nextDay));
    return clone(nextDay);
  }

  async updateThinkingMemoCard(userId: string, date: string, memoCardId: string, input: UpdateThinkingMemoCardInput) {
    if (!hasMeaningfulThinkingMemoContent(input)) {
      throw validationError('INVALID_REQUEST_BODY', 'Memo card must include both trigger and body');
    }

    const now = new Date().toISOString();
    const days = this.getThinkingSnapshot(userId);
    const current = days.find((item) => item.date === date);
    if (!current?.memoCards.some((item) => item.id === memoCardId)) {
      throw notFoundError('Thinking memo card not found', { date, memoCardId });
    }

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

    this.setThinkingSnapshot(userId, replaceThinkingDay(days, nextDay));
    return clone(nextDay);
  }

  async deleteThinkingMemoCard(userId: string, date: string, memoCardId: string) {
    const days = this.getThinkingSnapshot(userId);
    const current = days.find((item) => item.date === date);
    if (!current?.memoCards.some((item) => item.id === memoCardId)) {
      throw notFoundError('Thinking memo card not found', { date, memoCardId });
    }

    const nextDay: ThinkingDayRecord = {
      ...current,
      memoCards: current.memoCards.filter((item) => item.id !== memoCardId),
      updatedAt: new Date().toISOString(),
    };

    this.setThinkingSnapshot(userId, replaceThinkingDay(days, nextDay));
  }

  async saveThinkingReflection(userId: string, date: string, reflection: ThinkingReflectionResult) {
    const now = new Date().toISOString();
    const days = this.getThinkingSnapshot(userId);
    const current = days.find((item) => item.date === date) ?? createEmptyThinkingDayRecord(date, now);
    const nextDay: ThinkingDayRecord = {
      ...current,
      thinkingReflection: normalizeThinkingReflectionResult(reflection),
      updatedAt: now,
    };

    this.setThinkingSnapshot(userId, replaceThinkingDay(days, nextDay));
    return clone(nextDay);
  }

  async saveThinkingQuestionResponses(userId: string, date: string, questionResponses: UpsertThinkingQuestionResponseInput[]) {
    const now = new Date().toISOString();
    const days = this.getThinkingSnapshot(userId);
    const current = days.find((item) => item.date === date) ?? createEmptyThinkingDayRecord(date, now);
    const previousByQuestion = new Map(current.questionResponses.map((item) => [item.question, item]));
    const nextDay: ThinkingDayRecord = {
      ...current,
      questionResponses: questionResponses
        .filter((item) => item.question.trim().length > 0)
        .map((item) =>
          normalizeThinkingQuestionResponse({
            id: previousByQuestion.get(item.question)?.id ?? randomUUID(),
            question: item.question,
            response: item.response,
            createdAt: previousByQuestion.get(item.question)?.createdAt ?? now,
            updatedAt: now,
          })
        ),
      updatedAt: now,
    };

    this.setThinkingSnapshot(userId, replaceThinkingDay(days, nextDay));
    return clone(nextDay);
  }

  async saveWeeklyReflection(userId: string, weekStart: string, reflection: WeeklyReflectionResult) {
    const current = await this.getThinkingWeek(userId, weekStart);
    const weeks = this.getThinkingWeekSnapshot(userId);
    const nextWeek: ThinkingWeekRecord = {
      ...current,
      reflection,
    };
    this.setThinkingWeekSnapshot(
      userId,
      [...weeks.filter((item) => item.weekStart !== weekStart), nextWeek]
    );
    return clone(nextWeek);
  }

  async saveWeeklyUserNote(userId: string, weekStart: string, userNote: WeeklyUserNote) {
    const current = await this.getThinkingWeek(userId, weekStart);
    const weeks = this.getThinkingWeekSnapshot(userId);
    const nextWeek: ThinkingWeekRecord = {
      ...current,
      userNote,
    };
    this.setThinkingWeekSnapshot(
      userId,
      [...weeks.filter((item) => item.weekStart !== weekStart), nextWeek]
    );
    return clone(nextWeek);
  }

  async getTodoSnapshot(userId: string, from: string, to: string) {
    const snapshot = this.getTodoSnapshotState(userId);
    return clone({
      labels: [...snapshot.labels].map(normalizeTodoLabel),
      tasks: snapshot.tasks
        .map(normalizeTodoTask)
        .filter((task) => task.scheduledDate >= from && task.scheduledDate <= to)
        .sort((left, right) => left.sortOrder - right.sortOrder),
    });
  }

  async createTodoTask(userId: string, input: CreateTodoTaskInput) {
    const snapshot = this.getTodoSnapshotState(userId);
    const now = new Date().toISOString();
    const task: TodoTask = normalizeTodoTask({
      id: randomUUID(),
      title: input.title.trim(),
      description: input.description ?? '',
      scheduledDate: input.scheduledDate || todayKey(),
      dueDate: input.dueDate ?? null,
      sortOrder: snapshot.tasks.reduce((maxOrder, current) => Math.max(maxOrder, current.sortOrder), -1) + 1,
      labelIds: input.labelIds ?? [],
      status: 'open',
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    this.setTodoSnapshotState(userId, {
      ...snapshot,
      tasks: [...snapshot.tasks, task],
    });
    return clone(task);
  }

  async updateTodoTask(userId: string, taskId: string, input: UpdateTodoTaskInput) {
    const snapshot = this.getTodoSnapshotState(userId);
    const current = snapshot.tasks.find((task) => task.id === taskId);
    if (!current) {
      return null;
    }
    const status = input.status ?? current.status;
    const updated = normalizeTodoTask({
      ...current,
      ...input,
      title: input.title === undefined ? current.title : input.title.trim(),
      description: input.description === undefined ? current.description : input.description,
      dueDate: input.dueDate === undefined ? current.dueDate : input.dueDate,
      status,
      completedAt: status === 'completed' ? input.completedAt ?? current.completedAt ?? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    });
    this.setTodoSnapshotState(userId, {
      ...snapshot,
      tasks: snapshot.tasks.map((task) => (task.id === taskId ? updated : task)),
    });
    return clone(updated);
  }

  async reorderTodoTasks(userId: string, taskIds: string[]) {
    const snapshot = this.getTodoSnapshotState(userId);
    const now = new Date().toISOString();
    const orderMap = new Map(taskIds.map((taskId, index) => [taskId, index]));
    this.setTodoSnapshotState(userId, {
      ...snapshot,
      tasks: snapshot.tasks.map((task) => {
        const nextOrder = orderMap.get(task.id);
        if (nextOrder === undefined) {
          return task;
        }
        return {
          ...task,
          sortOrder: nextOrder,
          updatedAt: now,
        };
      }),
    });
  }

  async deleteTodoTask(userId: string, taskId: string) {
    const snapshot = this.getTodoSnapshotState(userId);
    this.setTodoSnapshotState(userId, {
      ...snapshot,
      tasks: snapshot.tasks.filter((task) => task.id !== taskId),
    });
  }

  async createTodoLabel(userId: string, input: CreateTodoLabelInput) {
    const snapshot = this.getTodoSnapshotState(userId);
    const now = new Date().toISOString();
    const label: TodoLabel = normalizeTodoLabel({
      id: randomUUID(),
      name: input.name.trim(),
      color: input.color ?? null,
      createdAt: now,
      updatedAt: now,
    });
    this.setTodoSnapshotState(userId, {
      ...snapshot,
      labels: [...snapshot.labels, label],
    });
    return clone(label);
  }

  async updateTodoLabel(userId: string, labelId: string, input: UpdateTodoLabelInput) {
    const snapshot = this.getTodoSnapshotState(userId);
    const current = snapshot.labels.find((label) => label.id === labelId);
    if (!current) {
      return null;
    }
    const updated = normalizeTodoLabel({
      ...current,
      ...input,
      name: input.name === undefined ? current.name : input.name.trim(),
      color: input.color === undefined ? current.color : input.color,
      updatedAt: new Date().toISOString(),
    });
    this.setTodoSnapshotState(userId, {
      ...snapshot,
      labels: snapshot.labels.map((label) => (label.id === labelId ? updated : label)),
    });
    return clone(updated);
  }

  async deleteTodoLabel(userId: string, labelId: string) {
    const snapshot = this.getTodoSnapshotState(userId);
    this.setTodoSnapshotState(userId, {
      labels: snapshot.labels.filter((label) => label.id !== labelId),
      tasks: snapshot.tasks.map((task) => ({
        ...task,
        labelIds: task.labelIds.filter((item) => item !== labelId),
      })),
    });
  }
}
