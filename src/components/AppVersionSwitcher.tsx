import { Link, useLocation } from 'react-router-dom';

const baseButtonClass =
  'rounded-full px-3 py-1.5 text-xs font-medium transition-colors';

export default function AppVersionSwitcher() {
  const location = useLocation();
  const isThinkingV2 = location.pathname.startsWith('/v2');

  return (
    <div className="flex items-center gap-2">
      <Link
        to="/calendar"
        className={[
          baseButtonClass,
          !isThinkingV2 ? 'bg-stone-800 text-stone-50' : 'bg-stone-100 text-stone-600 hover:bg-stone-200',
        ].join(' ')}
      >
        旧版
      </Link>
      <Link
        to="/v2/calendar"
        className={[
          baseButtonClass,
          isThinkingV2 ? 'bg-sky-700 text-white' : 'bg-sky-50 text-sky-700 hover:bg-sky-100',
        ].join(' ')}
      >
        新版
      </Link>
    </div>
  );
}
