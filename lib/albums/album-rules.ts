type Result = { ok: true } | { ok: false; error: string };

export function validateAlbumName(name: string, existingNames: string[]): Result {
  const trimmed = name.trim();
  if (trimmed.length === 0) return { ok: false, error: "Informe um nome." };
  const norm = (s: string) => s.trim().toLocaleLowerCase();
  if (existingNames.some((n) => norm(n) === norm(trimmed))) {
    return { ok: false, error: "Já existe um álbum com esse nome." };
  }
  return { ok: true };
}

export function canDeleteAlbum(input: {
  albumId: number;
  publicAlbumId: number;
  totalAlbums: number;
}): Result {
  if (input.albumId === input.publicAlbumId) {
    return { ok: false, error: "Não é possível excluir o álbum público." };
  }
  if (input.totalAlbums <= 1) {
    return { ok: false, error: "Você precisa ter ao menos um álbum." };
  }
  return { ok: true };
}
