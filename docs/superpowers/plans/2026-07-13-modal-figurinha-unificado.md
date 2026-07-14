# Modal de figurinha unificado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar os dois modais de figurinha da coleção (lista/álbum) num único `StickerDetailModal` com header (wishlist/código+nome/fechar), foto embutida (com upload), quantidade, footer de +/− e navegação entre figurinhas (setas + swipe).

**Architecture:** Extrair a lógica pura de navegação para `lib/collection/sticker-nav.ts` (com TDD). Extrair o miolo do upload para `components/sticker-image-editor.tsx` (sem Dialog) e transformar `StickerImageUpload` numa casca fina que o reusa (admin segue igual). Criar `StickerDetailModal` consumindo ambos. Reconfigurar `CollectionView` para navegação por índice.

**Tech Stack:** Next.js 16 (App Router, React 19), TypeScript, Tailwind v4, `@base-ui/react` (via shadcn), lucide-react, `react-easy-crop`, Supabase JS, Vitest (env `node`).

## Global Constraints

- **Testes:** o projeto só testa lógica pura (`lib/**/*.test.ts`, `app/**/*.test.ts`) com Vitest em ambiente `node`. **Não** existe Testing Library/jsdom — **não** criar testes de componente React. TDD aplica-se à `lib/collection/sticker-nav.ts`. Componentes verificam-se por `npx tsc --noEmit` + `npm run lint` + `npm test` + smoke manual.
- **Storage/egress:** manter o padrão de upload existente — `sticker-images`, `cacheControl: "31536000"`, cache-bust `?v=`, `contentType` conforme hoje. Não introduzir imagens grandes nem refetch desnecessário.
- **Sem migração de RPC:** não alterar `search_stickers` nem `get_public_stickers_album`. Wishlist do álbum vem de um `select` em `album_wishlist`.
- **Orientação na lista:** `StickerResult` não tem `orientation`; assumir `"portrait"` como padrão no modo lista.
- **Comportamento aprovado:** enviar/trocar foto **não** incrementa a quantidade. Quantidade muda só pelos botões do footer.
- **Escopo:** só a coleção. Não mexer no scanner nem no perfil público além de adicionar uma prop **opcional** a `ProfileStickersAlbum`.

---

### Task 1: Lógica pura de navegação (`lib/collection/sticker-nav.ts`)

**Files:**
- Create: `lib/collection/sticker-nav.ts`
- Test: `lib/collection/sticker-nav.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `interface NavSticker { id: number; code: string; title: string | null; image_url: string | null; orientation: "portrait" | "landscape"; owned_count: number; wishlisted: boolean }`
  - `listToNavList(rows: ListRow[]): NavSticker[]`
  - `albumToNavList(pages: AlbumPageLike[], wishlistedIds: Set<number>): NavSticker[]`
  - `canGoPrev(index: number): boolean`
  - `canGoNext(index: number, length: number, hasMore: boolean): boolean`
  - `resolveNext(index: number, length: number, hasMore: boolean): NextAction` onde `NextAction = { type: "move"; index: number } | { type: "loadMore" } | { type: "none" }`

- [ ] **Step 1: Escrever os testes que falham**

Create `lib/collection/sticker-nav.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  listToNavList,
  albumToNavList,
  canGoPrev,
  canGoNext,
  resolveNext,
} from "./sticker-nav";

describe("listToNavList", () => {
  it("preserva a ordem e assume orientation portrait", () => {
    const rows = [
      { id: 2, code: "B2", title: "Bola", image_url: "u2", owned_count: 0, wishlisted: true },
      { id: 1, code: "A1", title: null, image_url: null, owned_count: 3, wishlisted: false },
    ];
    const nav = listToNavList(rows);
    expect(nav.map((s) => s.id)).toEqual([2, 1]);
    expect(nav[0]).toEqual({
      id: 2, code: "B2", title: "Bola", image_url: "u2",
      orientation: "portrait", owned_count: 0, wishlisted: true,
    });
  });
});

