import assert from 'node:assert/strict';
import test from 'node:test';
import { DynamoDbAiJournalRepository } from './dynamoDbAiJournalRepository';

const createClientStub = () => {
  const items = new Map<string, any>();
  const keyOf = (PK: string, SK: string) => `${PK}|${SK}`;

  return {
    async getItem<T>(key: Record<string, string>) {
      return items.get(keyOf(key.PK, key.SK)) as T | undefined;
    },
    async putItem(item: any) {
      items.set(keyOf(item.PK, item.SK), item);
    },
    async deleteItem(key: Record<string, string>) {
      items.delete(keyOf(key.PK, key.SK));
    },
    async queryByPartition<T>(pk: string) {
      return [...items.values()].filter((item) => item.PK === pk) as T[];
    },
    async queryByPrefix<T>(pk: string, prefix: string) {
      return [...items.values()].filter((item) => item.PK === pk && item.SK.startsWith(prefix)) as T[];
    },
    async queryBetween<T>() {
      return [] as T[];
    },
    async batchGetItems<T>(keys: Record<string, string>[]) {
      return keys.map((key) => items.get(keyOf(key.PK, key.SK))).filter(Boolean) as T[];
    },
  };
};

test('creates note and returns ai journal snapshot', async () => {
  const client = createClientStub();
  const repository = new DynamoDbAiJournalRepository(client as never);

  const note = await repository.createAiJournalNote('user-1', { type: 'Journal' });
  const snapshot = await repository.getAiJournalSnapshot('user-1');

  assert.equal(note.type, 'Journal');
  assert.equal(snapshot.notes.length, 1);
  assert.equal(snapshot.notes[0]?.id, note.id);
});

test('imports summary and links target notes', async () => {
  const client = createClientStub();
  const repository = new DynamoDbAiJournalRepository(client as never);

  const note = await repository.createAiJournalNote('user-1', { type: 'Journal' });
  const summaryNote = await repository.importOneOnOneSummary('user-1', {
    schemaVersion: '1.1',
    type: '1on1Summary',
    targetNoteIds: [note.id],
    contextSummaryIds: [],
    summary: {
      title: '2026-07-01 1on1まとめ',
      markdown: 'summary body',
    },
    discussedThemes: ['テーマA'],
    notableQuotes: ['まず導線を整えたい'],
    insights: ['入口の分かりやすさが重要'],
    nextActions: ['トップ導線を見直す'],
    changesSincePrevious: ['change'],
    continuingThemes: ['theme'],
    newThemes: ['new'],
    nextQuestions: ['question'],
  });
  const snapshot = await repository.getAiJournalSnapshot('user-1');

  const target = snapshot.notes.find((item) => item.id === note.id);
  const summary = snapshot.notes.find((item) => item.id === summaryNote.id);

  assert.equal(target?.relatedSummaryIds.includes(summaryNote.id), true);
  assert.equal(summary?.type, 'OneOnOneSummary');
  assert.deepEqual(summary?.discussedThemes, ['テーマA']);
  assert.deepEqual(summary?.notableQuotes, ['まず導線を整えたい']);
  assert.deepEqual(summary?.insights, ['入口の分かりやすさが重要']);
  assert.deepEqual(summary?.nextActions, ['トップ導線を見直す']);
  assert.deepEqual(summary?.targetNoteIds, [note.id]);
});
