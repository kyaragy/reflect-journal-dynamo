type ExportTemplateInput = {
  scope: 'daily' | 'weekly' | 'monthly';
  targetLabel: string;
  body: string;
};

const scopeLabels: Record<ExportTemplateInput['scope'], string> = {
  daily: '日次',
  weekly: '週次',
  monthly: '月次',
};

export const buildReflectionExportMarkdown = ({ scope, targetLabel, body }: ExportTemplateInput) => {
  const now = new Date().toISOString();

  return `# Reflect Journal Export (${scopeLabels[scope]})

- target: ${targetLabel}
- generated_at: ${now}
- usage: この内容をそのまま ChatGPT に貼り付けてください

---

${body}`.trim();
};