describe("albumToNavList", () => {
  it("achata na ordem página→row→col e puxa wishlisted do Set", () => {
    const pages = [
      {
        page: 2,
        stickers: [
          { id: 30, code: "C", title: null, image_url: null, orientation: "portrait" as const, row: 1, col: 1, viewer_owned_count: 1 },
        ],
      },
      {
        page: 1,
        stickers: [
          { id: 20, code: "B", title: null, image_url: null, orientation: "landscape" as const, row: 1, col: 3, viewer_owned_count: 0 },
          { id: 10, code: "A", title: null, image_url: null, orientation: "portrait" as const, row: 1, col: 1, viewer_owned_count: 2 },
        ],
      },
    ];
    const nav = albumToNavList(pages, new Set([20]));
    expect(nav.map((s) => s.id)).toEqual([10, 20, 30]);
    expect(nav.find((s) => s.id === 20)?.wishlisted).toBe(true);
    expect(nav.find((s) => s.id === 10)?.wishlisted).toBe(false);
    expect(nav.find((s) => s.id === 10)?.owned_count).toBe(2);
  });
});

describe("canGoPrev / canGoNext", () => {
  it("canGoPrev só a partir do índice 1", () => {
    expect(canGoPrev(0)).toBe(false);
    expect(canGoPrev(1)).toBe(true);
  });
  it("canGoNext considera hasMore quando no fim", () => {
    expect(canGoNext(0, 3, false)).toBe(true);
    expect(canGoNext(2, 3, false)).toBe(false);
    expect(canGoNext(2, 3, true)).toBe(true);
  });
});

