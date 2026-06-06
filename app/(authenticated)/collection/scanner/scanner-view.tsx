"use client";

import { useState, useEffect, useRef, useCallback, useReducer } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Camera, ArrowLeft, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isInAppBrowser } from "@/lib/detect-in-app-browser";
import { chooseCaptureMode, detectCaptureEnv, type CaptureMode } from "@/lib/scanner/choose-capture-mode";
import { findCodeInText } from "@/lib/scanner/find-code-in-text";
import { recognizeFrame } from "@/lib/scanner/recognize-frame";
import { cropToJpegBase64 } from "@/lib/scanner/crop-frame";
import { loadImage } from "@/lib/scanner/load-image";
import { lookupStickerByCode, type ScannedSticker } from "@/lib/scanner/lookup-sticker-by-code";
import { resolveScanAction, type ScanMode } from "@/lib/scanner/resolve-scan-action";
import { toGray, meanAbsDiff, contentScore } from "@/lib/scanner/frame-metrics";
import { nextFrameSignal, initialFrameState, type FrameThresholds, type FrameState } from "@/lib/scanner/frame-signal";
import { scanFlowReducer, initialScanPhase } from "@/lib/scanner/scan-flow";
import { ScannerConfirmCard } from "./scanner-confirm-card";

// Janela de mira: caixa grande que enquadra a figurinha inteira. Lemos a região
// toda e garimpamos o código entre as palavras (findCodeInText) — não é preciso
// mirar exatamente no código. O recorte do OCR usa exatamente estas frações.
const MIRA = { w: 0.82, h: 0.62 };

// Modos do scanner e seus rótulos no seletor (segmented control).
const SCAN_MODES: ReadonlyArray<readonly [ScanMode, string]> = [
  ["lancamento", "Lançamento"],
  ["troca", "Troca"],
  ["baixa", "Baixa"],
];

// Amostragem on-device do gatilho. Tamanho pequeno = barato. Limiares calibrados
// contra a escala de contentScore (variância de luminância 0–~16k). Ajustar em
// dispositivo se disparar cedo/tarde demais.
const SAMPLE = { w: 64, h: 48 };
const SAMPLE_MS = 170; // ~6 amostras/s
const THRESHOLDS: FrameThresholds = {
  diff: 6,
  content: 400,
  rearmDiff: 14,
  stableSamples: 3,
};

