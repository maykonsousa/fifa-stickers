-- Auto-generated: Update sticker titles for all teams
-- Position 1 = Escudo, Position 13 = Equipe, 2-12 and 14-20 = Players

-- Set Escudo (pos 1) and Equipe (pos 13) for all teams except Alemanha
UPDATE stickers SET title = 'Escudo'
WHERE number = 1 AND group_id IN (
  SELECT id FROM sticker_groups WHERE type = 'team' AND code != 'GER'
);

UPDATE stickers SET title = 'Equipe'
WHERE number = 13 AND group_id IN (
  SELECT id FROM sticker_groups WHERE type = 'team' AND code != 'GER'
);

-- México (MEX)
UPDATE stickers SET title = 'Luis Malagón' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MEX');
UPDATE stickers SET title = 'Johan Vásquez' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MEX');
UPDATE stickers SET title = 'Jorge Sánchez' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MEX');
UPDATE stickers SET title = 'César Montes' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MEX');
UPDATE stickers SET title = 'Jesús Gallardo' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MEX');
UPDATE stickers SET title = 'Israel Reyes' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MEX');
UPDATE stickers SET title = 'Diego Lainez' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MEX');
UPDATE stickers SET title = 'Carlos Rodríguez' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MEX');
UPDATE stickers SET title = 'Edson Álvarez' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MEX');
UPDATE stickers SET title = 'Orbelín Pineda' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MEX');
UPDATE stickers SET title = 'Marcel Ruiz' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MEX');
UPDATE stickers SET title = 'Érick Sánchez' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MEX');
UPDATE stickers SET title = 'Hirving Lozano' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MEX');
UPDATE stickers SET title = 'Santiago Giménez' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MEX');
UPDATE stickers SET title = 'Raúl Jiménez' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MEX');
UPDATE stickers SET title = 'Alexis Vega' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MEX');
UPDATE stickers SET title = 'Roberto Alvarado' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MEX');
UPDATE stickers SET title = 'César Huerta' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MEX');

-- África do Sul (RSA)
UPDATE stickers SET title = 'Ronwen Williams' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'RSA');
UPDATE stickers SET title = 'Sipho Chaine' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'RSA');
UPDATE stickers SET title = 'Aubrey Modiba' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'RSA');
UPDATE stickers SET title = 'Samukele Kabini' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'RSA');
UPDATE stickers SET title = 'Mbekezeli Mbokazi' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'RSA');
UPDATE stickers SET title = 'Khulumani Ndamane' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'RSA');
UPDATE stickers SET title = 'Siyabonga Ngezana' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'RSA');
UPDATE stickers SET title = 'Khuliso Mudau' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'RSA');
UPDATE stickers SET title = 'Nkosinathi Sibisi' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'RSA');
UPDATE stickers SET title = 'Teboho Mokoena' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'RSA');
UPDATE stickers SET title = 'Thalente Mbatha' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'RSA');
UPDATE stickers SET title = 'Bathuisi Aubaas' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'RSA');
UPDATE stickers SET title = 'Yaya Sithole' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'RSA');
UPDATE stickers SET title = 'Sipho Mbule' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'RSA');
UPDATE stickers SET title = 'Lyle Foster' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'RSA');
UPDATE stickers SET title = 'Ioraam Rayners' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'RSA');
UPDATE stickers SET title = 'Mohau Nkota' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'RSA');
UPDATE stickers SET title = 'Oswin Appolis' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'RSA');

-- Coreia do Sul (KOR)
UPDATE stickers SET title = 'Hyeon-woo Jo' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KOR');
UPDATE stickers SET title = 'Seung-Gyu Kim' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KOR');
UPDATE stickers SET title = 'Min-jae Kim' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KOR');
UPDATE stickers SET title = 'Yu-min Cho' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KOR');
UPDATE stickers SET title = 'Young-woo Seol' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KOR');
UPDATE stickers SET title = 'Han-beom Lee' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KOR');
UPDATE stickers SET title = 'Tae-seok Lee' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KOR');
UPDATE stickers SET title = 'Myung-jae Lee' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KOR');
UPDATE stickers SET title = 'Jae-sung Lee' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KOR');
UPDATE stickers SET title = 'In-beom Hwang' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KOR');
UPDATE stickers SET title = 'Kang-in Lee' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KOR');
UPDATE stickers SET title = 'Seung-ho Paik' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KOR');
UPDATE stickers SET title = 'Jens Castrop' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KOR');
UPDATE stickers SET title = 'Dong-gyeong Lee' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KOR');
UPDATE stickers SET title = 'Gue-sung Cho' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KOR');
UPDATE stickers SET title = 'Heung-min Son' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KOR');
UPDATE stickers SET title = 'Hee-chan Hwang' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KOR');
UPDATE stickers SET title = 'Hyeon-Gyu Oh' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KOR');

-- República Tcheca (CZE)
UPDATE stickers SET title = 'Matěj Kovář' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CZE');
UPDATE stickers SET title = 'Jindřich Staněk' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CZE');
UPDATE stickers SET title = 'Ladislav Krejčí' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CZE');
UPDATE stickers SET title = 'Vladimír Coufal' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CZE');
UPDATE stickers SET title = 'Jaroslav Zelený' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CZE');
UPDATE stickers SET title = 'Tomáš Holeš' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CZE');
UPDATE stickers SET title = 'David Zima' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CZE');
UPDATE stickers SET title = 'Michal Sadílek' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CZE');
UPDATE stickers SET title = 'Lukáš Provod' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CZE');
UPDATE stickers SET title = 'Lukáš Červ' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CZE');
UPDATE stickers SET title = 'Tomáš Souček' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CZE');
UPDATE stickers SET title = 'Pavel Šulc' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CZE');
UPDATE stickers SET title = 'Matěj Vydra' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CZE');
UPDATE stickers SET title = 'Vasil Kušej' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CZE');
UPDATE stickers SET title = 'Tomáš Chorý' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CZE');
UPDATE stickers SET title = 'Václav Černý' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CZE');
UPDATE stickers SET title = 'Adam Hložek' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CZE');
UPDATE stickers SET title = 'Patrik Schick' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CZE');

-- Canadá (CAN)
UPDATE stickers SET title = 'Dayne St. Clair' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CAN');
UPDATE stickers SET title = 'Alphonso Davies' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CAN');
UPDATE stickers SET title = 'Alistair Johnston' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CAN');
UPDATE stickers SET title = 'Samuel Adekugbe' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CAN');
UPDATE stickers SET title = 'Richie Laryea' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CAN');
UPDATE stickers SET title = 'Derek Cornelius' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CAN');
UPDATE stickers SET title = 'Moïse Bombito' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CAN');
UPDATE stickers SET title = 'Kamal Miller' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CAN');
UPDATE stickers SET title = 'Stephen Eustáquio' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CAN');
UPDATE stickers SET title = 'Ismaël Koné' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CAN');
UPDATE stickers SET title = 'Jonathan Osorio' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CAN');
UPDATE stickers SET title = 'Jacob Shaffelburg' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CAN');
UPDATE stickers SET title = 'Mathieu Choinière' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CAN');
UPDATE stickers SET title = 'Niko Sigur' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CAN');
UPDATE stickers SET title = 'Tajon Buchanan' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CAN');
UPDATE stickers SET title = 'Liam Millar' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CAN');
UPDATE stickers SET title = 'Cyle Larin' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CAN');
UPDATE stickers SET title = 'Jonathan David' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CAN');

