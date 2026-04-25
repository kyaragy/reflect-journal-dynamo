import { eachWeekOfInterval, endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import type { ThinkingWeekRecord } from '../domain/thinkingReflection';

const MONTHLY_PROMPT_HEADER = `以下は、ある1ヶ月分の週次振り返りデータです。
あなたの役割は、この記録を「月次振り返り」用に整理し、指定されたJSON形式のみを返すことです。

【目的】
- 週次データから、月全体の傾向を整理する
- 繰り返し出ているパターンのうち「改善されていないもの（ループ）」を抽出する
- 週を跨いで変化・進展している思考や認識を抽出する
- 新しく出てきたテーマを抽出する
- 月として「今後気にしておくとよい観点」を軽く提示する（行動の強制はしない）

【重要ルール】
- 必ず JSONコードブロックのみ を返してください
- コードブロックの前後に説明文を書かないでください
- JSONのキー名は指定どおり固定してください
- 入力に書かれていない内容を過剰に補完しないでください
- 推測が必要な場合は控えめにし、不明な項目は空配列 [] または空文字列 "" にしてください
- 抽象的すぎる表現は避け、週次データから読み取れる範囲で具体性を保ってください
- 「改善提案」は出さないでください（観点提示まで）
- mode は必ず "monthly_reflection" にしてください

【出力形式】
\`\`\`json
{
  "month_start": "YYYY-MM-DD",
  "month_end": "YYYY-MM-DD",
  "mode": "monthly_reflection",
  "monthly_summary": "string",
  "looping_patterns": ["string"],
  "evolving_insights": ["string"],
  "new_patterns": ["string"],
  "resolved_or_reduced_patterns": ["string"],
  "monthly_focus_points": ["string"],
  "source_weeks": [
    {
      "week_start": "YYYY-MM-DD",
      "week_end": "YYYY-MM-DD"
    }
  ]
}
\`\`\`

【項目の意味】
- monthly_summary:
  月全体を一段高い視点で要約した文章。主要テーマ、繰り返し、変化、次月に向けた観点を含める
- looping_patterns:
  改善されずに繰り返している思考・感情・行動パターン
- evolving_insights:
  週を跨いで変化や進展が見えた認識・気づき
- new_patterns:
  その月に新しく出現したテーマや反応
- resolved_or_reduced_patterns:
  前半に比べて後半で弱まった・解消傾向が見えるパターン
- monthly_focus_points:
  次月も観察すると良い観点（改善指示ではなく観察観点）
- source_weeks:
  今回の月次振りかえりの元にした週次データの一覧`; 

const renderBulletList = (items: string[]) => (items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : '- なし');

export const getMonthStart = (monthKey: string) => `${monthKey}-01`;

export const getMonthEnd = (monthKey: string) => format(endOfMonth(parseISO(getMonthStart(monthKey))), 'yyyy-MM-dd');

const getWeekStartsInMonth = (monthKey: string) => {
  const monthStart = startOfMonth(parseISO(getMonthStart(monthKey)));
  const monthEnd = endOfMonth(monthStart);
  return eachWeekOfInterval(
    {
      start: monthStart,
      end: monthEnd,
    },
    { weekStartsOn: 0 }
  ).map((date) => format(date, 'yyyy-MM-dd'));
};

export const buildMonthlySourceWeeks = (monthKey: string, weeks: ThinkingWeekRecord[]) => {
  const weekMap = new Map(weeks.map((week) => [week.weekStart, week]));

  return getWeekStartsInMonth(monthKey)
    .map((weekStart) => weekMap.get(weekStart))
    .filter((week): week is ThinkingWeekRecord => Boolean(week?.reflection))
    .map((week) => ({
      week_start: week.weekStart,
      week_end: week.weekEnd,
      weekly_summary: week.reflection!.weekly_summary,
      repeated_patterns: week.reflection!.repeated_patterns.map((item) => `${item.pattern} (${item.count}回)`),
      notable_changes: week.reflection!.notable_changes,
      question_answer_patterns: week.reflection!.question_answer_patterns,
      unanswered_question_patterns: week.reflection!.unanswered_question_patterns,
      growing_insights: week.reflection!.growing_insights,
    }));
};

export const generateMonthlyReflectionPrompt = (monthKey: string, weeks: ThinkingWeekRecord[]) => {
  const monthStart = getMonthStart(monthKey);
  const monthEnd = getMonthEnd(monthKey);
  const sourceWeeks = buildMonthlySourceWeeks(monthKey, weeks);

  const renderedWeeks = sourceWeeks
    .map(
      (week) => `## week_start: ${week.week_start}
week_end: ${week.week_end}
weekly_summary:
${week.weekly_summary || 'なし'}

repeated_patterns:
${renderBulletList(week.repeated_patterns)}

notable_changes:
${renderBulletList(week.notable_changes)}

question_answer_patterns:
${renderBulletList(week.question_answer_patterns)}

unanswered_question_patterns:
${renderBulletList(week.unanswered_question_patterns)}

growing_insights:
${renderBulletList(week.growing_insights)}`
    )
    .join('\n\n');

  return `${MONTHLY_PROMPT_HEADER}

【入力データ】
month_start: ${monthStart}
month_end: ${monthEnd}

${renderedWeeks}`;
};
