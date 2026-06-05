"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Camera, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isInAppBrowser } from "@/lib/detect-in-app-browser";
import { chooseCaptureMode, detectCaptureEnv, type CaptureMode } from "@/lib/scanner/choose-capture-mode";
import { findCodeInText } from "@/lib/scanner/find-code-in-text";
import { recognizeFrame } from "@/lib/scanner/recognize-frame";
import { cropToJpegBase64 } from "@/lib/scanner/crop-frame";
import { loadImage } from "@/lib/scanner/load-image";
import { lookupStickerByCode, type ScannedSticker } from "@/lib/scanner/lookup-sticker-by-code";
import { ScannerConfirmCard } from "./scanner-confirm-card";

type ScanState = "idle" | "reading" | "confirm" | "notfound";

// Janela de mira: caixa grande que enquadra a figurinha inteira. Lemos a região
// toda e garimpamos o código entre as palavras (findCodeInText) — não é preciso
// mirar exatamente no código. O recorte do OCR usa exatamente estas frações.
const MIRA = { w: 0.82, h: 0.62 };

export function ScannerView({ userId }: { userId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<CaptureMode | null>(null);
  const [validCodes, setValidCodes] = useState<string[]>([]);
  const [state, setState] = useState<ScanState>("idle");
  const [candidate, setCandidate] = useState<ScannedSticker | null>(null);
  const [lastRawText, setLastRawText] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);

  const codesReady = validCodes.length > 0;

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Detecção de câmera é client-only (lê navigator) — feita no efeito pra
  // não divergir do render do servidor e causar hydration mismatch.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(chooseCaptureMode({ inApp: isInAppBrowser(), hasGetUserMedia: detectCaptureEnv().hasGetUserMedia }));
    const supabase = createClient();
    supabase
      .from("stickers")
      .select("code")
      .then(({ data }) => setValidCodes((data ?? []).map((r) => r.code as string)));
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Liga o stream de vídeo no modo live.
  useEffect(() => {
    if (mode !== "live") return;
    let active = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => {
        // Permissão negada / indisponível → cai pra foto.
        setMode("photo");
      });
    return () => {
      active = false;
    };
  }, [mode]);

  const resolveRawText = useCallback(
    async (rawText: string) => {
      setLastRawText(rawText);
      const snap = findCodeInText(rawText, validCodes);
      if (!snap) {
        setState("notfound");
        return;
      }
      const supabase = createClient();
      const sticker = await lookupStickerByCode(supabase, snap.code, userId);
      if (!sticker) {
        setState("notfound");
        return;
      }
      setCandidate(sticker);
      setState("confirm");
    },
    [validCodes, userId],
  );

  const captureFromVideo = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    setState("reading");
    const sw = video.videoWidth * MIRA.w;
    const sh = video.videoHeight * MIRA.h;
    const image = cropToJpegBase64(video, video.videoWidth, video.videoHeight, {
      sx: (video.videoWidth - sw) / 2,
      sy: (video.videoHeight - sh) / 2,
      sw,
      sh,
    });
    const rawText = await recognizeFrame(image);
    await resolveRawText(rawText);
  }, [resolveRawText]);

  const handlePhoto = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setState("reading");
      const img = await loadImage(file);
      const image = cropToJpegBase64(img, img.naturalWidth, img.naturalHeight);
      const rawText = await recognizeFrame(image);
      await resolveRawText(rawText);
    },
    [resolveRawText],
  );

  const backToReading = () => {
    setCandidate(null);
    setState("idle");
  };

  const handleLancar = async () => {
    if (!candidate) return;
    setBusy(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("user_stickers")
      .insert({ user_id: userId, sticker_id: candidate.id })
      .select("id")
      .single();
    const insertedId = data?.id as string | undefined;
    const wasRepeated = candidate.owned_count > 0;
    setSessionCount((n) => n + 1);
    setBusy(false);
    backToReading();
    toast.success(wasRepeated ? "Lançada! (repetida)" : "Lançada!", {
      action: insertedId
        ? {
            label: "Desfazer",
            onClick: async () => {
              await createClient().from("user_stickers").delete().eq("id", insertedId);
              setSessionCount((n) => Math.max(0, n - 1));
              toast.success("Lançamento desfeito");
            },
          }
        : undefined,
    });
  };

  const handleBuscarManual = () => {
    const q = (candidate?.code ?? lastRawText).trim();
    router.push(`/collection?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/collection")}
          className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Coleção
        </button>
        <span className="text-sm text-gray-400">Lançadas nesta sessão: {sessionCount}</span>
      </div>

      <h1 className="text-2xl font-bold text-white">Escanear figurinha</h1>
      <p className="text-sm text-gray-400">
        Enquadre a figurinha inteira na caixa — o código é detectado automaticamente.
      </p>

      {mode === "live" && (
        <div className="relative overflow-hidden rounded-xl bg-black">
          <video ref={videoRef} autoPlay playsInline muted className="w-full" />
          {/* Janela de mira — mesmas frações usadas no recorte do OCR (MIRA). */}
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-green-400/80"
            style={{ width: `${MIRA.w * 100}%`, height: `${MIRA.h * 100}%` }}
          />
          <button
            onClick={captureFromVideo}
            disabled={state === "reading" || !codesReady}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-green-500 px-5 py-3 text-sm font-bold text-zinc-900 disabled:opacity-50"
          >
            {state === "reading" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
            {!codesReady ? "Carregando…" : "Ler código"}
          </button>
        </div>
      )}

      {mode === "photo" && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="mb-3 text-xs text-gray-400">
            Tire a foto do verso da figurinha — o código é detectado automaticamente.
          </p>
          <button
            onClick={() => {
              if (photoInputRef.current) {
                photoInputRef.current.value = "";
                photoInputRef.current.click();
              }
            }}
            disabled={state === "reading" || !codesReady}
            className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-5 py-3 text-sm font-bold text-zinc-900 disabled:opacity-50"
          >
            {state === "reading" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
            {!codesReady ? "Carregando…" : "Tirar foto do código"}
          </button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhoto}
            className="hidden"
            aria-hidden="true"
          />
        </div>
      )}

      {mode === null && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-green-400" />
        </div>
      )}

      {state === "confirm" && candidate && (
        <ScannerConfirmCard
          sticker={candidate}
          busy={busy}
          onLancar={handleLancar}
          onDescartar={backToReading}
          onBuscarManual={handleBuscarManual}
        />
      )}

      {state === "notfound" && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
          <p className="text-sm text-yellow-300">
            Não consegui ler o código{lastRawText ? ` (li "${lastRawText.trim()}")` : ""}.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={backToReading}
              className="rounded-lg bg-green-500 px-4 py-2 text-sm font-bold text-zinc-900 hover:bg-green-400"
            >
              Tentar de novo
            </button>
            <button
              onClick={handleBuscarManual}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
            >
              Buscar manualmente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
