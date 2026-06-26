import { redirect } from "next/navigation";
import { getAlbumContext } from "@/lib/albums/get-active-album";
import { ScannerView } from "./scanner-view";

export default async function ScannerPage() {
  const ctx = await getAlbumContext();
  if (!ctx) redirect("/login");

  return <ScannerView userId={ctx.userId} albumId={ctx.activeAlbumId} />;
}
