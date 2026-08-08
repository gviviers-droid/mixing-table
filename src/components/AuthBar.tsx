import { useMusicKit } from "../musickit/useMusicKit";

export function AuthBar() {
  const { status, error, isAuthorized, signIn, signOut } = useMusicKit();

  if (status === "error") {
    return <div className="auth-bar auth-error">Apple Music unavailable: {error}</div>;
  }

  return (
    <div className="auth-bar">
      <span className="status-dot" data-status={status} />
      {status === "loading" && <span>Loading MusicKit…</span>}
      {status === "ready" &&
        (isAuthorized ? (
          <>
            <span>Signed in to Apple Music</span>
            <button type="button" onClick={signOut}>
              Sign out
            </button>
          </>
        ) : (
          <button type="button" onClick={signIn}>
            Sign in with Apple Music
          </button>
        ))}
    </div>
  );
}
