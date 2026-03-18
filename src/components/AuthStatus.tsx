import { useAuth } from '../auth/AuthContext';

export default function AuthStatus() {
  const { currentUser, isAuthenticated, isLoading, isAuthEnabled, login, logout } = useAuth();

  if (isAuthEnabled && isLoading) {
    return <div className="text-xs text-stone-500">authenticating...</div>;
  }

  return (
    <div className="flex items-center gap-2 text-xs text-stone-500">
      <span className="hidden sm:inline">
        {isAuthenticated ? `user: ${currentUser?.userId}` : isAuthEnabled ? 'sign in required' : 'guest mode'}
      </span>
      <button
        onClick={() => void (isAuthenticated ? Promise.resolve(logout()) : login())}
        className="rounded-full border border-stone-200 bg-white px-3 py-1.5 font-medium text-stone-600 transition-colors hover:border-stone-300 hover:text-stone-900"
      >
        {isAuthenticated ? 'ログアウト' : 'ログイン'}
      </button>
    </div>
  );
}
