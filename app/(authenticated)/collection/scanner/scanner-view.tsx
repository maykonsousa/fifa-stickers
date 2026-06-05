"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Camera, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isInAppBrowser } from "@/lib/detect-in-app-browser";
import { chooseCaptureMode, detectCaptureEnv, type CaptureMode } from "@/lib/scanner/choose-capture-mode";
import { snapToValidCode } from "@/lib/scanner/snap-to-valid-code";
import { recognizeFrame, terminateOcr } from "@/lib/scanner/recognize-frame";
import { lookupStickerByCode, type ScannedSticker } from "@/lib/scanner/lookup-sticker-by-code";
import { ScannerConfirmCard } from "./scanner-confirm-card";

type ScanState = "idle" | "reading" | "confirm" | "notfound";

export function ScannerView({ userId }: { userId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<CaptureMode | null>(null);
  const [validCodes, setValidCodes] = useState<string[]>([]);
  const [state, setState] = useState<ScanState>("idle");
  const [candidate, setCandidate] = useState<ScannedSticker | null>(null);
  const [lastRawText, setLastRawText] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);

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
      void terminateOcr();
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
      const snap = snapToValidCode(rawText, validCodes);
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

  // Captura um frame do vídeo e manda pro OCR.
  const captureFromVideo = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    setState("reading");
    const canvas = document.createElement("canvas");
    // Recorta a janela central de mira (60% largura x 30% altura).
    const cropW = video.videoWidth * 0.6;
    const cropH = video.videoHeight * 0.3;
    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(
      video,
      (video.videoWidth - cropW) / 2,
      (video.videoHeight - cropH) / 2,
      cropW,
      cropH,
      0,
      0,
      cropW,
      cropH,
    );
    const { rawText } = await recognizeFrame(canvas);
    await resolveRawText(rawText);
  }, [resolveRawText]);

  // Modo foto: lê o arquivo escolhido.
  const handlePhoto = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setState("reading");
      const { rawText } = await recognizeFrame(file);
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
      <p className="text-sm text-gray-400">Aponte para o código no verso da figurinha.</p>

      {mode === "live" && (
        <div className="relative overflow-hidden rounded-xl bg-black">
          <video ref={videoRef} autoPlay playsInline muted className="w-full" />
          {/* Janela de mira (60% x 30% central). */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[30%] w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-green-400/80" />
          <button
            onClick={captureFromVideo}
            disabled={state === "reading"}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-green-500 px-5 py-3 text-sm font-bold text-zinc-900 disabled:opacity-50"
          >
            {state === "reading" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
            Ler código
          </button>
        </div>
      )}

      {mode === "photo" && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
          <button
            onClick={() => {
              if (photoInputRef.current) {
                photoInputRef.current.value = "";
                photoInputRef.current.click();
              }
            }}
            disabled={state === "reading"}
            className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-5 py-3 text-sm font-bold text-zinc-900 disabled:opacity-50"
          >
            {state === "reading" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
            Tirar foto do código
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