-- Bósnia e Herzegovina (BIH)
UPDATE stickers SET title = 'Nikola Vasilj' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BIH');
UPDATE stickers SET title = 'Amar Dedić' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BIH');
UPDATE stickers SET title = 'Sead Kolašinac' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BIH');
UPDATE stickers SET title = 'Tarik Muharemović' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BIH');
UPDATE stickers SET title = 'Nihad Mujakić' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BIH');
UPDATE stickers SET title = 'Nikola Katić' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BIH');
UPDATE stickers SET title = 'Amir Hadžiahmetović' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BIH');
UPDATE stickers SET title = 'Benjamin Tahirović' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BIH');
UPDATE stickers SET title = 'Armin Gigović' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BIH');
UPDATE stickers SET title = 'Ivan Šunjić' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BIH');
UPDATE stickers SET title = 'Ivan Bašić' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BIH');
UPDATE stickers SET title = 'Dženis Burnić' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BIH');
UPDATE stickers SET title = 'Esmir Bajraktarević' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BIH');
UPDATE stickers SET title = 'Amar Memić' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BIH');
UPDATE stickers SET title = 'Ermedin Demirović' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BIH');
UPDATE stickers SET title = 'Edin Džeko' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BIH');
UPDATE stickers SET title = 'Samed Baždar' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BIH');
UPDATE stickers SET title = 'Haris Tabaković' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BIH');

-- Catar (QAT)
UPDATE stickers SET title = 'Meshaal Barsham' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'QAT');
UPDATE stickers SET title = 'Sultan Albrake' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'QAT');
UPDATE stickers SET title = 'Lucas Mendes' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'QAT');
UPDATE stickers SET title = 'Homam Ahmed' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'QAT');
UPDATE stickers SET title = 'Boualem Khoukhi' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'QAT');
UPDATE stickers SET title = 'Pedro Miguel' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'QAT');
UPDATE stickers SET title = 'Tarek Salman' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'QAT');
UPDATE stickers SET title = 'Mohamed Al-Mannai' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'QAT');
UPDATE stickers SET title = 'Karim Boudiaf' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'QAT');
UPDATE stickers SET title = 'Assim Madibo' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'QAT');
UPDATE stickers SET title = 'Ahmed Fatehi' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'QAT');
UPDATE stickers SET title = 'Mohammed Waad' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'QAT');
UPDATE stickers SET title = 'Abdulaziz Hatem' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'QAT');
UPDATE stickers SET title = 'Hassan Al-Haydos' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'QAT');
UPDATE stickers SET title = 'Edmilson Junior' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'QAT');
UPDATE stickers SET title = 'Akram Hassan Afif' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'QAT');
UPDATE stickers SET title = 'Ahmed Al Ganehi' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'QAT');
UPDATE stickers SET title = 'Almoez Ali' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'QAT');

-- Suíça (SUI)
UPDATE stickers SET title = 'Gregor Kobel' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SUI');
UPDATE stickers SET title = 'Yvon Mvogo' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SUI');
UPDATE stickers SET title = 'Manuel Akanji' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SUI');
UPDATE stickers SET title = 'Ricardo Rodriguez' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SUI');
UPDATE stickers SET title = 'Nico Elvedi' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SUI');
UPDATE stickers SET title = 'Aurèle Amenda' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SUI');
UPDATE stickers SET title = 'Silvan Widmer' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SUI');
UPDATE stickers SET title = 'Granit Xhaka' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SUI');
UPDATE stickers SET title = 'Denis Zakaria' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SUI');
UPDATE stickers SET title = 'Remo Freuler' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SUI');
UPDATE stickers SET title = 'Fabian Rieder' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SUI');
UPDATE stickers SET title = 'Ardon Jashari' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SUI');
UPDATE stickers SET title = 'Johan Manzambi' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SUI');
UPDATE stickers SET title = 'Michel Aebischer' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SUI');
UPDATE stickers SET title = 'Breel Embolo' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SUI');
UPDATE stickers SET title = 'Ruben Vargas' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SUI');
UPDATE stickers SET title = 'Dan Ndoye' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SUI');
UPDATE stickers SET title = 'Zeki Amdouni' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SUI');

-- Brasil (BRA)
UPDATE stickers SET title = 'Alisson' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BRA');
UPDATE stickers SET title = 'Bento' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BRA');
UPDATE stickers SET title = 'Marquinhos' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BRA');
UPDATE stickers SET title = 'Éder Militão' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BRA');
UPDATE stickers SET title = 'Gabriel Magalhães' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BRA');
UPDATE stickers SET title = 'Danilo' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BRA');
UPDATE stickers SET title = 'Wesley' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BRA');
UPDATE stickers SET title = 'Lucas Paquetá' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BRA');
UPDATE stickers SET title = 'Casemiro' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BRA');
UPDATE stickers SET title = 'Bruno Guimarães' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BRA');
UPDATE stickers SET title = 'Luiz Henrique' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BRA');
UPDATE stickers SET title = 'Vinícius Júnior' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BRA');
UPDATE stickers SET title = 'Rodrygo' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BRA');
UPDATE stickers SET title = 'João Pedro' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BRA');
UPDATE stickers SET title = 'Matheus Cunha' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BRA');
UPDATE stickers SET title = 'Gabriel Martinelli' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BRA');
UPDATE stickers SET title = 'Raphinha' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BRA');
UPDATE stickers SET title = 'Estêvão' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BRA');

-- Marrocos (MAR)
UPDATE stickers SET title = 'Yassine Bounou' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MAR');
UPDATE stickers SET title = 'Munir El Kajoui' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MAR');
UPDATE stickers SET title = 'Achraf Hakimi' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MAR');
UPDATE stickers SET title = 'Noussair Mazraoui' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MAR');
UPDATE stickers SET title = 'Nayef Aguerd' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MAR');
UPDATE stickers SET title = 'Romain Saïss' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MAR');
UPDATE stickers SET title = 'Jawad El Yamiq' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MAR');
UPDATE stickers SET title = 'Adam Masina' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MAR');
UPDATE stickers SET title = 'Sofyan Amrabat' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MAR');
UPDATE stickers SET title = 'Azzedine Ounahi' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MAR');
UPDATE stickers SET title = 'Eliesse Ben Seghir' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MAR');
UPDATE stickers SET title = 'Bilal El Khannouss' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MAR');
UPDATE stickers SET title = 'Ismael Saibari' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MAR');
UPDATE stickers SET title = 'Youssef En-Nesyri' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MAR');
UPDATE stickers SET title = 'Abde Ezzalzouli' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MAR');
UPDATE stickers SET title = 'Soufiane Rahimi' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MAR');
UPDATE stickers SET title = 'Brahim Díaz' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MAR');
UPDATE stickers SET title = 'Ayoub El Kaabi' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'MAR');

-- Haiti (HAI)
UPDATE stickers SET title = 'Johny Placide' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'HAI');
UPDATE stickers SET title = 'Carlens Arcus' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'HAI');
UPDATE stickers SET title = 'Martin Expérience' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'HAI');
UPDATE stickers SET title = 'Jean-Kevin Duverne' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'HAI');
UPDATE stickers SET title = 'Ricardo Adé' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'HAI');
UPDATE stickers SET title = 'Duke Lacroix' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'HAI');
UPDATE stickers SET title = 'Garven Metusala' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'HAI');
UPDATE stickers SET title = 'Hannes Delcroix' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'HAI');
UPDATE stickers SET title = 'Leverton Pierre' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'HAI');
UPDATE stickers SET title = 'Danley Jean Jacques' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'HAI');
UPDATE stickers SET title = 'Jean-Ricner Bellegarde' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'HAI');
UPDATE stickers SET title = 'Christopher Attys' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'HAI');
UPDATE stickers SET title = 'Derrick Etienne Jr.' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'HAI');
UPDATE stickers SET title = 'Josué Casimir' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'HAI');
UPDATE stickers SET title = 'Ruben Providence' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'HAI');
UPDATE stickers SET title = 'Duckens Nazon' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'HAI');
UPDATE stickers SET title = 'Louicius Deedson' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'HAI');
UPDATE stickers SET title = 'Frantzdy Pierrot' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'HAI');

