import type { ThinkingMemoCard } from '../domain/thinkingReflection';

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
- trigger は入力値をそのまま返してください
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

export const generateThinkingReflectionPrompt = (date: string, cards: ThinkingMemoCard[]) => {
  const renderedCards = cards
    .map(
      (card) => `## card_id: ${card.id}
trigger: ${card.trigger}
body:
${card.body}`
    )
    .join('\n\n');

  return `${PROMPT_HEADER}
【入力データ】
date: ${date}

${renderedCards}`;
};
