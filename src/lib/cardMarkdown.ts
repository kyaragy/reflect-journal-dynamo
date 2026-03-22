import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { Card } from '../domain/journal';
import { getStepTypeLabel, getTriggerTypeLabel } from '../domain/journal';

const formatCreatedAt = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return format(parsed, 'yyyy-MM-dd HH:mm');
};

export const generateCardMarkdown = (card: Card, heading = '## 思考イベント') => {
  let md = `${heading}\n`;
  md += `- 作成日時: ${formatCreatedAt(card.createdAt)}\n`;

  if (card.tag) {
    md += `- カテゴリ: ${card.tag}\n`;
  }

  md += '\n### きっかけ\n';
  md += `- 種別: ${getTriggerTypeLabel(card.trigger.type)}\n`;
  md += `- 内容: ${card.trigger.content || '(未入力)'}\n`;
  md += '\n### ステップ\n';

  if (card.steps.length === 0) {
    md += '1.\n';
    md += '- 種別: 思考\n';
    md += '- 内容: (未入力)\n';
    return md;
  }

  card.steps.forEach((step, index) => {
    md += `${index + 1}.\n`;
    md += `- 種別: ${getStepTypeLabel(step.type)}\n`;
    md += `- 内容: ${step.content || '(未入力)'}\n`;
  });

  return md;
};

export const formatDayHeading = (date: string) => format(parseISO(date), 'yyyy年M月d日', { locale: ja });
