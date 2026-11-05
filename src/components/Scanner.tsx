"use client";

import jsQR from "jsqr";
import { useCallback, useEffect, useRef, useState } from "react";

interface Report {
  outcome: "VALID" | "ALREADY_USED" | "INVALID" | "UNPAID";
  message: string;
  customerName?: string;
  eventName?: string;
  reference?: string;
  quantity?: number;
  usedAt?: string;
}

interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

function detectorCtor(): BarcodeDetectorCtor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as { BarcodeDetector?: BarcodeDetectorCtor };
  return scope.BarcodeDetector ?? null;
}

function decodeFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): string | null {
  if (!video.videoWidth || !video.videoHeight) return null;

  const longest = Math.max(video.videoWidth, video.videoHeight);
  const scale = Math.min(1, 720 / longest);
  const width = Math.round(video.videoWidth * scale);
  const height = Math.round(video.videoHeight * scale);

  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(video, 0, 0, width, height);

  const frame = context.getImageData(0, 0, width, height);
  return jsQR(frame.data, width, height, { inversionAttempts: "attemptBoth" })?.data ?? null;
}

const OUTCOME_STYLES: Record<Report["outcome"], string> = {
  VALID: "border-accent/60 bg-accent-soft text-ink",
  ALREADY_USED: "border-line bg-surface text-ink",
  UNPAID: "border-hot/50 bg-hot-soft text-ink",
  INVALID: "border-hot/60 bg-hot-soft text-ink",
};

const OUTCOME_TEXT: Record<Report["outcome"], string> = {
  VALID: "text-accent",
  ALREADY_USED: "text-mute",
  UNPAID: "text-hot",
  INVALID: "text-hot",
};

const OUTCOME_LABELS: Record<Report["outcome"], string> = {
  VALID: "Admit",
  ALREADY_USED: "Already used",
  UNPAID: "Not paid",
  INVALID: "Invalid",
};

export function Scanner() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);
  const lastDecodeRef = useRef(0);
  const busyRef = useRef(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = useCallback(async (code: string) => {
    if (!code.trim() || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (response.status === 401) {
        window.location.href = "/scanner/login";
        return;
      }

      const data = (await response.json()) as Report & { error?: string };
      setReport(data);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(data.outcome === "VALID" ? 80 : [60, 60, 60]);
      }
    } catch {
      setReport({ outcome: "INVALID", message: "Network error — try again" });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setCameraActive(true);

      // BarcodeDetector is missing on iOS Safari; fall back to decoding frames
      // in JavaScript so the door can still use an iPhone.
      const Detector = detectorCtor();
      const detector = Detector ? new Detector({ formats: ["qr_code"] }) : null;

      const tick = async () => {
        const current = videoRef.current;
        if (!current || !streamRef.current) return;

        let value: string | null = null;
        const now = Date.now();
        try {
          if (detector) {
            const codes = await detector.detect(current);
            value = codes[0]?.rawValue ?? null;
          } else if (now - lastDecodeRef.current > 180) {
            lastDecodeRef.current = now;
            canvasRef.current ??= document.createElement("canvas");
            value = decodeFrame(current, canvasRef.current);
          }
        } catch {
          // Transient decode failures are expected while the camera focuses.
        }

        if (value) {
          const previous = lastScanRef.current;
          if (!previous || previous.code !== value || now - previous.at > 4000) {
            lastScanRef.current = { code: value, at: now };
            await submit(value);
          }
        }

        frameRef.current = requestAnimationFrame(() => {
          void tick();
        });
      };

      frameRef.current = requestAnimationFrame(() => {
        void tick();
      });
    } catch (error) {
      setCameraError(
        error instanceof Error ? `Camera unavailable: ${error.message}` : "Camera unavailable",
      );
    }
  }, [submit]);

  useEffect(() => stopCamera, [stopCamera]);

  useEffect(() => {
    if (report) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [report]);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-black">
        <video ref={videoRef} playsInline muted className="aspect-square w-full object-cover" />
        {!cameraActive ? (
          <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 bg-surface p-6 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-mute">
              Camera off
            </span>
            <span className="text-xs text-mute/60">Point the lens at the QR on the ticket</span>
          </div>
        ) : (
          <>
            <div className="viewfinder pointer-events-none absolute inset-0" />
            <span className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-hot" />
              Live
            </span>
          </>
        )}
      </div>

      <div className="flex gap-2">
        {cameraActive ? (
          <button onClick={stopCamera} className="btn-ghost flex-1">
            Stop camera
          </button>
        ) : (
          <button onClick={startCamera} className="btn-primary flex-1">
            Start camera
          </button>
        )}
      </div>

      {cameraError ? (
        <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-mute">
          {cameraError}
        </p>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit(manual);
          setManual("");
        }}
        className="flex gap-2"
      >
        <input
          value={manual}
          onChange={(event) => setManual(event.target.value)}
          placeholder="Paste a code or ticket link"
          className="input min-w-0 flex-1 !py-3"
        />
        <button type="submit" disabled={busy || !manual.trim()} className="btn-ghost">
          Check
        </button>
      </form>

      {report ? (
        <div
          ref={resultRef}
          className={`rounded-2xl border p-5 ${OUTCOME_STYLES[report.outcome]}`}
        >
          <p
            className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${OUTCOME_TEXT[report.outcome]}`}
          >
            {OUTCOME_LABELS[report.outcome]}
          </p>
          <p className="mt-1 text-lg font-semibold">{report.message}</p>
          {report.customerName ? (
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="opacity-60">Name</dt>
                <dd className="font-medium">{report.customerName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="opacity-60">Reference</dt>
                <dd className="font-mono text-xs">{report.reference}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="opacity-60">Admits</dt>
                <dd className="font-medium">{report.quantity}</dd>
              </div>
            </dl>
          ) : null}
          <button
            onClick={() => setReport(null)}
            className="mt-4 w-full rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-mute transition hover:border-accent/60 hover:text-ink"
          >
            Scan next
          </button>
        </div>
      ) : null}
    </div>
  );
}