-- Escócia (SCO)
UPDATE stickers SET title = 'Angus Gunn' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SCO');
UPDATE stickers SET title = 'Jack Hendry' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SCO');
UPDATE stickers SET title = 'Kieran Tierney' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SCO');
UPDATE stickers SET title = 'Aaron Hickey' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SCO');
UPDATE stickers SET title = 'Andrew Robertson' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SCO');
UPDATE stickers SET title = 'Scott McKenna' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SCO');
UPDATE stickers SET title = 'John Souttar' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SCO');
UPDATE stickers SET title = 'Anthony Ralston' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SCO');
UPDATE stickers SET title = 'Grant Hanley' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SCO');
UPDATE stickers SET title = 'Scott McTominay' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SCO');
UPDATE stickers SET title = 'Billy GilmourLewis' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SCO');
UPDATE stickers SET title = 'Ferguson' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SCO');
UPDATE stickers SET title = 'Ryan Christie' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SCO');
UPDATE stickers SET title = 'Kenny McLean' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SCO');
UPDATE stickers SET title = 'John McGinn' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SCO');
UPDATE stickers SET title = 'Lyndon Dykes' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SCO');
UPDATE stickers SET title = 'Che Adams' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SCO');
UPDATE stickers SET title = 'Ben Gannon-Doak' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SCO');

-- Estados Unidos (USA)
UPDATE stickers SET title = 'Math Freese' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'USA');
UPDATE stickers SET title = 'Chris Richards' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'USA');
UPDATE stickers SET title = 'Tim Ream' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'USA');
UPDATE stickers SET title = 'Mark McKenzie' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'USA');
UPDATE stickers SET title = 'Alex Freeman' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'USA');
UPDATE stickers SET title = 'Antonee Robinson' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'USA');
UPDATE stickers SET title = 'Tyler Adams' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'USA');
UPDATE stickers SET title = 'Tanner Tessmann' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'USA');
UPDATE stickers SET title = 'Weston McKenny' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'USA');
UPDATE stickers SET title = 'Christian Roldan' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'USA');
UPDATE stickers SET title = 'Timothy Weah' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'USA');
UPDATE stickers SET title = 'Diego Luna' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'USA');
UPDATE stickers SET title = 'Malim Tillman' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'USA');
UPDATE stickers SET title = 'Christian Pulisic' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'USA');
UPDATE stickers SET title = 'Brenden Aaronson' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'USA');
UPDATE stickers SET title = 'Ricardo Pepi' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'USA');
UPDATE stickers SET title = 'Haji Wright' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'USA');
UPDATE stickers SET title = 'Folarin Balogun' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'USA');

-- WARNING: Paraguai (PAR) has 13 players, expected 18
-- Paraguai (PAR)
UPDATE stickers SET title = 'Roberto Fernández' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'PAR');
UPDATE stickers SET title = 'Orlando Gill' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'PAR');
UPDATE stickers SET title = 'Gustavo Gómez' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'PAR');
UPDATE stickers SET title = 'Fabián Balbuena' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'PAR');
UPDATE stickers SET title = 'Juan José Cáceres' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'PAR');
UPDATE stickers SET title = 'Omar Alderete' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'PAR');
UPDATE stickers SET title = 'Junior Alonso' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'PAR');
UPDATE stickers SET title = 'Mathías Villasanti' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'PAR');
UPDATE stickers SET title = 'Diego Gómez' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'PAR');
UPDATE stickers SET title = 'Damián Bobadilla' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'PAR');
UPDATE stickers SET title = 'Andrés Cubas' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'PAR');
UPDATE stickers SET title = 'Matías Galarza Fonda' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'PAR');
UPDATE stickers SET title = 'Julio Enciso' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'PAR');

-- Austrália (AUS)
UPDATE stickers SET title = 'Mathew Ryan' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUS');
UPDATE stickers SET title = 'Joe Gauci' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUS');
UPDATE stickers SET title = 'Harry Souttar' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUS');
UPDATE stickers SET title = 'Alessandro Circati' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUS');
UPDATE stickers SET title = 'Jordan Bos' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUS');
UPDATE stickers SET title = 'Aziz Behich' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUS');
UPDATE stickers SET title = 'Cameron Burgess' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUS');
UPDATE stickers SET title = 'Lewis Miller' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUS');
UPDATE stickers SET title = 'Milos Degenek' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUS');
UPDATE stickers SET title = 'Jackson Irvine' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUS');
UPDATE stickers SET title = 'Riley McGree' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUS');
UPDATE stickers SET title = 'Aiden O’Neill' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUS');
UPDATE stickers SET title = 'Connor Metcalfe' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUS');
UPDATE stickers SET title = 'Patrick Yazbek' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUS');
UPDATE stickers SET title = 'Craig Goodwin' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUS');
UPDATE stickers SET title = 'Kusini Yengi' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUS');
UPDATE stickers SET title = 'Nestory Irankunda' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUS');
UPDATE stickers SET title = 'Mohamed Touré' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUS');

-- Turquia (TUR)
UPDATE stickers SET title = 'Ugurcan Cakir' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUR');
UPDATE stickers SET title = 'Mert Muldur' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUR');
UPDATE stickers SET title = 'Zeki Celik' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUR');
UPDATE stickers SET title = 'Abdulkerim Bardakci' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUR');
UPDATE stickers SET title = 'Caglar Soyunku' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUR');
UPDATE stickers SET title = 'Merih Demiral' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUR');
UPDATE stickers SET title = 'Ferdi Kadioglu' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUR');
UPDATE stickers SET title = 'Kaan Ayhan' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUR');
UPDATE stickers SET title = 'Ismail Yuksek' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUR');
UPDATE stickers SET title = 'Hakan Calhanoglu' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUR');
UPDATE stickers SET title = 'Orkun Kokcu' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUR');
UPDATE stickers SET title = 'Arda Güler' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUR');
UPDATE stickers SET title = 'Irfan Can Kahvecu' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUR');
UPDATE stickers SET title = 'Yunus Akgun' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUR');
UPDATE stickers SET title = 'Can Uzun' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUR');
UPDATE stickers SET title = 'Baris Alper Yilmaz' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUR');
UPDATE stickers SET title = 'Kerem Akturkoglu' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUR');
UPDATE stickers SET title = 'Kenan Yildiz' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUR');

-- Curaçao (CUW)
UPDATE stickers SET title = 'Eloy Room' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CUW');
UPDATE stickers SET title = 'Armando Obispo' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CUW');
UPDATE stickers SET title = 'Sherel Floranus' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CUW');
UPDATE stickers SET title = 'Jurien Gaari' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CUW');
UPDATE stickers SET title = 'Joshua Brenet' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CUW');
UPDATE stickers SET title = 'Roshon Van Eijma' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CUW');
UPDATE stickers SET title = 'Shurandy Sambo' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CUW');
UPDATE stickers SET title = 'Livano Comenencia' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CUW');
UPDATE stickers SET title = 'Godfried Roemeratoe' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CUW');
UPDATE stickers SET title = 'Juninho Bacuna' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CUW');
UPDATE stickers SET title = 'Leandro Bacuna' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CUW');
UPDATE stickers SET title = 'Tahith Chong' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CUW');
UPDATE stickers SET title = 'Kenji Gorré' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CUW');
UPDATE stickers SET title = 'Jearl Margaritha' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CUW');
UPDATE stickers SET title = 'Jurgen Locadia' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CUW');
UPDATE stickers SET title = 'Jeremy Antonisse' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CUW');
UPDATE stickers SET title = 'Gervane Kastaneer' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CUW');
UPDATE stickers SET title = 'Sontje Hansen' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CUW');

-- Costa do Marfim (CIV)
UPDATE stickers SET title = 'Yahia Fofana' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CIV');
UPDATE stickers SET title = 'Ghislain Konan' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CIV');
UPDATE stickers SET title = 'Wilfried Singo' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CIV');
UPDATE stickers SET title = 'Odilon Kossounou' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CIV');
UPDATE stickers SET title = 'Evan Ndicka' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CIV');
UPDATE stickers SET title = 'Willy Boly' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CIV');
UPDATE stickers SET title = 'Emmanuel Agbadou' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CIV');
UPDATE stickers SET title = 'Ousmane Diomande' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CIV');
UPDATE stickers SET title = 'Franck Kessié' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CIV');
UPDATE stickers SET title = 'Seko Fofana' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CIV');
UPDATE stickers SET title = 'Ibrahim Sangaré' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CIV');
UPDATE stickers SET title = 'Jean-Philippe Gbamin' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CIV');
UPDATE stickers SET title = 'Amad Diallo' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CIV');
UPDATE stickers SET title = 'Sébastien Haller' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CIV');
UPDATE stickers SET title = 'Simon Adingra' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CIV');
UPDATE stickers SET title = 'Yan Diomande' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CIV');
UPDATE stickers SET title = 'Evann Guessand' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CIV');
UPDATE stickers SET title = 'Oumar Diakité' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CIV');