describe("resolveNext", () => {
  it("move quando há próximo item", () => {
    expect(resolveNext(0, 3, false)).toEqual({ type: "move", index: 1 });
  });
  it("loadMore no fim quando hasMore", () => {
    expect(resolveNext(2, 3, true)).toEqual({ type: "loadMore" });
  });
  it("none no fim sem hasMore", () => {
    expect(resolveNext(2, 3, false)).toEqual({ type: "none" });
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test -- sticker-nav`
Expected: FAIL — `Cannot find module './sticker-nav'`.

- [ ] **Step 3: Implementar `lib/collection/sticker-nav.ts`**

```ts
export interface NavSticker {
  id: number;
  code: string;
  title: string | null;
  image_url: string | null;
  orientation: "portrait" | "landscape";
  owned_count: number;
  wishlisted: boolean;
}

interface ListRow {
  id: number;
  code: string;
  title: string | null;
  image_url: string | null;
  owned_count: number;
  wishlisted: boolean;
}

interface AlbumRow {
  id: number;
  code: string;
  title: string | null;
  image_url: string | null;
  orientation: "portrait" | "landscape";
  row: number;
  col: number;
  viewer_owned_count: number;
}

interface AlbumPageLike {
  page: number;
  stickers: AlbumRow[];
}

export type NextAction =
  | { type: "move"; index: number }
  | { type: "loadMore" }
  | { type: "none" };

export function listToNavList(rows: ListRow[]): NavSticker[] {
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    title: r.title,
    image_url: r.image_url,
    orientation: "portrait",
    owned_count: r.owned_count,
    wishlisted: r.wishlisted,
  }));
}

export function albumToNavList(
  pages: AlbumPageLike[],
  wishlistedIds: Set<number>,
): NavSticker[] {
  const orderedPages = [...pages].sort((a, b) => a.page - b.page);
  const out: NavSticker[] = [];
  for (const p of orderedPages) {
    const stickers = [...p.stickers].sort(
      (a, b) => a.row - b.row || a.col - b.col,
    );
    for (const s of stickers) {
      out.push({
        id: s.id,
        code: s.code,
        title: s.title,
        image_url: s.image_url,
        orientation: s.orientation,
        owned_count: s.viewer_owned_count,
        wishlisted: wishlistedIds.has(s.id),
      });
    }
  }
  return out;
}

export function canGoPrev(index: number): boolean {
  return index > 0;
}

export function canGoNext(
  index: number,
  length: number,
  hasMore: boolean,
): boolean {
  return index < length - 1 || hasMore;
}

export function resolveNext(
  index: number,
  length: number,
  hasMore: boolean,
): NextAction {
  if (index < length - 1) return { type: "move", index: index + 1 };
  if (hasMore) return { type: "loadMore" };
  return { type: "none" };
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test -- sticker-nav`
Expected: PASS (todos os testes verdes).

- [ ] **Step 5: Commit**

```bash
git add lib/collection/sticker-nav.ts lib/collection/sticker-nav.test.ts
git commit -m "feat(collection): lógica pura de navegação de figurinhas"
```

---

### Task 2: Extrair `StickerImageEditor` e afinar `StickerImageUpload`

**Files:**
- Create: `components/sticker-image-editor.tsx`
- Modify: `components/sticker-image-upload.tsx` (vira casca fina)

**Interfaces:**
- Consumes: `cropAndCompress`, `CropArea` de `@/lib/compress-image`; `createClient` de `@/lib/supabase/client`.
- Produces:
  - `StickerImageEditor` com props: `{ stickerId: number; stickerCode: string; userId: string; onSuccess: (imageUrl: string) => void; onSkip?: () => void; onRemove?: () => void; onCancel?: () => void; currentImageUrl?: string | null; canReplace?: boolean }`. **Não** renderiza `Dialog` nem `DialogHeader`. Não fecha nada — só dispara callbacks.
  - `StickerImageUpload` mantém **exatamente** a API pública atual: `{ open, onClose, stickerId, stickerCode, userId, onSuccess, onSkip?, currentImageUrl?, onRemove?, canReplace? }`.

- [ ] **Step 1: Criar `components/sticker-image-editor.tsx`**

Mover todo o corpo do `StickerImageUpload` atual (tudo dentro de `<DialogContent>` **exceto** `<DialogHeader>`), preservando a lógica de crop/upload/remoção. Remover `handleClose`/`onClose` (o dono decide fechar). Adicionar `onCancel` opcional no ramo sem `imageSrc`.

```tsx
"use client";

import { useState, useCallback, useRef } from "react";
import Cropper from "react-easy-crop";
import { cropAndCompress, CropArea } from "@/lib/compress-image";
import { createClient } from "@/lib/supabase/client";
import { Camera, Upload, Loader2, Check, Trash2 } from "lucide-react";

interface Props {
  stickerId: number;
  stickerCode: string;
  userId: string;
  onSuccess: (imageUrl: string) => void;
  onSkip?: () => void;
  onRemove?: () => void;
  onCancel?: () => void;
  currentImageUrl?: string | null;
  canReplace?: boolean;
}

export function StickerImageEditor({
  stickerId,
  stickerCode,
  userId,
  onSuccess,
  onSkip,
  onRemove,
  onCancel,
  currentImageUrl,
  canReplace = false,
}: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<CropArea | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [done, setDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback(
    (_: unknown, croppedAreaPixels: CropArea) => {
      setCroppedArea(croppedAreaPixels);
    },
    [],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      setImageSrc(src);
      const img = new Image();
      img.onload = () => {
        setOrientation(img.naturalWidth > img.naturalHeight ? "landscape" : "portrait");
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!imageSrc || !croppedArea) return;
    setUploading(true);
    try {
      const blob = await cropAndCompress(imageSrc, croppedArea);
      const supabase = createClient();
      const path = `stickers/${stickerCode}.png`;

      const { error: uploadError } = await supabase.storage
        .from("sticker-images")
        .upload(path, blob, {
          upsert: canReplace,
          contentType: "image/webp",
          cacheControl: "31536000",
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("sticker-images").getPublicUrl(path);
      const imageUrl = `${urlData.publicUrl}?v=${Date.now()}`;

      await supabase.from("stickers").update({ image_url: imageUrl, orientation }).eq("id", stickerId);
      await supabase.from("sticker_image_uploads").insert({
        user_id: userId,
        sticker_id: stickerId,
        image_url: imageUrl,
      });

      setDone(true);
      setTimeout(() => onSuccess(imageUrl), 600);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    setRemoving(true);
    try {
      const supabase = createClient();
      const path = `stickers/${stickerCode}.png`;
      await supabase.storage.from("sticker-images").remove([path]);
      await supabase.from("stickers").update({ image_url: null }).eq("id", stickerId);
      onRemove?.();
    } catch (err) {
      console.error("Remove failed:", err);
    } finally {
      setRemoving(false);
    }
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

  if (!imageSrc) {
    return (
      <div className="flex flex-col gap-2">
        {currentImageUrl ? (
          <>
            <div className="relative w-full aspect-[49/63] rounded-lg overflow-hidden bg-black">
              <img src={currentImageUrl} alt={stickerCode} className="h-full w-full object-cover" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={openCamera} className="flex flex-col items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-colors">
                <Camera className="w-5 h-5 text-emerald-400" />
                <span className="text-xs">Câmera</span>
              </button>
              <button onClick={openGallery} className="flex flex-col items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-colors">
                <Upload className="w-5 h-5 text-blue-400" />
                <span className="text-xs">Galeria</span>
              </button>
            </div>
            <button onClick={handleRemoveImage} disabled={removing} className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50">
              <Trash2 className="w-3.5 h-3.5" />
              {removing ? "Removendo..." : "Remover imagem"}
            </button>
          </>
        ) : (
          <>
            <p className="text-xs text-gray-400">Figurinha sem foto. Contribua com uma imagem ou pule esta etapa.</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={openCamera} className="flex flex-col items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-colors">
                <Camera className="w-5 h-5 text-emerald-400" />
                <span className="text-xs">Câmera</span>
              </button>
              <button onClick={openGallery} className="flex flex-col items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-colors">
                <Upload className="w-5 h-5 text-blue-400" />
                <span className="text-xs">Galeria</span>
              </button>
            </div>
            {onSkip && (
              <button onClick={onSkip} className="w-full rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-400 hover:bg-white/5 hover:text-gray-300 transition-colors">
                Pular e adicionar sem foto
              </button>
            )}
          </>
        )}
        {onCancel && (
          <button onClick={onCancel} className="w-full rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            Cancelar
          </button>
        )}
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" aria-hidden="true" />
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className={`relative w-full rounded-lg overflow-hidden bg-black ${orientation === "landscape" ? "aspect-[5/3]" : "aspect-[3/4]"}`}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={orientation === "landscape" ? 5 / 3 : 3 / 4}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>
      <div role="radiogroup" aria-label="Orientação" className="inline-flex items-center self-center rounded-lg border border-white/10 bg-white/5 p-0.5 text-xs">
        <button type="button" role="radio" aria-checked={orientation === "portrait"} onClick={() => setOrientation("portrait")} className={`px-3 py-1.5 rounded-md transition-colors ${orientation === "portrait" ? "bg-yellow-400 text-zinc-900 font-medium" : "text-gray-300 hover:text-white"}`}>
          Retrato
        </button>
        <button type="button" role="radio" aria-checked={orientation === "landscape"} onClick={() => setOrientation("landscape")} className={`px-3 py-1.5 rounded-md transition-colors ${orientation === "landscape" ? "bg-yellow-400 text-zinc-900 font-medium" : "text-gray-300 hover:text-white"}`}>
          Paisagem
        </button>
      </div>
      <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-yellow-400 h-1" />
      <div className="flex gap-2">
        <button onClick={() => setImageSrc(null)} className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-gray-300 hover:bg-white/5 transition-colors">
          Trocar
        </button>
        <button onClick={handleUpload} disabled={uploading || done} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-yellow-400 px-3 py-2 text-xs font-bold text-zinc-900 hover:bg-yellow-300 disabled:opacity-50 transition-colors">
          {done ? (<><Check className="w-3.5 h-3.5" /> OK</>) : uploading ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando</>) : ("Confirmar")}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Reescrever `components/sticker-image-upload.tsx` como casca fina**

```tsx
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
```

- [ ] **Step 3: Verificar typecheck e lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sem erros. (A API pública de `StickerImageUpload` é idêntica, então o uso no admin `app/admin/(dashboard)/stickers/stickers-admin.tsx` continua compilando.)

- [ ] **Step 4: Smoke manual do admin**

Abrir o admin de stickers e conferir que o upload/troca de foto ainda funciona (câmera/galeria, crop, confirmar, remover). O comportamento deve ser idêntico ao anterior.

- [ ] **Step 5: Commit**

```bash
git add components/sticker-image-editor.tsx components/sticker-image-upload.tsx
git commit -m "refactor(upload): extrai StickerImageEditor sem Dialog"
```

---

### Task 3: Componente `StickerDetailModal`

**Files:**
- Create: `app/(authenticated)/collection/sticker-detail-modal.tsx`

**Interfaces:**
- Consumes: `NavSticker` de `@/lib/collection/sticker-nav`; `StickerImageEditor` de `@/components/sticker-image-editor`; `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` de `@/components/ui/dialog`.
- Produces: `StickerDetailModal` com props:

```ts
interface Props {
  open: boolean;
  onClose: () => void;
  sticker: NavSticker | null;
  userId: string;
  busy: boolean;
  wishlistBusy: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  navBusy: boolean;
  onPrev: () => void;
  onNext: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  onToggleWishlist: () => void;
  onImageUploaded: (imageUrl: string) => void;
  onImageRemoved: () => void;
}
```

- [ ] **Step 1: Implementar `app/(authenticated)/collection/sticker-detail-modal.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Minus,
  Loader2,
  Star,
  X,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
} from "lucide-react";
import { StickerImageEditor } from "@/components/sticker-image-editor";
import type { NavSticker } from "@/lib/collection/sticker-nav";

interface Props {
  open: boolean;
  onClose: () => void;
  sticker: NavSticker | null;
  userId: string;
  busy: boolean;
  wishlistBusy: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  navBusy: boolean;
  onPrev: () => void;
  onNext: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  onToggleWishlist: () => void;
  onImageUploaded: (imageUrl: string) => void;
  onImageRemoved: () => void;
}

const SWIPE_THRESHOLD = 50;

export function StickerDetailModal({
  open,
  onClose,
  sticker,
  userId,
  busy,
  wishlistBusy,
  hasPrev,
  hasNext,
  navBusy,
  onPrev,
  onNext,
  onIncrement,
  onDecrement,
  onToggleWishlist,
  onImageUploaded,
  onImageRemoved,
}: Props) {
  const [editing, setEditing] = useState(false);
  const swipeStartX = useRef<number | null>(null);
  const stickerId = sticker?.id;

  // Ao trocar de figurinha, sai do modo "trocar foto".
  useEffect(() => {
    setEditing(false);
  }, [stickerId]);

  // Navegação por teclado enquanto o modal está aberto.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      const t = e.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft" && hasPrev) onPrev();
      else if (e.key === "ArrowRight" && hasNext) onNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, hasPrev, hasNext, onPrev, onNext]);

  if (!sticker) return null;

  const showEditor = editing || !sticker.image_url;

  const onPointerDown = (e: React.PointerEvent) => {
    if (showEditor) return; // não sequestrar gestos do cropper
    swipeStartX.current = e.clientX;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (swipeStartX.current === null) return;
    const dx = e.clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (dx <= -SWIPE_THRESHOLD && hasNext) onNext();
    else if (dx >= SWIPE_THRESHOLD && hasPrev) onPrev();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="max-w-sm bg-zinc-900/95 backdrop-blur-xl border border-white/15 text-white p-4">
        {/* Header */}
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onToggleWishlist}
              disabled={wishlistBusy}
              aria-pressed={sticker.wishlisted}
              aria-label={sticker.wishlisted ? "Remover da lista de desejo" : "Adicionar à lista de desejo"}
              className={`shrink-0 rounded-full p-2 transition-colors disabled:opacity-50 ${
                sticker.wishlisted ? "text-green-400" : "text-gray-400 hover:text-white"
              }`}
            >
              {wishlistBusy ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Star className="w-5 h-5" fill={sticker.wishlisted ? "currentColor" : "none"} />
              )}
            </button>
            <DialogTitle className="min-w-0 flex-1 text-center text-white text-base">
              {sticker.code}
              {sticker.title && (
                <span className="block text-xs font-normal text-gray-400 truncate mt-0.5">
                  {sticker.title}
                </span>
              )}
            </DialogTitle>
            <button
              type="button"
              onClick={() => !busy && onClose()}
              disabled={busy}
              aria-label="Fechar"
              className="shrink-0 rounded-full p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        {/* Foto + navegação */}
        <div className="relative" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
          <button
            type="button"
            onClick={onPrev}
            disabled={!hasPrev}
            aria-label="Figurinha anterior"
            className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!hasNext}
            aria-label="Próxima figurinha"
            className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 disabled:opacity-20 disabled:cursor-not-allowed"
          >
            {navBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
          </button>

          <div className="px-8 py-2">
            {showEditor ? (
              <StickerImageEditor
                key={sticker.id}
                stickerId={sticker.id}
                stickerCode={sticker.code}
                userId={userId}
                canReplace={!!sticker.image_url}
                currentImageUrl={sticker.image_url}
                onSuccess={(url) => {
                  onImageUploaded(url);
                  setEditing(false);
                }}
                onRemove={() => {
                  onImageRemoved();
                  setEditing(false);
                }}
                onCancel={editing ? () => setEditing(false) : undefined}
              />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`relative w-32 overflow-hidden rounded-lg bg-black ${
                    sticker.orientation === "landscape" ? "aspect-[5/3]" : "aspect-[49/63]"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sticker.image_url!} alt={sticker.code} className="h-full w-full object-cover" />
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  <ImagePlus className="w-3.5 h-3.5" /> Trocar foto
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quantidade */}
        <div className="py-2 text-center">
          <p className="text-xs text-gray-400">Quantidade no álbum</p>
          <p className="mt-1 text-3xl font-bold text-white tabular-nums">{sticker.owned_count}</p>
        </div>

        {/* Footer actions */}
        <div className="flex w-full gap-2">
          <button
            type="button"
            onClick={onDecrement}
            disabled={busy || sticker.owned_count === 0}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Minus className="w-4 h-4" /> Remover 1</>}
          </button>
          <button
            type="button"
            onClick={onIncrement}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-500/20 px-3 py-2.5 text-sm font-medium text-green-400 hover:bg-green-500/30 disabled:opacity-50 transition-colors"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Adicionar 1</>}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verificar typecheck e lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add app/\(authenticated\)/collection/sticker-detail-modal.tsx
git commit -m "feat(collection): componente StickerDetailModal unificado"
```

---

### Task 4: Ligar `CollectionView`, reportar páginas do álbum e remover `StickerActionsModal`

**Files:**
- Modify: `app/(authenticated)/collection/collection-view.tsx`
- Modify: `app/p/[username]/profile-stickers-album.tsx` (adicionar prop opcional `onPagesChange`)
- Delete: `app/(authenticated)/collection/sticker-actions-modal.tsx`

**Interfaces:**
- Consumes: `listToNavList`, `albumToNavList`, `canGoPrev`, `canGoNext`, `resolveNext`, `NavSticker` de `@/lib/collection/sticker-nav`; `StickerDetailModal` de `./sticker-detail-modal`.
- Produces: nada exportado novo. `ProfileStickersAlbum` ganha prop opcional `onPagesChange?: (pages: { page: number; stickers: AlbumSticker[] }[]) => void`.

- [ ] **Step 1: `ProfileStickersAlbum` reporta as páginas exibidas ao pai**

Em `app/p/[username]/profile-stickers-album.tsx`:

1. Adicionar `onPagesChange` à assinatura de props (interface inline do componente):

```tsx
export function ProfileStickersAlbum({
  albumId,
  viewerAlbumId,
  groupId,
  keyword,
  onStickerClick,
  overrides,
  onPagesChange,
}: {
  albumId: number;
  viewerAlbumId: number | null;
  groupId: number | null;
  keyword: string;
  onStickerClick?: (sticker: AlbumSticker) => void;
  overrides?: Record<number, AlbumOverride>;
  onPagesChange?: (pages: AlbumPage[]) => void;
}) {
```

2. Logo após o `displayPages` (useMemo), reportar ao pai quando mudar:

```tsx
  useEffect(() => {
    onPagesChange?.(displayPages);
  }, [displayPages, onPagesChange]);
```

(`AlbumPage` já é `{ page: number; groupName: string; stickers: AlbumSticker[] }`, compatível estruturalmente com o `AlbumPageLike` de `albumToNavList`.)

- [ ] **Step 2: Reescrever a parte de estado/handlers/modais de `CollectionView`**

Em `app/(authenticated)/collection/collection-view.tsx`:

**2a. Imports** — remover `StickerActionsModal`; trocar o uso direto de `StickerImageUpload` pelo novo modal:

```tsx
import { StickerCard } from "@/app/p/[username]/sticker-card";
import { ProfileStickersAlbum, type AlbumOverride } from "@/app/p/[username]/profile-stickers-album";
import { StickerLegend } from "@/app/p/[username]/sticker-legend";
import { StickerDetailModal } from "./sticker-detail-modal";
import {
  listToNavList,
  albumToNavList,
  canGoPrev,
  canGoNext,
  resolveNext,
} from "@/lib/collection/sticker-nav";
```

(Remover as linhas de import de `StickerImageUpload` e `StickerActionsModal`. Adicionar `useMemo` ao import de `react`.)

Também importar o tipo das páginas do álbum. `AlbumSticker` não é exportado hoje; para evitar exportá-lo, tipar `albumPages` estruturalmente:

```tsx
type AlbumPageForNav = {
  page: number;
  stickers: {
    id: number;
    code: string;
    title: string | null;
    image_url: string | null;
    orientation: "portrait" | "landscape";
    row: number;
    col: number;
    viewer_owned_count: number;
  }[];
};
```

**2b. Estado** — remover `uploadSticker` e `actionsSticker`; adicionar:

```tsx
  const [navIndex, setNavIndex] = useState<number | null>(null);
  const [pendingAdvance, setPendingAdvance] = useState(false);
  const [wishlistedIds, setWishlistedIds] = useState<Set<number>>(new Set());
  const [albumPages, setAlbumPages] = useState<AlbumPageForNav[]>([]);
```

**2c. Buscar wishlist do álbum** (uma vez por `albumId`):

```tsx
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("album_wishlist")
      .select("sticker_id")
      .eq("album_id", albumId)
      .then(({ data }) => {
        setWishlistedIds(new Set((data ?? []).map((r) => r.sticker_id as number)));
      });
  }, [albumId]);
```

**2d. Lista de navegação normalizada:**

```tsx
  const navList = useMemo(
    () =>
      viewMode === "list"
        ? listToNavList(results)
        : albumToNavList(albumPages, wishlistedIds),
    [viewMode, results, albumPages, wishlistedIds],
  );
```

**2e. Fechar o modal ao trocar de visão** (índices divergem entre lista e álbum):

```tsx
  useEffect(() => {
    setNavIndex(null);
    setPendingAdvance(false);
  }, [viewMode]);
```

**2f. `handleCardClick` passa a só abrir o modal:**

```tsx
  const handleCardClick = (sticker: { id: number }) => {
    const idx = navList.findIndex((s) => s.id === sticker.id);
    if (idx >= 0) setNavIndex(idx);
  };
```

(Remover os ramos antigos de `owned_count`/`image_url`/`doIncrement` direto.)

**2g. Navegação com load-more contínuo (modo lista):**

```tsx
  const hasMoreForNav = viewMode === "list" && hasMore;
  const currentSticker = navIndex !== null ? navList[navIndex] ?? null : null;
  const modalHasPrev = navIndex !== null && canGoPrev(navIndex);
  const modalHasNext =
    navIndex !== null && canGoNext(navIndex, navList.length, hasMoreForNav);

  const handleNavPrev = () => {
    if (navIndex !== null && canGoPrev(navIndex)) setNavIndex(navIndex - 1);
  };

  const handleNavNext = () => {
    if (navIndex === null) return;
    const action = resolveNext(navIndex, navList.length, hasMoreForNav);
    if (action.type === "move") {
      setNavIndex(action.index);
    } else if (action.type === "loadMore") {
      setPendingAdvance(true);
      setPage((p) => p + 1);
    }
  };

  // Quando a próxima página chega, avança o índice.
  useEffect(() => {
    if (!pendingAdvance) return;
    if (navIndex !== null && navIndex < navList.length - 1) {
      setNavIndex(navIndex + 1);
      setPendingAdvance(false);
    } else if (!loadingMore) {
      // Página carregou e não cresceu o suficiente — desiste do avanço.
      setPendingAdvance(false);
    }
  }, [navList.length, loadingMore, pendingAdvance, navIndex]);
```

**2h. Ações do modal** (usando `currentSticker`):

```tsx
  const handleModalIncrement = async () => {
    if (!currentSticker) return;
    await doIncrement(currentSticker.id);
  };

  const handleModalDecrement = async () => {
    if (!currentSticker) return;
    await doDecrement(currentSticker.id);
  };

  const handleModalToggleWishlist = async () => {
    if (!currentSticker) return;
    const stickerId = currentSticker.id;
    const next = !currentSticker.wishlisted;
    setWishlistBusy(true);
    const supabase = createClient();
    if (next) {
      await supabase.from("album_wishlist").insert({ album_id: albumId, sticker_id: stickerId });
    } else {
      await supabase.from("album_wishlist").delete().eq("album_id", albumId).eq("sticker_id", stickerId);
    }
    setResults((prev) => prev.map((s) => (s.id === stickerId ? { ...s, wishlisted: next } : s)));
    setWishlistedIds((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(stickerId);
      else copy.delete(stickerId);
      return copy;
    });
    setWishlistBusy(false);
    toast.success(next ? "Adicionada à lista de desejo!" : "Removida da lista de desejo!");
  };

  const handleModalImageUploaded = (imageUrl: string) => {
    if (!currentSticker) return;
    setImageLocal(currentSticker.id, imageUrl);
    toast.success("Foto atualizada!");
  };

  const handleModalImageRemoved = () => {
    if (!currentSticker) return;
    setImageLocal(currentSticker.id, null);
  };
```

**2i. Remover handlers órfãos:** apagar `handleActionsIncrement`, `handleActionsDecrement`, o antigo `doToggleWishlist`, `handleSkipUpload`, `handleUploadSuccess` (substituídos acima). Manter `doIncrement`, `doDecrement`, `incrementLocal`, `decrementLocal`, `bumpOverride`, `setImageLocal`.

> Nota: `doIncrement`/`doDecrement` já chamam `incrementLocal`/`decrementLocal` (atualizam `results`) **e** `bumpOverride` (atualizam overrides do álbum). Isso mantém `navList` reativo nas duas visões — no álbum, o override recomputa `displayPages` no filho, que reporta via `onPagesChange` e atualiza `albumPages`.

**2j. Passar `onPagesChange` ao álbum:**

```tsx
        <ProfileStickersAlbum
          albumId={albumId}
          viewerAlbumId={albumId}
          groupId={groupId}
          keyword={keyword}
          overrides={albumOverrides}
          onPagesChange={setAlbumPages}
          onStickerClick={(s) => handleCardClick({ id: s.id })}
        />
```

**2k. Substituir os dois modais renderizados** (`StickerImageUpload` + `StickerActionsModal`) por um só:

```tsx
      <StickerDetailModal
        open={navIndex !== null}
        onClose={() => setNavIndex(null)}
        sticker={currentSticker}
        userId={userId}
        busy={adding}
        wishlistBusy={wishlistBusy}
        hasPrev={modalHasPrev}
        hasNext={modalHasNext}
        navBusy={pendingAdvance}
        onPrev={handleNavPrev}
        onNext={handleNavNext}
        onIncrement={handleModalIncrement}
        onDecrement={handleModalDecrement}
        onToggleWishlist={handleModalToggleWishlist}
        onImageUploaded={handleModalImageUploaded}
        onImageRemoved={handleModalImageRemoved}
      />
```

**2l.** A prop `wishlisted` passada ao `StickerCard` no modo lista (`sticker.wishlisted`) continua igual. Opcional: passar `wishlisted={wishlistedIds.has(s.id)}` ao `StickerCard` do álbum em `profile-stickers-album.tsx` para o badge aparecer lá — **fora do escopo mínimo**, deixar como está salvo pedido futuro.

- [ ] **Step 3: Deletar `sticker-actions-modal.tsx`**

```bash
git rm app/\(authenticated\)/collection/sticker-actions-modal.tsx
```

- [ ] **Step 4: Verificar typecheck, lint e testes**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: sem erros de tipo/lint; todos os testes de `lib/` verdes (incl. `sticker-nav`).

- [ ] **Step 5: Smoke manual da coleção**

Rodar o app (`/run` ou `npm run dev`) e validar na coleção:
1. **Lista** — clicar numa figurinha possuída abre o modal com foto, quantidade e footer; +1/−1 atualizam o número; ★ no header liga/desliga wishlist (toast).
2. **Lista** — clicar numa figurinha sem foto abre o modal com o editor embutido; quantidade/footer/wishlist continuam ativos; enviar foto **não** muda a quantidade.
3. **Navegação** — setas ‹ › trocam de figurinha; nos extremos ficam desabilitadas; ao chegar no fim da página com scroll infinito disponível, › mostra spinner, carrega e avança.
4. **Swipe** — no mobile/touch, arrastar pro lado troca de figurinha (quando mostrando foto, não no editor).
5. **Álbum** — mesmo comportamento; ★ wishlist agora funciona; navegação percorre página→row→col.
6. Trocar entre lista/álbum fecha o modal sem erro de índice.

- [ ] **Step 6: Commit**

```bash
git add app/\(authenticated\)/collection/collection-view.tsx app/p/\[username\]/profile-stickers-album.tsx
git commit -m "feat(collection): modal unificado de figurinha com navegação e wishlist nas duas visões"
```

---

## Self-Review (cobertura do spec)

- Header (wishlist / código+nome / fechar) → Task 3 Step 1. ✅
- Foto embutida + 3 estados (imagem / editor / crop) → Task 3 (`showEditor`) + Task 2 (editor). ✅
- Quantidade + footer +/− → Task 3. ✅
- Todo clique abre modal, sem +1 direto → Task 4 (2f). ✅
- Foto desacoplada da quantidade → Task 4 (`handleModalImageUploaded` não incrementa). ✅
- Wishlist nas duas visões sem migração → Task 4 (2c, 2h) + `albumToNavList`. ✅
- Navegação respeitando filtros/ordem, extremos desabilitam → Task 1 + Task 4 (2g). ✅
- Load-more contínuo na lista paginada → Task 4 (2g `resolveNext`/`pendingAdvance`). ✅
- Álbum percorre página→row→col → Task 1 `albumToNavList` (testado). ✅
- Swipe + setas → Task 3 Step 1. ✅
- Dialog centralizado → Task 3 (base `Dialog`). ✅
- `StickerImageUpload` preservado p/ admin → Task 2. ✅
- `StickerActionsModal` removido → Task 4 Step 3. ✅
