import assert from 'node:assert/strict';
import test from 'node:test';
import { parseImportedOneOnOneSummary } from './oneOnOne';

test('parseImportedOneOnOneSummary accepts schemaVersion 1.1 optional fields', () => {
  const parsed = parseImportedOneOnOneSummary(
    JSON.stringify({
      schemaVersion: '1.1',
      type: '1on1Summary',
      runId: 'oneonone-20260702-001',
      targetNoteIds: ['note-1'],
      contextSummaryIds: ['summary-1'],
      summary: {
        title: '2026-07-02 1on1まとめ',
        markdown: 'summary body',
      },
      discussedThemes: ['導線改善'],
      notableQuotes: ['まずトップを整えたい'],
      insights: ['入口設計が重要'],
      nextActions: ['トップ画面を見直す'],
      changesSincePrevious: ['話題が具体化した'],
      continuingThemes: ['導線改善'],
      newThemes: ['移行方針'],
      nextQuestions: ['次に何から直すか'],
    })
  );

  assert.equal(parsed.schemaVersion, '1.1');
  assert.deepEqual(parsed.discussedThemes, ['導線改善']);
  assert.deepEqual(parsed.notableQuotes, ['まずトップを整えたい']);
  assert.deepEqual(parsed.insights, ['入口設計が重要']);
  assert.deepEqual(parsed.nextActions, ['トップ画面を見直す']);
});
