-- Seed Coca-Cola stickers (complete data)
INSERT INTO stickers (group_id, code, number, title, description) VALUES
((SELECT id FROM sticker_groups WHERE code = 'CC'), 'CC1', 1, 'Jamal Musiala', 'Alemanha'),
((SELECT id FROM sticker_groups WHERE code = 'CC'), 'CC2', 2, 'Harry Kane', 'Inglaterra'),
((SELECT id FROM sticker_groups WHERE code = 'CC'), 'CC3', 3, 'Santiago Giménez', 'México'),
((SELECT id FROM sticker_groups WHERE code = 'CC'), 'CC4', 4, 'Josip Šutalo', 'Croácia'),
((SELECT id FROM sticker_groups WHERE code = 'CC'), 'CC5', 5, 'Cristiano Ronaldo', 'Portugal'),
((SELECT id FROM sticker_groups WHERE code = 'CC'), 'CC6', 6, 'Jefferson Lerma', 'Colômbia'),
((SELECT id FROM sticker_groups WHERE code = 'CC'), 'CC7', 7, 'Romelu Lukaku', 'Bélgica'),
((SELECT id FROM sticker_groups WHERE code = 'CC'), 'CC8', 8, 'Emiliano Martínez', 'Argentina'),
((SELECT id FROM sticker_groups WHERE code = 'CC'), 'CC9', 9, 'Virgil van Dijk', 'Países Baixos'),
((SELECT id FROM sticker_groups WHERE code = 'CC'), 'CC10', 10, 'Alphonso Davies', 'Canadá'),
((SELECT id FROM sticker_groups WHERE code = 'CC'), 'CC11', 11, 'Raúl Jiménez', 'México'),
((SELECT id FROM sticker_groups WHERE code = 'CC'), 'CC12', 12, 'Gabriel Magalhães', 'Brasil'),
((SELECT id FROM sticker_groups WHERE code = 'CC'), 'CC13', 13, 'Lautaro Martínez', 'Argentina'),
((SELECT id FROM sticker_groups WHERE code = 'CC'), 'CC14', 14, 'Pedri', 'Espanha');