-- Equador (ECU)
UPDATE stickers SET title = 'Hernán Galíndez' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ECU');
UPDATE stickers SET title = 'Gonzalo Valle' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ECU');
UPDATE stickers SET title = 'Piero Hincapié' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ECU');
UPDATE stickers SET title = 'Pervis Estupiñán' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ECU');
UPDATE stickers SET title = 'Willian Pacho' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ECU');
UPDATE stickers SET title = 'Ángelo Preciado' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ECU');
UPDATE stickers SET title = 'Joel Ordóñez' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ECU');
UPDATE stickers SET title = 'Moisés Caicedo' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ECU');
UPDATE stickers SET title = 'Alan Franco' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ECU');
UPDATE stickers SET title = 'Kendry Páez' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ECU');
UPDATE stickers SET title = 'Pedro Vite' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ECU');
UPDATE stickers SET title = 'John Veboah' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ECU');
UPDATE stickers SET title = 'Leonardo Campana' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ECU');
UPDATE stickers SET title = 'Gonzalo Plata' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ECU');
UPDATE stickers SET title = 'Nilson Angulo' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ECU');
UPDATE stickers SET title = 'Alan Minda' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ECU');
UPDATE stickers SET title = 'Kevin Rodríguez' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ECU');
UPDATE stickers SET title = 'Enner Valencia' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ECU');

-- Holanda (NED)
UPDATE stickers SET title = 'Bart Verbruggen' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NED');
UPDATE stickers SET title = 'Virgil van Dijk' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NED');
UPDATE stickers SET title = 'Micky van de Ven' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NED');
UPDATE stickers SET title = 'Jurriën Timber' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NED');
UPDATE stickers SET title = 'Denzel Dumfries' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NED');
UPDATE stickers SET title = 'Nathan Aké' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NED');
UPDATE stickers SET title = 'Jeremie Frimpong' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NED');
UPDATE stickers SET title = 'Jan Paul van Hecke' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NED');
UPDATE stickers SET title = 'Tijjani Reijnders' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NED');
UPDATE stickers SET title = 'Ryan Gravenberch' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NED');
UPDATE stickers SET title = 'Teun Koopmeiners' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NED');
UPDATE stickers SET title = 'Frenkie de Jong' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NED');
UPDATE stickers SET title = 'Xavi Simons' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NED');
UPDATE stickers SET title = 'Justin Kluivert' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NED');
UPDATE stickers SET title = 'Memphis Depay' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NED');
UPDATE stickers SET title = 'Donyell Malen' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NED');
UPDATE stickers SET title = 'Wout Weghorst' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NED');
UPDATE stickers SET title = 'Cody Gakpo' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NED');

-- Japão (JPN)
UPDATE stickers SET title = 'Zion Suzuki' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JPN');
UPDATE stickers SET title = 'Henry Heroki Mochizuki' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JPN');
UPDATE stickers SET title = 'Ayumu Seko' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JPN');
UPDATE stickers SET title = 'Junnosuke Suzuki' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JPN');
UPDATE stickers SET title = 'Shogo Taniguchi' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JPN');
UPDATE stickers SET title = 'Tsuyoshi Watanabe' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JPN');
UPDATE stickers SET title = 'Kaishu Sano' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JPN');
UPDATE stickers SET title = 'Yuki Soma' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JPN');
UPDATE stickers SET title = 'Ao Tanaka' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JPN');
UPDATE stickers SET title = 'Daichi Kamada' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JPN');
UPDATE stickers SET title = 'Takefusa Kubo' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JPN');
UPDATE stickers SET title = 'Ritsu Doan' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JPN');
UPDATE stickers SET title = 'Keito Nakamura' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JPN');
UPDATE stickers SET title = 'Takumi Minamino' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JPN');
UPDATE stickers SET title = 'Shuto Machino' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JPN');
UPDATE stickers SET title = 'Junya Ito' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JPN');
UPDATE stickers SET title = 'Koki Ogawa' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JPN');
UPDATE stickers SET title = 'Ayase Ueda' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JPN');

-- Suécia (SWE)
UPDATE stickers SET title = 'Victor Johansson' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SWE');
UPDATE stickers SET title = 'Isak Hien' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SWE');
UPDATE stickers SET title = 'Gabriel Gudmundsson' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SWE');
UPDATE stickers SET title = 'Emil Holm' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SWE');
UPDATE stickers SET title = 'Victor Nilsson Lindelöf' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SWE');
UPDATE stickers SET title = 'Gustaf Lagerbielke' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SWE');
UPDATE stickers SET title = 'Lucas Bergvall' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SWE');
UPDATE stickers SET title = 'Hugo Larsson' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SWE');
UPDATE stickers SET title = 'Jesper Karlström' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SWE');
UPDATE stickers SET title = 'Yasin Ayari' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SWE');
UPDATE stickers SET title = 'Mattias Svanberg' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SWE');
UPDATE stickers SET title = 'Daniel Svensson' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SWE');
UPDATE stickers SET title = 'Ken Sema' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SWE');
UPDATE stickers SET title = 'Roony Bardghji' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SWE');
UPDATE stickers SET title = 'Dejan Kulusevski' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SWE');
UPDATE stickers SET title = 'Anthony Elanga' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SWE');
UPDATE stickers SET title = 'Alexander Isak' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SWE');
UPDATE stickers SET title = 'Viktor Gyökeres' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SWE');

-- Tunísia (TUN)
UPDATE stickers SET title = 'Bechir Ben Said' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUN');
UPDATE stickers SET title = 'Aymen Dahmen' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUN');
UPDATE stickers SET title = 'Van Valery' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUN');
UPDATE stickers SET title = 'Montassar Talbi' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUN');
UPDATE stickers SET title = 'Yassine Meriah' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUN');
UPDATE stickers SET title = 'Ali Abdi' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUN');
UPDATE stickers SET title = 'Dylan Bronn' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUN');
UPDATE stickers SET title = 'Ellyes Skhiri' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUN');
UPDATE stickers SET title = 'Aissa Laidouni' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUN');
UPDATE stickers SET title = 'Ferjani Sassi' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUN');
UPDATE stickers SET title = 'Mohamed Ali Ben Romdhane' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUN');
UPDATE stickers SET title = 'Hannibal Mejbri' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUN');
UPDATE stickers SET title = 'Elias Achouri' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUN');
UPDATE stickers SET title = 'Elias Saad' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUN');
UPDATE stickers SET title = 'Hazem Mastouri' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUN');
UPDATE stickers SET title = 'Ismael Gharbi' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUN');
UPDATE stickers SET title = 'Sayfallah Ltaief' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUN');
UPDATE stickers SET title = 'Naim Sliti' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'TUN');

-- Bélgica (BEL)
UPDATE stickers SET title = 'Thibaut Courtois' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BEL');
UPDATE stickers SET title = 'Arthur Theate' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BEL');
UPDATE stickers SET title = 'Timothy Castagne' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BEL');
UPDATE stickers SET title = 'Zeno Debast' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BEL');
UPDATE stickers SET title = 'Brandon Mechele' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BEL');
UPDATE stickers SET title = 'Maxim De Cuyper' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BEL');
UPDATE stickers SET title = 'Thomas Meunier' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BEL');
UPDATE stickers SET title = 'Youri Tielemans' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BEL');
UPDATE stickers SET title = 'Amadou Onana' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BEL');
UPDATE stickers SET title = 'Nicolas Raskin' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BEL');
UPDATE stickers SET title = 'Alexis Saelemaekers' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BEL');
UPDATE stickers SET title = 'Hans Vanaken' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BEL');
UPDATE stickers SET title = 'Kevin De Bruyne' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BEL');
UPDATE stickers SET title = 'Jérémy Doku' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BEL');
UPDATE stickers SET title = 'Charles De Ketelaere' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BEL');
UPDATE stickers SET title = 'Leandro Trossard' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BEL');
UPDATE stickers SET title = 'Loïs Openda' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BEL');
UPDATE stickers SET title = 'Romelu Lukaku' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'BEL');

