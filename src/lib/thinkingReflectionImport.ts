import {
  isThinkingReflectionResult,
  normalizeThinkingReflectionResult,
  thinkingReflectionMode,
  type ThinkingMemoCard,
  type ThinkingReflectionResult,
} from '../domain/thinkingReflection';
import { assertDateString } from '../contracts/journalApi';

const extractJsonCandidate = (input: string) => {
  const trimmed = input.trim();
  const fenced = trimmed.match(/```json\s*([\s\S]*?)\s*```/i) ?? trimmed.match(/```\s*([\s\S]*?)\s*```/);
  return fenced ? fenced[1] : trimmed;
};

export const parseThinkingReflectionImport = (
  input: string,
  expectedDate: string,
  sourceCards: ThinkingMemoCard[]
): ThinkingReflectionResult => {
  assertDateString(expectedDate);

  const jsonCandidate = extractJsonCandidate(input);
  const parsed = JSON.parse(jsonCandidate) as unknown;

  if (!isThinkingReflectionResult(parsed)) {
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

    if (card.trigger !== sourceCard.trigger) {
      throw new Error(`trigger must match the exported value for ${card.card_id}`);
    }
  });

  return reflection;
};
