import { redirect } from "next/navigation";
import { getAlbumContext } from "@/lib/albums/get-active-album";
import { AlbumsManager } from "./albums-manager";

export default async function AlbumsPage() {
  const ctx = await getAlbumContext();
  if (!ctx) redirect("/login");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">Meus álbuns</h1>
      <AlbumsManager
        albums={ctx.albums}
        activeAlbumId={ctx.activeAlbumId}
        publicAlbumId={ctx.publicAlbumId}
      />
    </div>
  );
}
