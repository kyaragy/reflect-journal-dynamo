import { addDays, format, parseISO } from 'date-fns';
import type { ThinkingDayRecord } from '../domain/thinkingReflection';

const WEEKLY_PROMPT_HEADER = `以下は、ある1週間分の日次振り返りデータです。
あなたの役割は、この記録を「週次振り返り」用に整理し、指定されたJSON形式のみを返すことです。

【目的】
- 1週間分の日次要約・気づき・問い・回答メモから、週全体の傾向を整理する
- 繰り返し出ているパターンを抽出する
- 週の中で生じた変化を抽出する
- 回答メモから見える思考の傾向を整理する
- 未回答の問いに共通する傾向を整理する
- 週を通して強まってきた認識や、繰り返し補強された気づきを整理する

【重要ルール】
- 必ず JSONコードブロックのみ を返してください
- コードブロックの前後に説明文を書かないでください
- JSONのキー名は指定どおり固定してください
- 入力に書かれていない内容を過剰に補完しないでください
- 推測が必要な場合は控えめにし、不明な項目は空配列 [] または空文字列 "" にしてください
- weekly_summary は 200〜600文字程度の文章にしてください
- repeated_patterns は最大10件、推奨5件にしてください
- repeated_patterns は pattern と count を持つ配列にしてください
- notable_changes は1〜5件にしてください
- question_answer_patterns は2〜5件にしてください
- unanswered_question_patterns は1〜5件にしてください
- growing_insights は2〜5件にしてください
- source_days は入力の日次データを要約せず、date をそのまま返してください
- mode は必ず "weekly_reflection" にしてください

【出力形式】
\`\`\`json
{
  "week_start": "YYYY-MM-DD",
  "week_end": "YYYY-MM-DD",
  "mode": "weekly_reflection",
  "weekly_summary": "string",
  "repeated_patterns": [
    {
      "pattern": "string",
      "count": 3
    }
  ],
  "notable_changes": ["string"],
  "question_answer_patterns": ["string"],
  "unanswered_question_patterns": ["string"],
  "growing_insights": ["string"],
  "source_days": [
    {
      "date": "YYYY-MM-DD"
    }
  ]
}
\`\`\`

【項目の意味】
- weekly_summary:
  今週全体を一段高い視点で要約した文章。全体トーン、繰り返し出たテーマ、印象的な変化、来週への示唆を含める
- repeated_patterns:
  繰り返し出ている思考、反応、行動、判断パターン。count には週内でそのパターンが現れた日数または明確な出現回数の目安を入れる
- notable_changes:
  週の前半から後半にかけての変化、気づきの深まり、行動変化
- question_answer_patterns:
  回答メモを書くことで見えた思考の流れ、整理のされ方、着地しやすい方向
- unanswered_question_patterns:
  未回答のまま残りやすい問いの特徴、扱いづらい問いの傾向
- growing_insights:
  単発の感想ではなく、複数の日や複数の回答メモを通して繰り返し補強され、今週の中で「確からしさが増した認識」や「見え方が強まったテーマ」を出してください。日次の insight_candidates を並べ替えるだけではなく、週全体を見たときに何がより明確になったのかを抽出してください
- source_days:
  今回の週次振り返りの元にした日次データの日付一覧`;

const renderBulletList = (items: string[]) => (items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : '- なし');

export const getWeekEnd = (weekStart: string) => format(addDays(parseISO(weekStart), 6), 'yyyy-MM-dd');

export const buildWeeklySourceDays = (weekStart: string, days: ThinkingDayRecord[]) =>
  Array.from({ length: 7 }, (_, index) => format(addDays(parseISO(weekStart), index), 'yyyy-MM-dd'))
    .map((date) => days.find((day) => day.date === date))
    .filter((day): day is ThinkingDayRecord => Boolean(day?.thinkingReflection))
    .map((day) => ({
      date: day.date,
      daily_summary: day.thinkingReflection!.daily_patterns.join('\n'),
      insight_candidates: day.thinkingReflection!.insight_candidates,
      questions: day.thinkingReflection!.questions,
      answer_memos: day.questionResponses.map((item) => item.response).filter((item) => item.trim().length > 0),
    }));

export const generateWeeklyReflectionPrompt = (weekStart: string, days: ThinkingDayRecord[]) => {
  const weekEnd = getWeekEnd(weekStart);
  const sourceDays = buildWeeklySourceDays(weekStart, days);
  const renderedDays = sourceDays
    .map(
      (day) => `## date: ${day.date}
daily_summary:
${day.daily_summary || 'なし'}

insight_candidates:
${renderBulletList(day.insight_candidates)}

questions:
${renderBulletList(day.questions)}

answer_memos:
${renderBulletList(day.answer_memos)}`
    )
    .join('\n\n');

  return `${WEEKLY_PROMPT_HEADER}

【入力データ】
week_start: ${weekStart}
week_end: ${weekEnd}

${renderedDays}`;
};