-- Egito (EGY)
UPDATE stickers SET title = 'Mohamed El Shenawy' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'EGY');
UPDATE stickers SET title = 'Mohamed Hany' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'EGY');
UPDATE stickers SET title = 'Mohamed Hamdy' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'EGY');
UPDATE stickers SET title = 'Yasser Ibrahim' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'EGY');
UPDATE stickers SET title = 'Khaled Sobhi' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'EGY');
UPDATE stickers SET title = 'Ramy Rabia' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'EGY');
UPDATE stickers SET title = 'Hossam Abdelmaguid' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'EGY');
UPDATE stickers SET title = 'Ahmed Fatouh' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'EGY');
UPDATE stickers SET title = 'Marwan Attia' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'EGY');
UPDATE stickers SET title = 'Zizo' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'EGY');
UPDATE stickers SET title = 'Hamdy Fathy' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'EGY');
UPDATE stickers SET title = 'Mohamed Lasheen' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'EGY');
UPDATE stickers SET title = 'Emam Ashour' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'EGY');
UPDATE stickers SET title = 'Osama Faisal' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'EGY');
UPDATE stickers SET title = 'Mohamed Salah' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'EGY');
UPDATE stickers SET title = 'Mostafa Mohamed' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'EGY');
UPDATE stickers SET title = 'Trezeguet' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'EGY');
UPDATE stickers SET title = 'Omar Marmoush' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'EGY');

-- Irã (IRN)
UPDATE stickers SET title = 'Alireza Beiranvand' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRN');
UPDATE stickers SET title = 'Morteza Pouraliganji' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRN');
UPDATE stickers SET title = 'Ehsan Hajsafi' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRN');
UPDATE stickers SET title = 'Milad Mohammadi' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRN');
UPDATE stickers SET title = 'Shoja Khalilzadeh' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRN');
UPDATE stickers SET title = 'Ramin Rezaeian' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRN');
UPDATE stickers SET title = 'Hossein Kanaani' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRN');
UPDATE stickers SET title = 'Sadegh Moharrami' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRN');
UPDATE stickers SET title = 'Saleh Hardani' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRN');
UPDATE stickers SET title = 'Saeed Ezatolahi' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRN');
UPDATE stickers SET title = 'Saman Ghoddos' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRN');
UPDATE stickers SET title = 'Omid Noorafkan' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRN');
UPDATE stickers SET title = 'Roozbeh Cheshmi' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRN');
UPDATE stickers SET title = 'Mohammad Mohebi' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRN');
UPDATE stickers SET title = 'Sardar Azmoun' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRN');
UPDATE stickers SET title = 'Mehdi Taremi' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRN');
UPDATE stickers SET title = 'Alireza Jahanbakhsh' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRN');
UPDATE stickers SET title = 'Ali Gholizadeh' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRN');

-- Nova Zelândia (NZL)
UPDATE stickers SET title = 'Max Crocombe-Payne' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NZL');
UPDATE stickers SET title = 'Alex Paulsen' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NZL');
UPDATE stickers SET title = 'Michael Boxall' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NZL');
UPDATE stickers SET title = 'Liberato Cacace' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NZL');
UPDATE stickers SET title = 'Tim Payne' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NZL');
UPDATE stickers SET title = 'Tyler Bindon' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NZL');
UPDATE stickers SET title = 'Francis de Vries' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NZL');
UPDATE stickers SET title = 'Finn Surman' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NZL');
UPDATE stickers SET title = 'Joe Bell' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NZL');
UPDATE stickers SET title = 'Sarpreet Singh' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NZL');
UPDATE stickers SET title = 'Ryan Thomas' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NZL');
UPDATE stickers SET title = 'Matthew Garbett' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NZL');
UPDATE stickers SET title = 'Marko Stamenić' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NZL');
UPDATE stickers SET title = 'Ben Old' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NZL');
UPDATE stickers SET title = 'Chris Wood' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NZL');
UPDATE stickers SET title = 'Elijah Just' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NZL');
UPDATE stickers SET title = 'Callum McCowatt' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NZL');
UPDATE stickers SET title = 'Kosta Barbarouses' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NZL');

-- Espanha (ESP)
UPDATE stickers SET title = 'Unai Simón' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ESP');
UPDATE stickers SET title = 'Robin Le Normand' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ESP');
UPDATE stickers SET title = 'Aymeric Laporte' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ESP');
UPDATE stickers SET title = 'Dean Huijsen' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ESP');
UPDATE stickers SET title = 'Pedro Porro' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ESP');
UPDATE stickers SET title = 'Dani Carvajal' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ESP');
UPDATE stickers SET title = 'Marc Cucurella' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ESP');
UPDATE stickers SET title = 'Martín Zubimendi' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ESP');
UPDATE stickers SET title = 'Rodri' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ESP');
UPDATE stickers SET title = 'Pedri' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ESP');
UPDATE stickers SET title = 'Fabián Ruiz' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ESP');
UPDATE stickers SET title = 'Mikel Merino' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ESP');
UPDATE stickers SET title = 'Lamine Yamal' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ESP');
UPDATE stickers SET title = 'Dani Olmo' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ESP');
UPDATE stickers SET title = 'Nico Williams' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ESP');
UPDATE stickers SET title = 'Ferran Torres' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ESP');
UPDATE stickers SET title = 'Álvaro Morata' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ESP');
UPDATE stickers SET title = 'Mikel Oyarzabal' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ESP');

-- Cabo Verde (CPV)
UPDATE stickers SET title = 'Vozinha' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CPV');
UPDATE stickers SET title = 'Logan Costa' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CPV');
UPDATE stickers SET title = 'Pico' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CPV');
UPDATE stickers SET title = 'Diney' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CPV');
UPDATE stickers SET title = 'Steven Moreira' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CPV');
UPDATE stickers SET title = 'Wagner Pina' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CPV');
UPDATE stickers SET title = 'João Paulo' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CPV');
UPDATE stickers SET title = 'Yannick Semedo' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CPV');
UPDATE stickers SET title = 'Kevin Pina' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CPV');
UPDATE stickers SET title = 'Patrick Andrade' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CPV');
UPDATE stickers SET title = 'Jamiro Monteiro' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CPV');
UPDATE stickers SET title = 'Deroy Duarte' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CPV');
UPDATE stickers SET title = 'Garry Rodrigues' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CPV');
UPDATE stickers SET title = 'Jovane Cabral' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CPV');
UPDATE stickers SET title = 'Ryan Mendes' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CPV');
UPDATE stickers SET title = 'Dailon Livramento' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CPV');
UPDATE stickers SET title = 'Willy Semedo' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CPV');
UPDATE stickers SET title = 'Bebé' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CPV');

-- Arábia Saudita (KSA)
UPDATE stickers SET title = 'Nawaf Alaqidi' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KSA');
UPDATE stickers SET title = 'Abdulrahman Al-Sanbi' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KSA');
UPDATE stickers SET title = 'Saud Abdulhamid' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KSA');
UPDATE stickers SET title = 'Nawaf Boushal' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KSA');
UPDATE stickers SET title = 'Jihad Thakri' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KSA');
UPDATE stickers SET title = 'Moteb Al-Harbi' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KSA');
UPDATE stickers SET title = 'Hassan Altambakti' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KSA');
UPDATE stickers SET title = 'Musab Aljuwayr' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KSA');
UPDATE stickers SET title = 'Ziyad Aljohani' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KSA');
UPDATE stickers SET title = 'Abdullah Alkhaibari' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KSA');
UPDATE stickers SET title = 'Nasser Aldawsari' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KSA');
UPDATE stickers SET title = 'Saleh Abu Alshamat' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KSA');
UPDATE stickers SET title = 'Marwan Alsahafi' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KSA');
UPDATE stickers SET title = 'Salem Aldawsari' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KSA');
UPDATE stickers SET title = 'Abdulrahman Al-Aboud' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KSA');
UPDATE stickers SET title = 'Feras Albrikan' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KSA');
UPDATE stickers SET title = 'Saleh Alshehri' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KSA');
UPDATE stickers SET title = 'Abdullah Al-Hamdan' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'KSA');

