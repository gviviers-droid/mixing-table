import { useCallback, useEffect, useState } from "react";
import { getMusicKitInstance } from "./loadMusicKit";

export type MusicKitStatus = "idle" | "loading" | "ready" | "error";

export function useMusicKit() {
  const [status, setStatus] = useState<MusicKitStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    getMusicKitInstance()
      .then((instance) => {
        if (cancelled) return;
        setIsAuthorized(instance.isAuthorized);
        setStatus("ready");

        const onAuthChange = () => setIsAuthorized(instance.isAuthorized);
        instance.addEventListener(
          "authorizationStatusDidChange",
          onAuthChange,
        );
        return () =>
          instance.removeEventListener(
            "authorizationStatusDidChange",
            onAuthChange,
          );
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async () => {
    const instance = await getMusicKitInstance();
    await instance.authorize();
    setIsAuthorized(instance.isAuthorized);
  }, []);

  const signOut = useCallback(async () => {
    const instance = await getMusicKitInstance();
    await instance.unauthorize();
    setIsAuthorized(instance.isAuthorized);
  }, []);

  return { status, error, isAuthorized, signIn, signOut };
}
