import type { AudioEngine } from "./AudioEngine";
import type { DeckId } from "./types";

/**
 * Ramps a deck's transition multiplier (and, if it holds the Apple Music
 * slot, MusicKit's player.volume in lockstep) from `from` to `to` over
 * `durationMs`. Used to fade a deck out before swapping its content, then
 * back in after - see mixerStore.sendToDeck.
 */
export function rampDeckAudibility(
  engine: AudioEngine,
  deck: DeckId,
  from: number,
  to: number,
  durationMs: number,
  appleMusicInstance: MusicKit.MusicKitInstance | null,
): Promise<void> {
  const applyStep = (value: number) => {
    engine.setTransitionMultiplier(deck, value);
    if (appleMusicInstance) {
      appleMusicInstance.volume = engine.getEffectiveGain(deck);
    }
  };

  if (durationMs <= 0) {
    applyStep(to);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min(1, (now - start) / durationMs);
      applyStep(from + (to - from) * t);
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    }
    requestAnimationFrame(tick);
  });
}
