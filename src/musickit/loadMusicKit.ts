let configured: Promise<MusicKit.MusicKitInstance> | null = null;

function waitForMusicKitGlobal(): Promise<void> {
  if (window.MusicKit) return Promise.resolve();
  return new Promise((resolve) => {
    document.addEventListener("musickitloaded", () => resolve(), {
      once: true,
    });
  });
}

/** Configures (once) and returns the single page-wide MusicKit instance. */
export function getMusicKitInstance(): Promise<MusicKit.MusicKitInstance> {
  if (configured) return configured;

  const developerToken = import.meta.env.VITE_MUSICKIT_DEVELOPER_TOKEN;
  if (!developerToken) {
    return Promise.reject(
      new Error(
        "VITE_MUSICKIT_DEVELOPER_TOKEN is not set. Run `npm run musickit:token` " +
          "(after configuring your Apple Developer credentials) and add the token " +
          "to a .env.local file. See README for setup steps.",
      ),
    );
  }

  configured = waitForMusicKitGlobal().then(() =>
    window.MusicKit.configure({
      developerToken,
      app: {
        name: import.meta.env.VITE_MUSICKIT_APP_NAME ?? "Mixing Table",
        build: import.meta.env.VITE_MUSICKIT_APP_BUILD ?? "0.1.0",
      },
    }),
  );

  return configured;
}
