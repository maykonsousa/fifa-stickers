"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface UploadResult {
  file: string;
  status: "success" | "error";
  message?: string;
}

export default function AdminUploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [progress, setProgress] = useState(0);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    setFiles((prev) => [...prev, ...dropped]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files).filter((f) =>
        f.type.startsWith("image/")
      );
      setFiles((prev) => [...prev, ...selected]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setResults([]);
    setProgress(0);

    const supabase = createClient();
    const uploadResults: UploadResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = file.name.replace(/\.[^/.]+$/, "");
      const ext = file.name.split(".").pop();
      const code = fileName.toUpperCase();

      // Upload to Supabase Storage
      const path = `stickers/${code}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("sticker-images")
        .upload(path, file, { upsert: true });

      if (uploadError) {
        uploadResults.push({ file: file.name, status: "error", message: uploadError.message });
      } else {
        // Get public URL
        const { data: urlData } = supabase.storage
          .from("sticker-images")
          .getPublicUrl(path);

        // Update sticker record
        const { error: updateError } = await supabase
          .from("stickers")
          .update({ image_url: urlData.publicUrl })
          .eq("code", code);

        if (updateError) {
          uploadResults.push({
            file: file.name,
            status: "error",
            message: `Upload OK, mas figurinha "${code}" não encontrada no banco.`,
          });
        } else {
          uploadResults.push({ file: file.name, status: "success" });
        }
      }

      setProgress(Math.round(((i + 1) / files.length) * 100));
    }

    setResults(uploadResults);
    setUploading(false);
    setFiles([]);
    router.refresh();
  };

  const successCount = results.filter((r) => r.status === "success").length;
  const errorCount = results.filter((r) => r.status === "error").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Upload de Imagens</h1>
        <p className="mt-1 text-sm text-gray-400">
          Arraste imagens das figurinhas. O nome do arquivo deve ser o código (ex: BRA7.png, FWC1.jpg).
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-600 bg-gray-800/50 p-8 transition-colors hover:border-green-500"
      >
        <div className="text-center">
          <p className="text-lg text-gray-300">Arraste imagens aqui</p>
          <p className="mt-1 text-sm text-gray-500">ou</p>
          <label className="mt-3 inline-flex cursor-pointer items-center rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 transition-colors">
            Selecionar arquivos
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-300">{files.length} arquivo(s) selecionado(s)</p>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {uploading ? `Enviando... ${progress}%` : "Enviar todos"}
            </button>
          </div>

          {uploading && (
            <div className="h-2 overflow-hidden rounded-full bg-gray-700">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <div className="max-h-60 overflow-y-auto rounded-lg border border-gray-700 divide-y divide-gray-700">
            {files.map((file, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2 bg-gray-800/50">
                <span className="text-sm text-gray-300 truncate">{file.name}</span>
                <button
                  onClick={() => handleRemoveFile(i)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex gap-4">
            <span className="text-sm text-green-400">{successCount} sucesso</span>
            {errorCount > 0 && <span className="text-sm text-red-400">{errorCount} erro(s)</span>}
          </div>
          {results.filter((r) => r.status === "error").map((r, i) => (
            <div key={i} className="rounded-lg bg-red-900/30 border border-red-800 px-4 py-2">
              <p className="text-sm text-red-300">{r.file}: {r.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