-- Uruguai (URU)
UPDATE stickers SET title = 'Sergio Rochet' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'URU');
UPDATE stickers SET title = 'Santiago Mele' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'URU');
UPDATE stickers SET title = 'Ronald Araujo' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'URU');
UPDATE stickers SET title = 'José María Giménez' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'URU');
UPDATE stickers SET title = 'Sebastian Caceres' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'URU');
UPDATE stickers SET title = 'Mathias Olivera' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'URU');
UPDATE stickers SET title = 'Guillermo Varela' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'URU');
UPDATE stickers SET title = 'Nahitan Nandez' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'URU');
UPDATE stickers SET title = 'Federico Valverde' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'URU');
UPDATE stickers SET title = 'Giorgian De Arrascaeta' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'URU');
UPDATE stickers SET title = 'Rodrigo Bentancur' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'URU');
UPDATE stickers SET title = 'Manuel Ugarte' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'URU');
UPDATE stickers SET title = 'Nicolás de la Cruz' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'URU');
UPDATE stickers SET title = 'Maxi Araujo' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'URU');
UPDATE stickers SET title = 'Darwin Núñez' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'URU');
UPDATE stickers SET title = 'Federico Viñas' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'URU');
UPDATE stickers SET title = 'Rodrigo Aguirre' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'URU');
UPDATE stickers SET title = 'Facundo Pellistri' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'URU');

-- França (FRA)
UPDATE stickers SET title = 'Mike Maignan' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'FRA');
UPDATE stickers SET title = 'Theo Hernández' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'FRA');
UPDATE stickers SET title = 'William Saliba' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'FRA');
UPDATE stickers SET title = 'Jules Koundé' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'FRA');
UPDATE stickers SET title = 'Ibrahima Konaté' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'FRA');
UPDATE stickers SET title = 'Dayot Upamecano' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'FRA');
UPDATE stickers SET title = 'Lucas Digne' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'FRA');
UPDATE stickers SET title = 'Aurélien Tchouaméni' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'FRA');
UPDATE stickers SET title = 'Eduardo Camavinga' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'FRA');
UPDATE stickers SET title = 'Manu Koné' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'FRA');
UPDATE stickers SET title = 'Adrien Rabiot' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'FRA');
UPDATE stickers SET title = 'Michael Olise' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'FRA');
UPDATE stickers SET title = 'Ousmane Dembélé' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'FRA');
UPDATE stickers SET title = 'Bradley Barcola' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'FRA');
UPDATE stickers SET title = 'Désiré Doué' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'FRA');
UPDATE stickers SET title = 'Kingsley Coman' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'FRA');
UPDATE stickers SET title = 'Hugo Ekitike' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'FRA');
UPDATE stickers SET title = 'Kylian Mbappé' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'FRA');

-- Senegal (SEN)
UPDATE stickers SET title = 'Eduardo Mendy' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SEN');
UPDATE stickers SET title = 'Yehvann Diouf' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SEN');
UPDATE stickers SET title = 'Moussa Niakhaté' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SEN');
UPDATE stickers SET title = 'Abdoulaye Seck' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SEN');
UPDATE stickers SET title = 'Ismail Jakobs' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SEN');
UPDATE stickers SET title = 'El Hadji Malick Diouf' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SEN');
UPDATE stickers SET title = 'Kalidou Koulibaly' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SEN');
UPDATE stickers SET title = 'Idrissa Gana Gueye' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SEN');
UPDATE stickers SET title = 'Pape Matar Sarr' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SEN');
UPDATE stickers SET title = 'Pape Gueye' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SEN');
UPDATE stickers SET title = 'Habib Diarra' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SEN');
UPDATE stickers SET title = 'Lamine Camara' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SEN');
UPDATE stickers SET title = 'Sadio Mane' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SEN');
UPDATE stickers SET title = 'Ismaïla Sarr' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SEN');
UPDATE stickers SET title = 'Boulaye Dia' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SEN');
UPDATE stickers SET title = 'Iliman Ndiaye' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SEN');
UPDATE stickers SET title = 'Nicolas Jackson' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SEN');
UPDATE stickers SET title = 'Krepin Diatta' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'SEN');

-- Iraque (IRQ)
UPDATE stickers SET title = 'Jalal Hassan' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRQ');
UPDATE stickers SET title = 'Rebin Sulaka' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRQ');
UPDATE stickers SET title = 'Hussein Ali' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRQ');
UPDATE stickers SET title = 'Akam Hashem' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRQ');
UPDATE stickers SET title = 'Merchas Doski' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRQ');
UPDATE stickers SET title = 'Zaid Tahseen' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRQ');
UPDATE stickers SET title = 'Manaf Younis' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRQ');
UPDATE stickers SET title = 'Zidane Iqbal' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRQ');
UPDATE stickers SET title = 'Amir Al-Ammari' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRQ');
UPDATE stickers SET title = 'Ibrahim Bayesh' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRQ');
UPDATE stickers SET title = 'Ali Jasim' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRQ');
UPDATE stickers SET title = 'Youssef Amyn' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRQ');
UPDATE stickers SET title = 'Aimar Sher' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRQ');
UPDATE stickers SET title = 'Marko Farji' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRQ');
UPDATE stickers SET title = 'Osama Rashid' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRQ');
UPDATE stickers SET title = 'Ali Al-Hamadi' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRQ');
UPDATE stickers SET title = 'Aymen Hussein' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRQ');
UPDATE stickers SET title = 'Mohanad Ali' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'IRQ');

-- Noruega (NOR)
UPDATE stickers SET title = 'Ørjan Nyland' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NOR');
UPDATE stickers SET title = 'Julian Ryerson' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NOR');
UPDATE stickers SET title = 'Leo Østigård' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NOR');
UPDATE stickers SET title = 'Kristoffer Ajer' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NOR');
UPDATE stickers SET title = 'Marcus Holmgren Pedersen' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NOR');
UPDATE stickers SET title = 'David Møller Wolfe' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NOR');
UPDATE stickers SET title = 'Torbjørn Heggem' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NOR');
UPDATE stickers SET title = 'Morten Thorsby' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NOR');
UPDATE stickers SET title = 'Martin Ødegaard' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NOR');
UPDATE stickers SET title = 'Sander Berge' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NOR');
UPDATE stickers SET title = 'Andreas Schjelderup' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NOR');
UPDATE stickers SET title = 'Patrick Berg' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NOR');
UPDATE stickers SET title = 'Erling Haaland' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NOR');
UPDATE stickers SET title = 'Alexander Sørloth' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NOR');
UPDATE stickers SET title = 'Aron Dønnum' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NOR');
UPDATE stickers SET title = 'Jørgen Strand Larsen' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NOR');
UPDATE stickers SET title = 'Antonio Nusa' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NOR');
UPDATE stickers SET title = 'Oscar Bobb' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'NOR');

-- Argentina (ARG)
UPDATE stickers SET title = 'Emiliano Martínez' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ARG');
UPDATE stickers SET title = 'Nahuel Molina' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ARG');
UPDATE stickers SET title = 'Cristian Romero' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ARG');
UPDATE stickers SET title = 'Nicolás Otamendi' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ARG');
UPDATE stickers SET title = 'Nicolás Tagliafico' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ARG');
UPDATE stickers SET title = 'Leonardo Balerdi' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ARG');
UPDATE stickers SET title = 'Enzo Fernández' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ARG');
UPDATE stickers SET title = 'Alexis Mac Allister' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ARG');
UPDATE stickers SET title = 'Rodrigo De Paul' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ARG');
UPDATE stickers SET title = 'Exequiel Palacios' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ARG');
UPDATE stickers SET title = 'Leandro Paredes' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ARG');
UPDATE stickers SET title = 'Nico Paz' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ARG');
UPDATE stickers SET title = 'Franco Mastantuono' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ARG');
UPDATE stickers SET title = 'Nico González' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ARG');
UPDATE stickers SET title = 'Lionel Messi' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ARG');
UPDATE stickers SET title = 'Lautaro Martínez' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ARG');
UPDATE stickers SET title = 'Julián Álvarez' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ARG');
UPDATE stickers SET title = 'Giuliano Simeone' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ARG');

