"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils";

export interface RecordedAudio {
  file: File;
  url: string;
  seconds: number;
}

/**
 * Voice capture for the nights you don't feel like typing (§6).
 *
 * The recording is handed to the parent as a File so it rides along with the
 * rest of the form — transcription happens server-side on save.
 */
export function VoiceRecorder({
  value,
  onChange,
  disabled,
}: {
  value: RecordedAudio | null;
  onChange: (audio: RecordedAudio | null) => void;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stopTimer();
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, [stopTimer]);

  async function start() {
    setError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setError("Recording needs a secure context (https or localhost).");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg",
      ].find((t) => MediaRecorder.isTypeSupported(t));

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        const ext = type.includes("mp4")
          ? "m4a"
          : type.includes("ogg")
            ? "ogg"
            : "webm";

        const seconds = Math.max(
          1,
          Math.round((Date.now() - startedAtRef.current) / 1000),
        );

        onChange({
          file: new File([blob], `voice-note.${ext}`, { type }),
          url: URL.createObjectURL(blob),
          seconds,
        });

        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsed(0);
      setRecording(true);

      timerRef.current = setInterval(() => {
        setElapsed(Math.round((Date.now() - startedAtRef.current) / 1000));
      }, 250);
    } catch {
      setError("Microphone access was denied.");
    }
  }

  function stop() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    stopTimer();
    setRecording(false);
  }

  function discard() {
    if (value) URL.revokeObjectURL(value.url);
    onChange(null);
  }

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-2.5">
        <audio
          controls
          src={value.url}
          className="h-9 min-w-0 flex-1"
          preload="metadata"
        />
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {formatDuration(value.seconds)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="iconSm"
          onClick={discard}
          disabled={disabled}
          aria-label="Discard voice note"
        >
          <Trash2 />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        type="button"
        variant={recording ? "danger" : "outline"}
        size="sm"
        onClick={recording ? stop : start}
        disabled={disabled}
        className="w-fit"
      >
        {recording ? (
          <>
            <Square className="fill-current" />
            Stop · {formatDuration(elapsed)}
          </>
        ) : (
          <>
            <Mic />
            Voice note
          </>
        )}
      </Button>
      {recording ? (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-1.5 animate-pulse rounded-full bg-danger" />
          Recording…
        </span>
      ) : null}
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}
