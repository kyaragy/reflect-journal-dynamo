import assert from 'node:assert/strict';
import test from 'node:test';
import { generateCardMarkdown } from '../../../src/lib/cardMarkdown';
import { getStepTypeLabel, getTriggerTypeLabel, normalizeCard } from '../../../src/domain/journal';
import { getReflectionPlaceholder, getTriggerPlaceholder, reflectionPlaceholderMap, triggerPlaceholderMap } from '../../../src/lib/reflectionPlaceholders';

test('label helpers expose user-facing Japanese labels', () => {
  assert.equal(getTriggerTypeLabel('external'), '外部出来事');
  assert.equal(getStepTypeLabel('action'), '行動');
});

test('normalizeCard migrates legacy fields into trigger and steps', () => {
  const card = normalizeCard({
    id: 'card-1',
    tag: '仕事',
    fact: '会議で厳しい指摘を受けた',
    thought: '否定された気がした',
    emotion: 'イライラした',
    bodySensation: '胸がざわついた',
    createdAt: '2026-03-22T01:30:00.000Z',
    updatedAt: '2026-03-22T01:30:00.000Z',
  });

  assert.equal(card.trigger.content, '会議で厳しい指摘を受けた');
  assert.equal(card.steps.length, 3);
  assert.deepEqual(
    card.steps.map((step) => step.type),
    ['thought', 'emotion', 'body']
  );
});

test('generateCardMarkdown outputs trigger, tag and ordered steps', () => {
  const markdown = generateCardMarkdown({
    id: 'card-1',
    tag: '仕事',
    trigger: {
      type: 'external',
      content: '会議で進め方に厳しい指摘を受けた',
    },
    steps: [
      {
        id: 'step-1',
        order: 1,
        type: 'thought',
        content: '自分の進め方を否定された気がした',
      },
      {
        id: 'step-2',
        order: 2,
        type: 'emotion',
        content: 'イライラした',
      },
    ],
    createdAt: '2026-03-22T10:30:00.000Z',
    updatedAt: '2026-03-22T10:30:00.000Z',
  });

  assert.match(markdown, /カテゴリ: 仕事/);
  assert.match(markdown, /種別: 外部出来事/);
  assert.match(markdown, /1\.\n- 種別: 思考\n- 内容: 自分の進め方を否定された気がした/);
  assert.match(markdown, /2\.\n- 種別: 感情\n- 内容: イライラした/);
});

test('reflection placeholders are defined per mode', () => {
  assert.match(getReflectionPlaceholder('day'), /今日のサマリ：/);
  assert.match(getReflectionPlaceholder('week'), /繰り返していたパターン：/);
  assert.match(getReflectionPlaceholder('month'), /長期的な問い：/);
  assert.equal(Object.keys(reflectionPlaceholderMap).length, 3);
});

test('trigger placeholders follow trigger type selection', () => {
  assert.match(getTriggerPlaceholder('external'), /Slackで指摘された/);
  assert.match(getTriggerPlaceholder('internal'), /急に不安になった/);
  assert.match(getTriggerPlaceholder('physical'), /胸がざわついた/);
  assert.equal(Object.keys(triggerPlaceholderMap).length, 3);
});
