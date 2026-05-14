"use client";

import { useState } from "react";
import { ChevronsUpDown, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  }) => Promise<{ ok: true } | { ok: false; field?: "code"; message?: string }>;
}

export function CreateStickerModal({
  open,
  onClose,
  groups,
  existingStickers,
  defaultGroupId,
  onSubmit,
}: Props) {
  const [groupId, setGroupId] = useState<number | null>(defaultGroupId);
  const [groupOpen, setGroupOpen] = useState(false);
  const [number, setNumber] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

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
  const derivedCode =
    selectedGroup && numberValue !== "" ? `${selectedGroup.code}${numberValue}` : "";

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (groupId == null || !selectedGroup) {
      setGeneralError("Selecione um grupo.");
      return;
    }
    const parsedNumber = Number(numberValue);
    if (!Number.isInteger(parsedNumber) || parsedNumber <= 0) {
      setGeneralError("Número precisa ser um inteiro positivo.");
      return;
    }

    setSubmitting(true);
    const result = await onSubmit({
      groupId,
      code: `${selectedGroup.code}${parsedNumber}`,
      number: parsedNumber,
      title,
      description,
    });
    setSubmitting(false);

    if (!result.ok) {
      // Map any error to the general region. `field === "code"` (only `duplicate_code` uses it)
      // shows the same generic message — there is no separate Código input to highlight anymore.
      if (result.field === "code") {
        setGeneralError("Já existe figurinha com esse código.");
      } else {
        setGeneralError(result.message ?? null);
      }
      return;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md bg-gray-800 text-white p-0 border border-white/10">
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">Adicionar figurinha</DialogTitle>
          </DialogHeader>

        <div>
          <label className="block text-sm font-medium text-gray-300">Grupo</label>
          <Popover open={groupOpen} onOpenChange={setGroupOpen}>
            <PopoverTrigger
              aria-required="true"
              className="mt-1 flex w-full items-center justify-between rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600 transition-colors"
            >
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
          <div
            className="mt-1 flex w-full items-center rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm font-mono text-gray-300"
            aria-live="polite"
          >
            {derivedCode || <span className="text-gray-500">Selecione grupo e número</span>}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Gerado automaticamente a partir do grupo e número.
          </p>
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
            aria-required="true"
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
      </DialogContent>
    </Dialog>
  );
}
