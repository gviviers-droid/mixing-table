import { useEffect, useRef } from "react";

interface WaveformProps {
  buffer: AudioBuffer | null;
  progress: number; // 0..1
}

export function Waveform({ buffer, progress }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    if (!buffer) {
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(0, height / 2 - 1, width, 2);
      return;
    }

    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const mid = height / 2;

    ctx.fillStyle = "rgba(120, 200, 255, 0.35)";
    for (let x = 0; x < width; x++) {
      let min = 1;
      let max = -1;
      const start = x * step;
      for (let i = 0; i < step; i++) {
        const sample = data[start + i] ?? 0;
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }
      ctx.fillRect(x, mid + min * mid, 1, Math.max(1, (max - min) * mid));
    }

    const playedWidth = width * Math.max(0, Math.min(1, progress));
    ctx.fillStyle = "rgba(120, 200, 255, 0.9)";
    ctx.fillRect(0, 0, playedWidth, 2);
  }, [buffer, progress]);

  return <canvas ref={canvasRef} width={480} height={64} className="waveform" />;
}
