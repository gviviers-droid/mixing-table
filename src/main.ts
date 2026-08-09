import { AudioEngine } from "./audio/AudioEngine";
import "./style.css";

const audioEl = document.getElementById("audio-el") as HTMLAudioElement;
const fileInput = document.getElementById("file-input") as HTMLInputElement;

const engine = new AudioEngine(audioEl);

function bindRange(id: string, onChange: (value: number) => void): void {
  const el = document.getElementById(id) as HTMLInputElement;
  el.addEventListener("input", () => onChange(Number(el.value)));
}

function bindCheckbox(id: string, onChange: (checked: boolean) => void): void {
  const el = document.getElementById(id) as HTMLInputElement;
  el.addEventListener("change", () => onChange(el.checked));
}

// Reverb controls
bindRange("reverb-mix", (v) => engine.reverb.setMix(v / 100));
bindRange("reverb-decay", (v) => engine.reverb.setDecay(v / 10));
bindRange("reverb-predelay", (v) => engine.reverb.setPreDelay(v));
bindCheckbox("reverb-bypass", (checked) => engine.reverb.setBypass(checked));

// Delay controls
bindRange("delay-mix", (v) => engine.delay.setMix(v / 100));
bindRange("delay-time", (v) => engine.delay.setTime(v));
bindRange("delay-feedback", (v) => engine.delay.setFeedback(v / 100));
bindRange("delay-tone", (v) => engine.delay.setTone(v));
bindCheckbox("delay-bypass", (checked) => engine.delay.setBypass(checked));

// Master
bindRange("master-volume", (v) => engine.setMasterVolume(v / 100));

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  audioEl.src = URL.createObjectURL(file);
});

audioEl.addEventListener(
  "play",
  async () => {
    engine.connectSource();
    await engine.resume();
  },
  { once: false }
);
