import {
  isThinkingReflectionResult,
  normalizeThinkingReflectionResult,
  thinkingReflectionMode,
  type ThinkingEntry,
  type ThinkingReflectionResult,
} from '../domain/thinkingReflection';
import { assertDateString } from '../contracts/journalApi';

const extractJsonCandidate = (input: string) => {
  const trimmed = input.trim();
  const fenced = trimmed.match(/```json\s*([\s\S]*?)\s*```/i) ?? trimmed.match(/```\s*([\s\S]*?)\s*```/);
  return fenced ? fenced[1] : trimmed;
};

const ensureObject = (value: unknown, path: string) => {
  if (!value || typeof value !== 'object') {
    throw new Error(`schema mismatch: ${path} must be an object`);
  }
  return value as Record<string, unknown>;
};

const ensureArray = (value: unknown, path: string) => {
  if (!Array.isArray(value)) {
    throw new Error(`schema mismatch: ${path} must be an array`);
  }
  return value;
};

const ensureString = (value: unknown, path: string) => {
  if (typeof value !== 'string') {
    throw new Error(`schema mismatch: ${path} must be a string`);
  }
};

const validateThinkingSchema = (value: unknown) => {
  const obj = ensureObject(value, 'root');
  ensureString(obj.date, 'date');
  ensureString(obj.mode, 'mode');
  const cards = ensureArray(obj.cards, 'cards');
  ensureArray(obj.daily_patterns, 'daily_patterns');
  ensureArray(obj.insight_candidates, 'insight_candidates');
  ensureArray(obj.questions, 'questions');
  cards.forEach((card, index) => {
    const item = ensureObject(card, `cards[${index}]`);
    ensureString(item.card_id, `cards[${index}].card_id`);
    ensureString(item.trigger, `cards[${index}].trigger`);
    ensureArray(item.tags, `cards[${index}].tags`);
    ensureArray(item.thoughts, `cards[${index}].thoughts`);
    ensureArray(item.emotions, `cards[${index}].emotions`);
    ensureArray(item.body_reactions, `cards[${index}].body_reactions`);
    ensureArray(item.actions, `cards[${index}].actions`);
  });
};

export const parseThinkingReflectionImport = (
  input: string,
  expectedDate: string,
  sourceCards: ThinkingEntry[]
): ThinkingReflectionResult => {
  assertDateString(expectedDate);

  const jsonCandidate = extractJsonCandidate(input);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonCandidate) as unknown;
  } catch {
    throw new Error('JSON syntax error: 有効なJSON形式ではありません');
  }

  if (!isThinkingReflectionResult(parsed)) {
    validateThinkingSchema(parsed);
    throw new Error('Imported JSON does not match the thinking reflection schema');
  }

  const reflection = normalizeThinkingReflectionResult({
    ...parsed,
    importedAt: new Date().toISOString(),
    rawJson: jsonCandidate,
  });

  if (reflection.mode !== thinkingReflectionMode) {
    throw new Error('mode must be "thinking"');
  }

  if (reflection.date !== expectedDate) {
    throw new Error(`date must match ${expectedDate}`);
  }

  if (reflection.questions.length > 3) {
    throw new Error('questions must contain at most 3 items');
  }

  const sourceCardMap = new Map(sourceCards.map((card) => [card.id, card]));

  if (reflection.cards.length !== sourceCards.length) {
    throw new Error('cards length must match the exported card count');
  }

  reflection.cards.forEach((card) => {
    const sourceCard = sourceCardMap.get(card.card_id);
    if (!sourceCard) {
      throw new Error(`Unknown card_id: ${card.card_id}`);
    }
  });

  return reflection;
};
