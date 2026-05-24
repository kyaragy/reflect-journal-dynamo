import type { ThinkingEntry } from '../domain/thinkingReflection';
import { buildReflectionExportMarkdown } from './reflectionExportTemplate';

const PROMPT_HEADER = `以下は、ある1日分の記録カードです。
あなたの役割は、この記録を「思考振り返り」用に整理し、指定されたJSON形式のみを返すことです。

【目的】
- 各カードの自由記述から、思考・感情・身体反応・行動を分類する
- 1日全体の傾向を抽出する
- 気づき候補を出す
- 1日全体に対する問いを最大3件出す

【重要ルール】
- 必ず JSONコードブロックのみ を返してください
- コードブロックの前後に説明文を書かないでください
- JSONのキー名は指定どおり固定してください
- 入力に書かれていない内容を過剰に補完しないでください
- 推測が必要な場合は控えめにし、不明な項目は空配列 [] にしてください
- 問いはカードごとではなく、1日全体に対するものだけを出してください
- 問いは最大3件までにしてください
- daily_patterns は目安として2〜4件が推奨で、内容がまとまらない場合は無理に要約せず件数を増やしても構いません。
- insight_candidates も目安として2～4件が推奨で、内容がまとまらない場合は無理に要約せず件数を増やしても構いません。
- thoughts / emotions / body_reactions / actions は、1項目あたり短い文で配列にしてください
- 入力の tags は参考情報として扱ってください（そのまま採用を強制しません）
- tags の目的は、後で同じタグの記録を横断して振り返ることです
- 出力の tags は body 内容から抽出してください
- 既存タグ一覧に該当があれば既存タグを優先してください
- 既存タグに当てはまらない場合のみ、新規タグを追加してください
- tags は「再利用しやすい中粒度カテゴリ」で付与してください（細かすぎる固有名詞や一時的な出来事は避ける）
- 同義語・表記ゆれは統一してください（例: 仕事/業務 はどちらかに寄せる）
- 1カードあたりの tags は 1〜3 件を目安にし、本当に必要なものだけに絞ってください
- 感情語そのもの（不安、イライラ等）だけを tags にせず、文脈カテゴリ（例: 仕事、人間関係、健康、時間管理、家事、育児、学習）を優先してください
- 入力に trigger があるカードは、その trigger を尊重し更新しないでください
- 入力に trigger がないカードのみ、body から「出来事の起点」を1文で抽出してください
- card_id は入力値をそのまま返してください
- mode は必ず "thinking" にしてください

【出力形式】
\`\`\`json
{
  "date": "YYYY-MM-DD",
  "mode": "thinking",
  "cards": [
    {
      "card_id": "string",
      "trigger": "string",
      "tags": ["string"],
      "thoughts": ["string"],
      "emotions": ["string"],
      "body_reactions": ["string"],
      "actions": ["string"]
    }
  ],
  "daily_patterns": ["string"],
  "insight_candidates": ["string"],
  "questions": ["string"]
}
\`\`\`

【分類基準】
- thoughts:
  解釈、判断、意味づけ、気づき、自己認識、反論、方針など
- emotions:
  感情として表現されているもの。例：嫌だ、不安、面倒、安心した、嬉しい
- body_reactions:
  身体状態、感覚、疲労、緊張、頭が重い、気分が軽い など
- actions:
  実際に取った行動、または取ろうと決めた具体行動`;

export const generateThinkingReflectionPrompt = (date: string, cards: ThinkingEntry[], existingTags: string[] = []) => {
  const renderedCards = cards
    .map(
      (card) => `## card_id: ${card.id}
trigger: ${card.trigger?.trim() || '(none)'}
tags: ${card.tags?.length ? card.tags.map((tag) => `#${tag}`).join(' ') : '(none)'}
mood: ${card.mood ?? '(none)'}
body:
${card.body}`
    )
    .join('\n\n');

  const rawPrompt = `${PROMPT_HEADER}
【入力データ】
date: ${date}
existing_tags:
${existingTags.length ? existingTags.map((tag) => `- #${tag}`).join('\n') : '- (none)'}

${renderedCards}`;

  return buildReflectionExportMarkdown({
    scope: 'daily',
    targetLabel: date,
    body: rawPrompt,
  });
};
