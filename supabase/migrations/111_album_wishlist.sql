-- Lista de desejo por álbum: figurinhas que o usuário quer estocar mesmo já
-- tendo (alta demanda em trocas). Liga/desliga, sem quantidade.
CREATE TABLE public.album_wishlist (
  album_id   INT NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  sticker_id INT NOT NULL REFERENCES public.stickers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (album_id, sticker_id)
);

ALTER TABLE public.album_wishlist ENABLE ROW LEVEL SECURITY;

-- Só o dono do álbum lê/escreve a própria wishlist (mesmo padrão de user_stickers).
CREATE POLICY "album_wishlist_select_own"
  ON public.album_wishlist FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.albums a WHERE a.id = album_id AND a.user_id = auth.uid()));

CREATE POLICY "album_wishlist_insert_own"
  ON public.album_wishlist FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.albums a WHERE a.id = album_id AND a.user_id = auth.uid()));

CREATE POLICY "album_wishlist_delete_own"
  ON public.album_wishlist FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.albums a WHERE a.id = album_id AND a.user_id = auth.uid()));
