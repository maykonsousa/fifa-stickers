"use client";

import { useState, useCallback, useRef } from "react";
import Cropper from "react-easy-crop";
import { cropAndCompress, CropArea } from "@/lib/compress-image";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, Upload, Loader2, Check } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  stickerId: number;
  stickerCode: string;
  userId: string;
  onSuccess: (imageUrl: string) => void;
  onSkip?: () => void;
}

export function StickerImageUpload({
  open,
  onClose,
  stickerId,
  stickerCode,
  userId,
  onSuccess,
  onSkip,
}: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<CropArea | null>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback(
    (_: unknown, croppedAreaPixels: CropArea) => {
      setCroppedArea(croppedAreaPixels);
    },
    []
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!imageSrc || !croppedArea) return;
    setUploading(true);
    try {
      const blob = await cropAndCompress(imageSrc, croppedArea);
      const supabase = createClient();
      const path = `stickers/${stickerCode}.png`;

      await supabase.storage.from("sticker-images").upload(path, blob, {
        upsert: true,
        contentType: "image/webp",
      });

      const { data: urlData } = supabase.storage.from("sticker-images").getPublicUrl(path);
      const imageUrl = urlData.publicUrl;

      await supabase.from("stickers").update({ image_url: imageUrl }).eq("id", stickerId);
      await supabase.from("sticker_image_uploads").insert({
        user_id: userId,
        sticker_id: stickerId,
        image_url: imageUrl,
      });

      setDone(true);
      setTimeout(() => {
        onSuccess(imageUrl);
        handleClose();
      }, 600);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
    setUploading(false);
    setDone(false);
    onClose();
  };

  const openCamera = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
      cameraInputRef.current.click();
    }
  };

  const openGallery = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm bg-zinc-900/95 backdrop-blur-xl border border-white/15 shadow-2xl text-white p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-white text-base">
            Foto — {stickerCode}
          </DialogTitle>
        </DialogHeader>

        {!imageSrc ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-gray-400">
              Figurinha sem foto. Contribua com uma imagem ou pule esta etapa.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={openCamera}
                className="flex flex-col items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-colors"
              >
                <Camera className="w-5 h-5 text-emerald-400" />
                <span className="text-xs">Câmera</span>
              </button>
              <button
                onClick={openGallery}
                className="flex flex-col items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-colors"
              >
                <Upload className="w-5 h-5 text-blue-400" />
                <span className="text-xs">Galeria</span>
              </button>
            </div>
            {onSkip && (
              <button
                onClick={() => { onSkip(); handleClose(); }}
                className="w-full rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-400 hover:bg-white/5 hover:text-gray-300 transition-colors"
              >
                Pular e adicionar sem foto
              </button>
            )}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
              aria-hidden="true"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              aria-hidden="true"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden bg-black">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={2 / 3}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-yellow-400 h-1"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setImageSrc(null)}
                className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-gray-300 hover:bg-white/5 transition-colors"
              >
                Trocar
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || done}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-yellow-400 px-3 py-2 text-xs font-bold text-zinc-900 hover:bg-yellow-300 disabled:opacity-50 transition-colors"
              >
                {done ? (
                  <><Check className="w-3.5 h-3.5" /> OK</>
                ) : uploading ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando</>
                ) : (
                  "Confirmar"
                )}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