-- Argélia (ALG)
UPDATE stickers SET title = 'Alexis Guendouz' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ALG');
UPDATE stickers SET title = 'Ramy Bensebaini' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ALG');
UPDATE stickers SET title = 'Youcef Atal' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ALG');
UPDATE stickers SET title = 'Rayan Aït-Nouri' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ALG');
UPDATE stickers SET title = 'Mohamed Amine Tougai' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ALG');
UPDATE stickers SET title = 'Aïssa Mandi' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ALG');
UPDATE stickers SET title = 'Ismael Bennacer' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ALG');
UPDATE stickers SET title = 'Houssem Aouar' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ALG');
UPDATE stickers SET title = 'Hicham Boudaoui' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ALG');
UPDATE stickers SET title = 'Ramiz Zerrouki' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ALG');
UPDATE stickers SET title = 'Nabil Bentaleb' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ALG');
UPDATE stickers SET title = 'Farés Chaibi' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ALG');
UPDATE stickers SET title = 'Riyad Mahrez' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ALG');
UPDATE stickers SET title = 'Said Benrahma' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ALG');
UPDATE stickers SET title = 'Anis Hadj Moussa' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ALG');
UPDATE stickers SET title = 'Amine Gouiri' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ALG');
UPDATE stickers SET title = 'Baghdad Bounedjah' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ALG');
UPDATE stickers SET title = 'Mohammed Amoura' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ALG');

-- Áustria (AUT)
UPDATE stickers SET title = 'Alexander Schlager' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUT');
UPDATE stickers SET title = 'Patrick Pentz' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUT');
UPDATE stickers SET title = 'David Alaba' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUT');
UPDATE stickers SET title = 'Kevin Danso' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUT');
UPDATE stickers SET title = 'Philipp Lienhart' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUT');
UPDATE stickers SET title = 'Stefan Posch' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUT');
UPDATE stickers SET title = 'Phillipp Mwene' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUT');
UPDATE stickers SET title = 'Alexander Prass' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUT');
UPDATE stickers SET title = 'Xaver Schlager' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUT');
UPDATE stickers SET title = 'Marcel Sabitzer' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUT');
UPDATE stickers SET title = 'Konrad Laimer' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUT');
UPDATE stickers SET title = 'Florian Grillitsch' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUT');
UPDATE stickers SET title = 'Nicolas Seiwald' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUT');
UPDATE stickers SET title = 'Romano Schmid' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUT');
UPDATE stickers SET title = 'Patrick Wimmer' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUT');
UPDATE stickers SET title = 'Christoph Baumgartner' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUT');
UPDATE stickers SET title = 'Michael Gregoritsch' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUT');
UPDATE stickers SET title = 'Marko Arnautović' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'AUT');

-- Jordânia (JOR)
UPDATE stickers SET title = 'Yazeed Abulaila' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JOR');
UPDATE stickers SET title = 'Ihsan Haddad' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JOR');
UPDATE stickers SET title = 'Mohammad Abu Hashish' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JOR');
UPDATE stickers SET title = 'Yazan Al-Arab' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JOR');
UPDATE stickers SET title = 'Abdallah Nasib' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JOR');
UPDATE stickers SET title = 'Saleem Obaid' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JOR');
UPDATE stickers SET title = 'Mohammad Abualnadi' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JOR');
UPDATE stickers SET title = 'Ibrahim Saadeh' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JOR');
UPDATE stickers SET title = 'Nizar Al-Rashdan' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JOR');
UPDATE stickers SET title = 'Noor Al-Rawabdeh' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JOR');
UPDATE stickers SET title = 'Mohannad Abu Taha' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JOR');
UPDATE stickers SET title = 'Amer Jamous' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JOR');
UPDATE stickers SET title = 'Musa Al-Taamari' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JOR');
UPDATE stickers SET title = 'Yazan Al-Naimat' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JOR');
UPDATE stickers SET title = 'Mahmoud Al-Mardi' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JOR');
UPDATE stickers SET title = 'Ali Olwan' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JOR');
UPDATE stickers SET title = 'Mohammad Abu Zrayq' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JOR');
UPDATE stickers SET title = 'Ibrahim Sabra' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'JOR');

-- Portugal (POR)
UPDATE stickers SET title = 'Diogo Costa' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'POR');
UPDATE stickers SET title = 'Jose Sa' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'POR');
UPDATE stickers SET title = 'Ruben Dias' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'POR');
UPDATE stickers SET title = 'João Cancelo' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'POR');
UPDATE stickers SET title = 'Diogo Dalot' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'POR');
UPDATE stickers SET title = 'Nuno Mendes' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'POR');
UPDATE stickers SET title = 'Gonçalo Inácio' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'POR');
UPDATE stickers SET title = 'Bernardo Silva' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'POR');
UPDATE stickers SET title = 'Bruno Fernandes' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'POR');
UPDATE stickers SET title = 'Ruben Neves' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'POR');
UPDATE stickers SET title = 'Vitinha' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'POR');
UPDATE stickers SET title = 'João Neves' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'POR');
UPDATE stickers SET title = 'Cristiano Ronaldo' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'POR');
UPDATE stickers SET title = 'Francisco Trincão' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'POR');
UPDATE stickers SET title = 'João Felix' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'POR');
UPDATE stickers SET title = 'Gonçalo Ramos' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'POR');
UPDATE stickers SET title = 'Pedro Neto' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'POR');
UPDATE stickers SET title = 'Rafael Leão' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'POR');

-- RD Congo (COD)
UPDATE stickers SET title = 'Lionel Mpasi' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COD');
UPDATE stickers SET title = 'Aaron Wan-Bissaka' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COD');
UPDATE stickers SET title = 'Axel Tuanzebe' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COD');
UPDATE stickers SET title = 'Arthur Masuaku' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COD');
UPDATE stickers SET title = 'Chancel Mbemba' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COD');
UPDATE stickers SET title = 'Joris Kayembe' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COD');
UPDATE stickers SET title = 'Charles Pickel' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COD');
UPDATE stickers SET title = 'Ngal’ayel Mukau' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COD');
UPDATE stickers SET title = 'Edo Kayembe' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COD');
UPDATE stickers SET title = 'Samuel Moutoussamy' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COD');
UPDATE stickers SET title = 'Noah Sadiki' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COD');
UPDATE stickers SET title = 'Théo Bongonda' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COD');
UPDATE stickers SET title = 'Meschack Elia' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COD');
UPDATE stickers SET title = 'Yoane Wissa' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COD');
UPDATE stickers SET title = 'Brian Cipenga' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COD');
UPDATE stickers SET title = 'Fiston Mayele' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COD');
UPDATE stickers SET title = 'Cédric Bakambu' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COD');
UPDATE stickers SET title = 'Nathanaël Mbuku' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COD');

