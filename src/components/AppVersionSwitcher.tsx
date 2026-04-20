import { Link, useLocation } from 'react-router-dom';

const baseButtonClass =
  'whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors';

export default function AppVersionSwitcher() {
  const location = useLocation();
  const isTodo = location.pathname.startsWith('/todo');

  return (
    <div className="flex items-center gap-2">
      <Link
        to="/todo"
        className={[
          baseButtonClass,
          isTodo ? 'bg-stone-800 text-stone-50' : 'bg-stone-100 text-stone-600 hover:bg-stone-200',
        ].join(' ')}
      >
        TODO管理
      </Link>
      <Link
        to="/v2/calendar"
        className={[
          baseButtonClass,
          !isTodo ? 'bg-sky-700 text-white' : 'bg-sky-50 text-sky-700 hover:bg-sky-100',
        ].join(' ')}
      >
        ジャーナリング
      </Link>
    </div>
  );
}
