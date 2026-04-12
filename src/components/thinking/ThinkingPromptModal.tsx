import { useState } from 'react';

type Props = {
  prompt: string;
  onClose: () => void;
};

export default function ThinkingPromptModal({ prompt, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-stone-950/50 px-4">
      <div className="w-full max-w-4xl rounded-3xl border border-stone-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-medium text-stone-900">ChatGPT貼り付け用テキスト</h3>
            <p className="mt-1 text-sm text-stone-500">固定プロンプトと当日のカード内容を結合した状態です。</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-600 transition-colors hover:bg-stone-50"
          >
            閉じる
          </button>
        </div>

        <div className="rounded-2xl bg-stone-900 p-4">
          <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap text-sm leading-7 text-stone-200">{prompt}</pre>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-2xl bg-sky-700 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-sky-600"
          >
            {copied ? 'コピーしました' : 'コピーする'}
          </button>
        </div>
      </div>
    </div>
  );
}