-- Uzbequistão (UZB)
UPDATE stickers SET title = 'Utkir Yusupov' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'UZB');
UPDATE stickers SET title = 'Farrukh Savfiev' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'UZB');
UPDATE stickers SET title = 'Sherzod Nasrullaev' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'UZB');
UPDATE stickers SET title = 'Umar Eshmurodov' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'UZB');
UPDATE stickers SET title = 'Husniddin Aliqulov' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'UZB');
UPDATE stickers SET title = 'Rustamjon Ashurmatov' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'UZB');
UPDATE stickers SET title = 'Khojiakbar Alijonov' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'UZB');
UPDATE stickers SET title = 'Abdukodir Khusanov' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'UZB');
UPDATE stickers SET title = 'Odiljon Hamrobekov' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'UZB');
UPDATE stickers SET title = 'Otabek Shukurov' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'UZB');
UPDATE stickers SET title = 'Jamshid Iskanderov' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'UZB');
UPDATE stickers SET title = 'Azizbek Turgunboev' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'UZB');
UPDATE stickers SET title = 'Khojimat Erkinov' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'UZB');
UPDATE stickers SET title = 'Eldor Shomurodov' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'UZB');
UPDATE stickers SET title = 'Oston Urunov' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'UZB');
UPDATE stickers SET title = 'Jaloliddin Masharipov' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'UZB');
UPDATE stickers SET title = 'Igor Sergeev' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'UZB');
UPDATE stickers SET title = 'Abbosbek Fayzullaev' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'UZB');

-- Colômbia (COL)
UPDATE stickers SET title = 'Camilo Vargas' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COL');
UPDATE stickers SET title = 'David Ospina' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COL');
UPDATE stickers SET title = 'Dávinson Sánchez' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COL');
UPDATE stickers SET title = 'Yerry Mina' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COL');
UPDATE stickers SET title = 'Daniel Muñoz' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COL');
UPDATE stickers SET title = 'Johan Mojica' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COL');
UPDATE stickers SET title = 'Jhon Lucumí' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COL');
UPDATE stickers SET title = 'Santiago Arias' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COL');
UPDATE stickers SET title = 'Jefferson Lerma' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COL');
UPDATE stickers SET title = 'Kevin Castaño' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COL');
UPDATE stickers SET title = 'Richard Ríos' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COL');
UPDATE stickers SET title = 'James Rodríguez' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COL');
UPDATE stickers SET title = 'Juan Fernando Quintero' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COL');
UPDATE stickers SET title = 'Jorge Carrascal' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COL');
UPDATE stickers SET title = 'Jhon Arias' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COL');
UPDATE stickers SET title = 'Jhon Córdoba' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COL');
UPDATE stickers SET title = 'Luis Suárez' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COL');
UPDATE stickers SET title = 'Luis Díaz' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'COL');

-- Inglaterra (ENG)
UPDATE stickers SET title = 'Jordan Pickford' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ENG');
UPDATE stickers SET title = 'John Stones' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ENG');
UPDATE stickers SET title = 'Marc Guéhi' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ENG');
UPDATE stickers SET title = 'Ezri Konsa' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ENG');
UPDATE stickers SET title = 'Trent Alexander-Arnold' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ENG');
UPDATE stickers SET title = 'Reece James' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ENG');
UPDATE stickers SET title = 'Dan Burn' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ENG');
UPDATE stickers SET title = 'Jordan Henderson' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ENG');
UPDATE stickers SET title = 'Declan Rice' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ENG');
UPDATE stickers SET title = 'Jude Bellingham' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ENG');
UPDATE stickers SET title = 'Cole Palmer' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ENG');
UPDATE stickers SET title = 'Morgan Rogers' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ENG');
UPDATE stickers SET title = 'Anthony Gordon' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ENG');
UPDATE stickers SET title = 'Phil Foden' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ENG');
UPDATE stickers SET title = 'Bukayo Saka' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ENG');
UPDATE stickers SET title = 'Harry Kane' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ENG');
UPDATE stickers SET title = 'Marcus Rashford' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ENG');
UPDATE stickers SET title = 'Ollie Watkins' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'ENG');

-- Croácia (CRO)
UPDATE stickers SET title = 'Dominik Livaković' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CRO');
UPDATE stickers SET title = 'Duje Ćaleta-Car' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CRO');
UPDATE stickers SET title = 'Joško Gvardiol' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CRO');
UPDATE stickers SET title = 'Josip Stanišić' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CRO');
UPDATE stickers SET title = 'Luka Vušković' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CRO');
UPDATE stickers SET title = 'Josip Šutalo' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CRO');
UPDATE stickers SET title = 'Kristijan Jakić' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CRO');
UPDATE stickers SET title = 'Luka Modrić' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CRO');
UPDATE stickers SET title = 'Mateo Kovačić' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CRO');
UPDATE stickers SET title = 'Martin Baturina' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CRO');
UPDATE stickers SET title = 'Lovro Majer' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CRO');
UPDATE stickers SET title = 'Mario Pašalić' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CRO');
UPDATE stickers SET title = 'Petar Sučić' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CRO');
UPDATE stickers SET title = 'Ivan Perišić' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CRO');
UPDATE stickers SET title = 'Marco Pašalić' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CRO');
UPDATE stickers SET title = 'Ante Budimir' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CRO');
UPDATE stickers SET title = 'Andrej Kramarić' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CRO');
UPDATE stickers SET title = 'Franjo Ivanović' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'CRO');

-- Gana (GHA)
UPDATE stickers SET title = 'Lawrence Ati Zigi' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'GHA');
UPDATE stickers SET title = 'Tariq Lamptey' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'GHA');
UPDATE stickers SET title = 'Mohammed Salisu' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'GHA');
UPDATE stickers SET title = 'Alidu Seidu' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'GHA');
UPDATE stickers SET title = 'Alexander Djiku' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'GHA');
UPDATE stickers SET title = 'Gideon Mensah' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'GHA');
UPDATE stickers SET title = 'Caleb Yirenkyi' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'GHA');
UPDATE stickers SET title = 'Abdul Fatawu Issahaku' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'GHA');
UPDATE stickers SET title = 'Thomas Partey' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'GHA');
UPDATE stickers SET title = 'Salis Abdul Samed' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'GHA');
UPDATE stickers SET title = 'Kamaldeen Sulemana' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'GHA');
UPDATE stickers SET title = 'Mohammed Kudus' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'GHA');
UPDATE stickers SET title = 'Iñaki Williams' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'GHA');
UPDATE stickers SET title = 'Jordan Ayew' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'GHA');
UPDATE stickers SET title = 'André Ayew' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'GHA');
UPDATE stickers SET title = 'Joseph Paintsil' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'GHA');
UPDATE stickers SET title = 'Osman Bukari' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'GHA');
UPDATE stickers SET title = 'Antoine Semenyo' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'GHA');

-- Panamá (PAN)
UPDATE stickers SET title = 'Orlando Mosquera' WHERE number = 2 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'PAN');
UPDATE stickers SET title = 'Luis Mejía' WHERE number = 3 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'PAN');
UPDATE stickers SET title = 'Fidel Escobar' WHERE number = 4 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'PAN');
UPDATE stickers SET title = 'Andrés Andrade' WHERE number = 5 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'PAN');
UPDATE stickers SET title = 'Michael Amir Murillo' WHERE number = 6 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'PAN');
UPDATE stickers SET title = 'Eric Davis' WHERE number = 7 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'PAN');
UPDATE stickers SET title = 'José Córdoba' WHERE number = 8 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'PAN');
UPDATE stickers SET title = 'César Blackman' WHERE number = 9 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'PAN');
UPDATE stickers SET title = 'Cristian Martínez' WHERE number = 10 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'PAN');
UPDATE stickers SET title = 'Aníbal Godoy' WHERE number = 11 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'PAN');
UPDATE stickers SET title = 'Adalberto Carrasquilla' WHERE number = 12 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'PAN');
UPDATE stickers SET title = 'Édgar Bárcenas' WHERE number = 14 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'PAN');
UPDATE stickers SET title = 'Carlos Harvey' WHERE number = 15 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'PAN');
UPDATE stickers SET title = 'Ismael Díaz' WHERE number = 16 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'PAN');
UPDATE stickers SET title = 'José Fajardo' WHERE number = 17 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'PAN');
UPDATE stickers SET title = 'Cecilio Waterman' WHERE number = 18 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'PAN');
UPDATE stickers SET title = 'José Luis Rodríguez' WHERE number = 19 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'PAN');
UPDATE stickers SET title = 'Alberto Quintero' WHERE number = 20 AND group_id = (SELECT id FROM sticker_groups WHERE code = 'PAN');
