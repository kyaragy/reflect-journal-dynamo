import { Link, useLocation } from 'react-router-dom';

const baseButtonClass =
  'whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all sm:px-3 sm:py-1.5 sm:text-xs';

export default function AppVersionSwitcher() {
  const location = useLocation();
  const isTodo = location.pathname.startsWith('/todo');
  const isAiJournal = location.pathname.startsWith('/ai-journal');
  const isReflectJournal = !isTodo && !isAiJournal;

  return (
    <div className="flex min-w-0 items-center gap-1 sm:gap-2">
      <Link
        to="/todo"
        className={[
          baseButtonClass,
          isTodo
            ? 'border-stone-800 bg-stone-800 text-stone-50 shadow-sm shadow-stone-200'
            : 'border-stone-200 bg-stone-100 text-stone-600 hover:bg-stone-200',
        ].join(' ')}
      >
        TODO管理
      </Link>
      <Link
        to="/v2/home"
        className={[
          baseButtonClass,
          isReflectJournal
            ? 'border-sky-700 bg-sky-700 text-white shadow-sm shadow-sky-100'
            : 'border-sky-100 bg-sky-50 text-sky-700 hover:bg-sky-100',
        ].join(' ')}
      >
        Reflect Journal
      </Link>
      <Link
        to="/ai-journal/home"
        className={[
          baseButtonClass,
          isAiJournal
            ? 'border-amber-700 bg-amber-700 text-white shadow-sm shadow-amber-100'
            : 'border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100',
        ].join(' ')}
      >
        AIジャーナル・1on1
      </Link>
    </div>
  );
}
