"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StickerImageEditor } from "@/components/sticker-image-editor";

interface Props {
  open: boolean;
  onClose: () => void;
  stickerId: number;
  stickerCode: string;
  userId: string;
  onSuccess: (imageUrl: string) => void;
  onSkip?: () => void;
  currentImageUrl?: string | null;
  onRemove?: () => void;
  canReplace?: boolean;
}

export function StickerImageUpload({
  open,
  onClose,
  stickerId,
  stickerCode,
  userId,
  onSuccess,
  onSkip,
  currentImageUrl,
  onRemove,
  canReplace = false,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm bg-zinc-900/95 backdrop-blur-xl border border-white/15 shadow-2xl text-white p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-white text-base">Foto — {stickerCode}</DialogTitle>
        </DialogHeader>
        {open && (
          <StickerImageEditor
            key={stickerId}
            stickerId={stickerId}
            stickerCode={stickerCode}
            userId={userId}
            canReplace={canReplace}
            currentImageUrl={currentImageUrl}
            onSuccess={(url) => {
              onSuccess(url);
              onClose();
            }}
            onSkip={onSkip ? () => { onSkip(); onClose(); } : undefined}
            onRemove={onRemove ? () => { onRemove(); onClose(); } : undefined}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