export function ScannerView({ userId }: { userId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<CaptureMode | null>(null);
  const [validCodes, setValidCodes] = useState<string[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const [scanMode, setScanMode] = useState<ScanMode>("lancamento");
  const [phase, dispatch] = useReducer(scanFlowReducer, initialScanPhase);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [manualBusy, setManualBusy] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const phaseRef = useRef(phase);
  // Modo foto: trava o botão enquanto o OCR (chamada paga) está em voo.
  const [photoBusy, setPhotoBusy] = useState(false);

  const codesReady = validCodes.length > 0;

  const [flash, setFlash] = useState<{ color: "green" | "yellow" | "red"; text: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevSampleRef = useRef<Uint8Array | null>(null);
  const lastReadSampleRef = useRef<Uint8Array | null>(null);
  const signalStateRef = useRef<FrameState>(initialFrameState());
  const readingRef = useRef(false);
  const scanModeRef = useRef(scanMode);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
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

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    scanModeRef.current = scanMode;
    signalStateRef.current = initialFrameState();
    prevSampleRef.current = null;
    lastReadSampleRef.current = null;
  }, [scanMode]);

  const showFlash = useCallback((color: "green" | "yellow" | "red", text: string) => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlash({ color, text });
    flashTimerRef.current = setTimeout(() => setFlash(null), 1200);
  }, []);

  const executeScanAction = useCallback(
    async (sticker: ScannedSticker, activeMode: ScanMode) => {
      const { color, action, message } = resolveScanAction(activeMode, sticker.owned_count);
      const supabase = createClient();

      if (action === "add") {
        const { data } = await supabase
          .from("user_stickers")
          .insert({ user_id: userId, sticker_id: sticker.id })
          .select("id")
          .single();
        if (data?.id !== undefined) setSessionCount((n) => n + 1);
      } else if (action === "remove") {
        const { data: rows } = await supabase
          .from("user_stickers")
          .select("id")
          .eq("user_id", userId)
          .eq("sticker_id", sticker.id)
          .limit(1);
        const rowId = rows?.[0]?.id as number | undefined;
        if (rowId !== undefined) {
          await supabase.from("user_stickers").delete().eq("id", rowId);
          setSessionCount((n) => n + 1);
        }
      }
      // action === "none": nada a mutar.
      showFlash(color, `${sticker.code} — ${message}`);
    },
    [userId, showFlash],
  );

  const handleConfirm = useCallback(async () => {
    if (phaseRef.current.kind !== "confirming") return;
    const { sticker, mode: activeMode } = phaseRef.current;
    setConfirmBusy(true);
    try {
      await executeScanAction(sticker, activeMode);
    } catch {
      // Falha na escrita não pode travar o card (sem undo agora) — avisa e
      // volta a procurar pra o usuário tentar de novo.
      showFlash("red", "Erro ao salvar — tente de novo");
    } finally {
      setConfirmBusy(false);
      dispatch({ type: "confirm" });
    }
  }, [executeScanAction, showFlash]);

  const closeManual = useCallback(() => {
    setManualCode("");
    setManualError(null);
    dispatch({ type: "closeManual" });
  }, []);

  const handleManualSubmit = useCallback(async () => {
    if (manualBusy) return; // guarda contra Enter repetido / duplo submit em voo
    const code = manualCode.trim().toUpperCase();
    if (!code) return;
    setManualBusy(true);
    try {
      const sticker = await lookupStickerByCode(createClient(), code, userId);
      if (!sticker) {
        setManualError("Código não encontrado");
        return;
      }
      setManualCode("");
      setManualError(null);
      dispatch({ type: "manualResolved", sticker, mode: scanModeRef.current });
    } catch {
      setManualError("Erro ao buscar — tente de novo");
    } finally {
      setManualBusy(false);
    }
  }, [manualBusy, manualCode, userId]);

  // Tail comum às duas vias de captura (vídeo e foto): OCR → garimpa o código →
  // resolve a figurinha → executa a ação do modo. `activeMode` é capturado pelo
  // chamador no instante do disparo, pra honrar o modo em que a leitura começou.
  const resolveAndRun = useCallback(
    async (image: string, activeMode: ScanMode) => {
      const rawText = await recognizeFrame(image);
      const snap = findCodeInText(rawText, validCodes);
      if (!snap) {
        showFlash("red", "Não consegui ler");
        return;
      }
      const sticker = await lookupStickerByCode(createClient(), snap.code, userId);
      if (!sticker) {
        showFlash("red", "Código não encontrado");
        return;
      }
      dispatch({ type: "resolved", sticker, mode: activeMode });
    },
    [validCodes, userId, showFlash],
  );

  const autoCapture = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    const captureMode = scanModeRef.current;
    try {
      const sw = video.videoWidth * MIRA.w;
      const sh = video.videoHeight * MIRA.h;
      const image = cropToJpegBase64(video, video.videoWidth, video.videoHeight, {
        sx: (video.videoWidth - sw) / 2,
        sy: (video.videoHeight - sh) / 2,
        sw,
        sh,
      });
      await resolveAndRun(image, captureMode);
    } catch {
      showFlash("red", "Não consegui ler");
    }
  }, [resolveAndRun, showFlash]);

  const handlePhoto = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      // Modo foto não tem o gatilho on-device; o photoBusy trava o botão durante
      // o OCR (chamada paga) pra não disparar uma segunda leitura por toque duplo.
      setPhotoBusy(true);
      try {
        const img = await loadImage(file);
        const image = cropToJpegBase64(img, img.naturalWidth, img.naturalHeight);
        await resolveAndRun(image, scanModeRef.current);
      } catch {
        showFlash("red", "Não consegui ler");
      } finally {
        setPhotoBusy(false);
      }
    },
    [resolveAndRun, showFlash],
  );

  useEffect(() => {
    if (mode !== "live" || !codesReady) return;
    const timer = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || readingRef.current) return;
      if (phaseRef.current.kind !== "searching") return;

      const canvas = sampleCanvasRef.current ?? document.createElement("canvas");
      sampleCanvasRef.current = canvas;
      canvas.width = SAMPLE.w;
      canvas.height = SAMPLE.h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      const sw = video.videoWidth * MIRA.w;
      const sh = video.videoHeight * MIRA.h;
      ctx.drawImage(
        video,
        (video.videoWidth - sw) / 2,
        (video.videoHeight - sh) / 2,
        sw,
        sh,
        0,
        0,
        SAMPLE.w,
        SAMPLE.h,
      );
      const gray = toGray(ctx.getImageData(0, 0, SAMPLE.w, SAMPLE.h).data);
      const prev = prevSampleRef.current;
      const lastRead = lastReadSampleRef.current;
      const decision = nextFrameSignal(
        signalStateRef.current,
        {
          diffFromPrev: prev ? meanAbsDiff(gray, prev) : Infinity,
          content: contentScore(gray),
          diffFromLastRead: lastRead ? meanAbsDiff(gray, lastRead) : null,
        },
        THRESHOLDS,
      );
      prevSampleRef.current = gray;
      signalStateRef.current = decision.state;

      if (decision.kind === "fire") {
        lastReadSampleRef.current = gray;
        readingRef.current = true;
        void autoCapture().finally(() => {
          readingRef.current = false;
        });
      }
    }, SAMPLE_MS);
    return () => clearInterval(timer);
  }, [mode, codesReady, autoCapture]);

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
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-white/5 p-1">
        {SCAN_MODES.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={scanMode === value}
            onClick={() => setScanMode(value)}
            className={`rounded-md p-2 text-sm font-medium transition-colors ${
              scanMode === value ? "bg-green-500 text-zinc-900" : "text-gray-300 hover:bg-white/5"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-sm text-gray-400">
        Enquadre a figurinha inteira na caixa — o código é detectado automaticamente.
      </p>

      {phase.kind === "searching" && codesReady && (
        <button
          type="button"
          onClick={() => dispatch({ type: "openManual" })}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-300"
        >
          <Search className="h-3.5 w-3.5" /> Não leu? Digitar código
        </button>
      )}

      {mode === "live" && (
        <div className="relative overflow-hidden rounded-xl bg-black">
          <video ref={videoRef} autoPlay playsInline muted className="w-full" />
          {/* Janela de mira — mesmas frações usadas no recorte do OCR (MIRA).
              A borda pisca com a cor do resultado (verde/amarelo/vermelho). */}
          <div
            className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 transition-colors ${
              flash?.color === "green"
                ? "border-green-400"
                : flash?.color === "yellow"
                  ? "border-yellow-400"
                  : flash?.color === "red"
                    ? "border-red-500"
                    : "border-green-400/60"
            }`}
            style={{ width: `${MIRA.w * 100}%`, height: `${MIRA.h * 100}%` }}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-sm font-medium text-white">
            {!codesReady
              ? "Carregando…"
              : phase.kind !== "searching"
                ? "Confirme a figurinha"
                : flash
                  ? flash.text
                  : "Procurando figurinha…"}
          </div>
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
            disabled={!codesReady || photoBusy}
            className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-5 py-3 text-sm font-bold text-zinc-900 disabled:opacity-50"
          >
            {!codesReady || photoBusy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Camera className="h-5 w-5" />
            )}
            {!codesReady ? "Carregando…" : photoBusy ? "Lendo…" : "Tirar foto do código"}
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
          {flash && (
            <p
              className={`mt-3 text-sm font-medium ${
                flash.color === "green"
                  ? "text-green-400"
                  : flash.color === "yellow"
                    ? "text-yellow-400"
                    : "text-red-400"
              }`}
            >
              {flash.text}
            </p>
          )}
        </div>
      )}

      {phase.kind === "confirming" && (
        <ScannerConfirmCard
          sticker={phase.sticker}
          result={resolveScanAction(phase.mode, phase.sticker.owned_count)}
          busy={confirmBusy}
          onConfirm={handleConfirm}
          onReject={() => dispatch({ type: "reject" })}
          onManual={() => dispatch({ type: "openManual" })}
        />
      )}

      {phase.kind === "manual" && (
        <div className="rounded-xl border border-white/15 bg-zinc-900/95 p-4">
          <p className="mb-2 text-sm font-medium text-white">Digitar código</p>
          <input
            value={manualCode}
            onChange={(e) => {
              setManualCode(e.target.value);
              setManualError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleManualSubmit();
            }}
            autoFocus
            placeholder="ex.: MEX1"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white uppercase placeholder:text-gray-500 placeholder:normal-case"
          />
          {manualError && <p className="mt-1 text-xs text-red-400">{manualError}</p>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void handleManualSubmit()}
              disabled={manualBusy || !manualCode.trim()}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-green-500 px-3 py-2.5 text-sm font-bold text-zinc-900 hover:bg-green-400 disabled:opacity-50 transition-colors"
            >
              {manualBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Buscar
            </button>
            <button
              type="button"
              onClick={closeManual}
              disabled={manualBusy}
              className="rounded-lg border border-white/10 px-3 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/5 disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {mode === null && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-green-400" />
        </div>
      )}
    </div>
  );
}
