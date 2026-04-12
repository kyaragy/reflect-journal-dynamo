import test from 'node:test';
import assert from 'node:assert/strict';
import { parseThinkingReflectionImport } from './thinkingReflectionImport';
import { generateThinkingReflectionPrompt } from './thinkingReflectionPrompt';
import type { ThinkingMemoCard } from '../domain/thinkingReflection';

const cards: ThinkingMemoCard[] = [
  {
    id: 'card-1',
    trigger: 'Teamsの通知が来た',
    body: 'また急ぎ依頼かと思って少し身構えた。',
    createdAt: '2026-04-10T15:10:00.000Z',
    updatedAt: '2026-04-10T15:10:00.000Z',
  },
  {
    id: 'card-2',
    trigger: '勉強を始めようとした',
    body: '10分だけでも進めようと思った。',
    createdAt: '2026-04-10T21:05:00.000Z',
    updatedAt: '2026-04-10T21:05:00.000Z',
  },
];

test('generateThinkingReflectionPrompt renders fixed prompt with card payloads', () => {
  const prompt = generateThinkingReflectionPrompt('2026-04-10', cards);

  assert.match(prompt, /date: 2026-04-10/);
  assert.match(prompt, /## card_id: card-1/);
  assert.match(prompt, /trigger: Teamsの通知が来た/);
  assert.match(prompt, /body:\nまた急ぎ依頼かと思って少し身構えた。/);
});

test('parseThinkingReflectionImport accepts a valid code block payload', () => {
  const reflection = parseThinkingReflectionImport(
    `\`\`\`json
{
  "date": "2026-04-10",
  "mode": "thinking",
  "cards": [
    {
      "card_id": "card-1",
      "trigger": "Teamsの通知が来た",
      "thoughts": ["通知が来ると悪い内容を想定しがち"],
      "emotions": ["身構えた"],
      "body_reactions": [],
      "actions": ["内容を確認した"]
    },
    {
      "card_id": "card-2",
      "trigger": "勉強を始めようとした",
      "thoughts": ["10分だけでも進めればよい"],
      "emotions": ["少し気が重い"],
      "body_reactions": ["頭が重い"],
      "actions": ["10分だけやる方針にした"]
    }
  ],
  "daily_patterns": ["最初に悪い想定を置きやすい", "小さく始めると動ける"],
  "insight_candidates": ["通知直後の解釈が強め", "完璧主義を小さな着手で崩せる"],
  "questions": ["通知直後に置いている前提は何か"]
}
\`\`\``,
    '2026-04-10',
    cards
  );

  assert.equal(reflection.mode, 'thinking');
  assert.equal(reflection.cards.length, 2);
  assert.equal(reflection.daily_patterns.length, 2);
});

test('parseThinkingReflectionImport rejects mismatched triggers', () => {
  assert.throws(
    () =>
      parseThinkingReflectionImport(
        JSON.stringify({
          date: '2026-04-10',
          mode: 'thinking',
          cards: [
            {
              card_id: 'card-1',
              trigger: '別のきっかけ',
              thoughts: ['a'],
              emotions: ['b'],
              body_reactions: [],
              actions: ['c'],
            },
            {
              card_id: 'card-2',
              trigger: '勉強を始めようとした',
              thoughts: ['a'],
              emotions: ['b'],
              body_reactions: [],
              actions: ['c'],
            },
          ],
          daily_patterns: ['a', 'b'],
          insight_candidates: ['a', 'b'],
          questions: [],
        }),
        '2026-04-10',
        cards
      ),
    /trigger must match/
  );
});
