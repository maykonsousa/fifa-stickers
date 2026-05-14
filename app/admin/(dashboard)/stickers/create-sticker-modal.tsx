"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronsUpDown, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface Group {
  id: number;
  name: string;
  code: string;
}

interface ExistingSticker {
  group_id: number;
  number: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  groups: Group[];
  existingStickers: ExistingSticker[];
  defaultGroupId: number | null;
  onSubmit: (input: {
    groupId: number;
    code: string;
    number: number;
    title: string;
    description: string;
  }) => Promise<{ ok: true } | { ok: false; field?: "code"; message: string }>;
}

export function CreateStickerModal({
  open,
  onClose,
  groups,
  existingStickers,
  defaultGroupId,
  onSubmit,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [groupId, setGroupId] = useState<number | null>(defaultGroupId);
  const [groupOpen, setGroupOpen] = useState(false);
  const [code, setCode] = useState("");
  const [number, setNumber] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Open/close the native <dialog> imperatively. Parent uses `key` to remount
  // the component each time the modal opens, so state initialization happens
  // in useState above rather than here.
  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  const suggestedNumber = (() => {
    if (groupId == null) return "";
    const numbers = existingStickers
      .filter((s) => s.group_id === groupId)
      .map((s) => s.number);
    const max = numbers.length > 0 ? Math.max(...numbers) : 0;
    return String(max + 1);
  })();

  const numberValue = number === "" ? suggestedNumber : number;
  const selectedGroup = groups.find((g) => g.id === groupId) ?? null;

  const prefixWarning =
    selectedGroup && code.length > 0 && !code.toUpperCase().startsWith(selectedGroup.code)
      ? `O código não segue o padrão do grupo "${selectedGroup.code}".`
      : null;

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError(null);
    setGeneralError(null);

    if (groupId == null) {
      setGeneralError("Selecione um grupo.");
      return;
    }
    const trimmedCode = code.trim();
    if (trimmedCode.length === 0) {
      setCodeError("Informe o código da figurinha.");
      return;
    }
    const parsedNumber = Number(numberValue);
    if (!Number.isInteger(parsedNumber) || parsedNumber <= 0) {
      setGeneralError("Número precisa ser um inteiro positivo.");
      return;
    }

    if (
      selectedGroup &&
      !trimmedCode.toUpperCase().startsWith(selectedGroup.code) &&
      !window.confirm("O código não segue o padrão do grupo. Continuar?")
    ) {
      return;
    }

    setSubmitting(true);
    const result = await onSubmit({
      groupId,
      code: trimmedCode,
      number: parsedNumber,
      title,
      description,
    });
    setSubmitting(false);

    if (!result.ok) {
      if (result.field === "code") {
        setCodeError(result.message);
      } else {
        setGeneralError(result.message);
      }
      return;
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="create-sticker-title"
      className="fixed inset-0 m-auto w-full max-w-md rounded-xl bg-gray-800 p-0 text-white backdrop:bg-black/60"
      onClick={(e) => { if (e.target === dialogRef.current) handleClose(); }}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 id="create-sticker-title" className="text-lg font-bold">Adicionar figurinha</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-white text-xl"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Grupo</label>
          <Popover open={groupOpen} onOpenChange={setGroupOpen}>
            <PopoverTrigger className="mt-1 flex w-full items-center justify-between rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600 transition-colors">
              <span className={selectedGroup ? "text-white" : "text-gray-400"}>
                {selectedGroup ? selectedGroup.name : "Selecionar grupo"}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-gray-400" />
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              <Command
                filter={(value, search) => {
                  if (value.toLowerCase().includes(search.toLowerCase())) return 1;
                  return 0;
                }}
              >
                <CommandInput placeholder="Buscar grupo..." />
                <CommandList>
                  <CommandEmpty>Nenhum grupo encontrado.</CommandEmpty>
                  <CommandGroup>
                    {[...groups]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((g) => (
                        <CommandItem
                          key={g.id}
                          value={`${g.code} ${g.name}`}
                          onSelect={() => {
                            setGroupId(g.id);
                            setGroupOpen(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              groupId === g.id ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          {g.name}
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Código</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={selectedGroup ? `${selectedGroup.code}21` : "BRA21"}
            className="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white uppercase placeholder:text-gray-500 placeholder:normal-case focus:border-green-500 focus:ring-1 focus:ring-green-500"
            autoCapitalize="characters"
            autoComplete="off"
          />
          {codeError && (
            <p className="mt-1 text-xs text-red-400">{codeError}</p>
          )}
          {!codeError && prefixWarning && (
            <p className="mt-1 text-xs text-yellow-400">{prefixWarning}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Número</label>
          <input
            type="number"
            min={1}
            step={1}
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder={suggestedNumber || "1"}
            className="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
          {suggestedNumber && number === "" && (
            <p className="mt-1 text-xs text-gray-500">
              Sugestão para este grupo: {suggestedNumber}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Título</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nome do jogador, estádio, etc."
            className="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Descrição</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição opcional"
            className="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
        </div>

        {generalError && (
          <p className="text-xs text-red-400">{generalError}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Salvando..." : "Salvar"}
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="flex-1 rounded-lg bg-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-600 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </dialog>
  );
}
