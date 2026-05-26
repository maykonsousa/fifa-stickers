"use client";

export function ProfileStickersAlbum({
  userId: _userId,
  viewerId: _viewerId,
  groupId: _groupId,
  keyword: _keyword,
}: {
  userId: string;
  viewerId: string | null;
  groupId: number | null;
  keyword: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center text-sm text-gray-400">
      Modo álbum — em construção.
    </div>
  );
}
