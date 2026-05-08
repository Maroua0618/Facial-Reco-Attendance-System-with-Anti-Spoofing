import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";

interface Props {
  onReady?: (video: HTMLVideoElement) => void;
  onFrame?: (canvas: HTMLCanvasElement) => void;
  intervalMs?: number;
  className?: string;
}

export function CameraFeed({ onReady, onFrame, intervalMs, className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        try {
          await v.play();
        } catch (err) {
          // React StrictMode remount can interrupt the first play() promise.
          // Browser surfaces it as AbortError. Ignore it.
          const name = (err as { name?: string })?.name;
          if (name && name !== "AbortError") throw err;
        }
        if (cancelled) return;
        setStreaming(true);
        onReady?.(v);
      } catch (e: unknown) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Camera access denied";
        setError(msg);
      }
    })();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      const v = videoRef.current;
      if (v) v.srcObject = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!streaming || !onFrame || !intervalMs) return;
    const id = setInterval(() => {
      const v = videoRef.current;
      const c = canvasRef.current;
      if (!v || !c) return;
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(v, 0, 0);
      onFrame(c);
    }, intervalMs);
    return () => clearInterval(id);
  }, [streaming, onFrame, intervalMs]);

  return (
    <Card className={className}>
      <div className="relative aspect-video bg-black rounded overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover transform -scale-x-100"
          playsInline
          muted
          autoPlay
        />
        <canvas ref={canvasRef} className="hidden" />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-destructive bg-background/80 text-sm p-4 text-center">
            {error}
          </div>
        )}
      </div>
    </Card>
  );
}
