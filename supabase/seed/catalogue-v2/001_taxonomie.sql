-- =====================================================================
-- Catalogue V2 : les huit categories et leurs 53 collections
--
-- Deux niveaux, comme le schema le permet depuis l'origine : la
-- categorie porte la collection. Tout arrive en brouillon et invisible —
-- la bascule ouvre les rayons quand les cartes y sont.
-- 
-- La cle du classeur devient le slug : c'est l'identifiant que le
-- classeur fournit, il n'est pas renomme en chemin.
-- 
-- Rejouable : reconnaissance par `external_ref`.
-- =====================================================================

-- --- Portraits & souvenirs (5 collections) ---
insert into public.categories (external_ref, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-CAT-01', 'image'::public.app_mode, 'portraits-et-souvenirs', 'Portraits & souvenirs', 1, 'draft'::public.content_status, false, 'prompt-media/families/image/portraits-et-souvenirs.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-CAT-01');
update public.categories set slug = 'portraits-et-souvenirs', name = 'Portraits & souvenirs', sort_order = 1, mode = 'image'::public.app_mode, fallback_image_path = 'prompt-media/families/image/portraits-et-souvenirs.webp' where external_ref = 'V2-CAT-01';

insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-01-01', (select id from public.categories where external_ref = 'V2-CAT-01'), 'image'::public.app_mode, 'epoques', 'Époques', 1, 'draft'::public.content_status, false, 'prompt-media/families/image/epoques.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-01-01');
update public.categories set slug = 'epoques', name = 'Époques', sort_order = 1, parent_id = (select id from public.categories where external_ref = 'V2-CAT-01'), fallback_image_path = 'prompt-media/families/image/epoques.webp' where external_ref = 'V2-COL-01-01';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-01-02', (select id from public.categories where external_ref = 'V2-CAT-01'), 'image'::public.app_mode, 'relations', 'Relations', 2, 'draft'::public.content_status, false, 'prompt-media/families/image/relations.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-01-02');
update public.categories set slug = 'relations', name = 'Relations', sort_order = 2, parent_id = (select id from public.categories where external_ref = 'V2-CAT-01'), fallback_image_path = 'prompt-media/families/image/relations.webp' where external_ref = 'V2-COL-01-02';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-01-03', (select id from public.categories where external_ref = 'V2-CAT-01'), 'image'::public.app_mode, 'celebrations', 'Célébrations', 3, 'draft'::public.content_status, false, 'prompt-media/families/image/celebrations.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-01-03');
update public.categories set slug = 'celebrations', name = 'Célébrations', sort_order = 3, parent_id = (select id from public.categories where external_ref = 'V2-CAT-01'), fallback_image_path = 'prompt-media/families/image/celebrations.webp' where external_ref = 'V2-COL-01-03';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-01-04', (select id from public.categories where external_ref = 'V2-CAT-01'), 'image'::public.app_mode, 'cultures', 'Cultures', 4, 'draft'::public.content_status, false, 'prompt-media/families/image/cultures.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-01-04');
update public.categories set slug = 'cultures', name = 'Cultures', sort_order = 4, parent_id = (select id from public.categories where external_ref = 'V2-CAT-01'), fallback_image_path = 'prompt-media/families/image/cultures.webp' where external_ref = 'V2-COL-01-04';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-01-05', (select id from public.categories where external_ref = 'V2-CAT-01'), 'image'::public.app_mode, 'voyages', 'Voyages', 5, 'draft'::public.content_status, false, 'prompt-media/families/image/voyages.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-01-05');
update public.categories set slug = 'voyages', name = 'Voyages', sort_order = 5, parent_id = (select id from public.categories where external_ref = 'V2-CAT-01'), fallback_image_path = 'prompt-media/families/image/voyages.webp' where external_ref = 'V2-COL-01-05';

-- --- Style et identité (4 collections) ---
insert into public.categories (external_ref, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-CAT-02', 'image'::public.app_mode, 'style-et-identite', 'Style et identité', 2, 'draft'::public.content_status, false, 'prompt-media/families/image/style-et-identite.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-CAT-02');
update public.categories set slug = 'style-et-identite', name = 'Style et identité', sort_order = 2, mode = 'image'::public.app_mode, fallback_image_path = 'prompt-media/families/image/style-et-identite.webp' where external_ref = 'V2-CAT-02';

insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-02-01', (select id from public.categories where external_ref = 'V2-CAT-02'), 'image'::public.app_mode, 'beaute', 'Beauté', 1, 'draft'::public.content_status, false, 'prompt-media/families/image/beaute.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-02-01');
update public.categories set slug = 'beaute', name = 'Beauté', sort_order = 1, parent_id = (select id from public.categories where external_ref = 'V2-CAT-02'), fallback_image_path = 'prompt-media/families/image/beaute.webp' where external_ref = 'V2-COL-02-01';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-02-02', (select id from public.categories where external_ref = 'V2-CAT-02'), 'image'::public.app_mode, 'essayage', 'Essayage', 2, 'draft'::public.content_status, false, 'prompt-media/families/image/essayage.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-02-02');
update public.categories set slug = 'essayage', name = 'Essayage', sort_order = 2, parent_id = (select id from public.categories where external_ref = 'V2-CAT-02'), fallback_image_path = 'prompt-media/families/image/essayage.webp' where external_ref = 'V2-COL-02-02';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-02-03', (select id from public.categories where external_ref = 'V2-CAT-02'), 'image'::public.app_mode, 'portrait-pro', 'Portrait pro', 3, 'draft'::public.content_status, false, 'prompt-media/families/image/portrait-pro.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-02-03');
update public.categories set slug = 'portrait-pro', name = 'Portrait pro', sort_order = 3, parent_id = (select id from public.categories where external_ref = 'V2-CAT-02'), fallback_image_path = 'prompt-media/families/image/portrait-pro.webp' where external_ref = 'V2-COL-02-03';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-02-04', (select id from public.categories where external_ref = 'V2-CAT-02'), 'image'::public.app_mode, 'retouche', 'Retouche', 4, 'draft'::public.content_status, false, 'prompt-media/families/image/retouche.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-02-04');
update public.categories set slug = 'retouche', name = 'Retouche', sort_order = 4, parent_id = (select id from public.categories where external_ref = 'V2-CAT-02'), fallback_image_path = 'prompt-media/families/image/retouche.webp' where external_ref = 'V2-COL-02-04';

-- --- Art & effets (21 collections) ---
insert into public.categories (external_ref, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-CAT-03', 'image'::public.app_mode, 'creations-et-vfx', 'Art & effets', 3, 'draft'::public.content_status, false, 'prompt-media/families/image/creations-et-vfx.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-CAT-03');
update public.categories set slug = 'creations-et-vfx', name = 'Art & effets', sort_order = 3, mode = 'image'::public.app_mode, fallback_image_path = 'prompt-media/families/image/creations-et-vfx.webp' where external_ref = 'V2-CAT-03';

insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-03-01', (select id from public.categories where external_ref = 'V2-CAT-03'), 'image'::public.app_mode, 'humour', 'Humour', 1, 'draft'::public.content_status, false, 'prompt-media/families/image/humour.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-03-01');
update public.categories set slug = 'humour', name = 'Humour', sort_order = 1, parent_id = (select id from public.categories where external_ref = 'V2-CAT-03'), fallback_image_path = 'prompt-media/families/image/humour.webp' where external_ref = 'V2-COL-03-01';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-03-02', (select id from public.categories where external_ref = 'V2-CAT-03'), 'image'::public.app_mode, 'jeux-visuels', 'Jeux visuels', 2, 'draft'::public.content_status, false, 'prompt-media/families/image/jeux-visuels.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-03-02');
update public.categories set slug = 'jeux-visuels', name = 'Jeux visuels', sort_order = 2, parent_id = (select id from public.categories where external_ref = 'V2-CAT-03'), fallback_image_path = 'prompt-media/families/image/jeux-visuels.webp' where external_ref = 'V2-COL-03-02';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-03-03', (select id from public.categories where external_ref = 'V2-CAT-03'), 'image'::public.app_mode, 'action-et-espionnage', 'Action & espionnage', 3, 'draft'::public.content_status, false, 'prompt-media/families/image/action-et-espionnage.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-03-03');
update public.categories set slug = 'action-et-espionnage', name = 'Action & espionnage', sort_order = 3, parent_id = (select id from public.categories where external_ref = 'V2-CAT-03'), fallback_image_path = 'prompt-media/families/image/action-et-espionnage.webp' where external_ref = 'V2-COL-03-03';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-03-04', (select id from public.categories where external_ref = 'V2-CAT-03'), 'image'::public.app_mode, 'editorial', 'Éditorial', 4, 'draft'::public.content_status, false, 'prompt-media/families/image/editorial.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-03-04');
update public.categories set slug = 'editorial', name = 'Éditorial', sort_order = 4, parent_id = (select id from public.categories where external_ref = 'V2-CAT-03'), fallback_image_path = 'prompt-media/families/image/editorial.webp' where external_ref = 'V2-COL-03-04';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-03-05', (select id from public.categories where external_ref = 'V2-CAT-03'), 'image'::public.app_mode, 'personnages-cultes', 'Personnages cultes', 5, 'draft'::public.content_status, false, 'prompt-media/families/image/personnages-cultes.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-03-05');
update public.categories set slug = 'personnages-cultes', name = 'Personnages cultes', sort_order = 5, parent_id = (select id from public.categories where external_ref = 'V2-CAT-03'), fallback_image_path = 'prompt-media/families/image/personnages-cultes.webp' where external_ref = 'V2-COL-03-05';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-03-06', (select id from public.categories where external_ref = 'V2-CAT-03'), 'image'::public.app_mode, 'business-et-leadership', 'Business & leadership', 6, 'draft'::public.content_status, false, 'prompt-media/families/image/business-et-leadership.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-03-06');
update public.categories set slug = 'business-et-leadership', name = 'Business & leadership', sort_order = 6, parent_id = (select id from public.categories where external_ref = 'V2-CAT-03'), fallback_image_path = 'prompt-media/families/image/business-et-leadership.webp' where external_ref = 'V2-COL-03-06';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-03-07', (select id from public.categories where external_ref = 'V2-CAT-03'), 'image'::public.app_mode, 'sport-et-performance', 'Sport & performance', 7, 'draft'::public.content_status, false, 'prompt-media/families/image/sport-et-performance.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-03-07');
update public.categories set slug = 'sport-et-performance', name = 'Sport & performance', sort_order = 7, parent_id = (select id from public.categories where external_ref = 'V2-CAT-03'), fallback_image_path = 'prompt-media/families/image/sport-et-performance.webp' where external_ref = 'V2-COL-03-07';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-03-08', (select id from public.categories where external_ref = 'V2-CAT-03'), 'image'::public.app_mode, 'signatures-picturales', 'Signatures picturales', 8, 'draft'::public.content_status, false, 'prompt-media/families/image/signatures-picturales.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-03-08');
update public.categories set slug = 'signatures-picturales', name = 'Signatures picturales', sort_order = 8, parent_id = (select id from public.categories where external_ref = 'V2-CAT-03'), fallback_image_path = 'prompt-media/families/image/signatures-picturales.webp' where external_ref = 'V2-COL-03-08';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-03-09', (select id from public.categories where external_ref = 'V2-CAT-03'), 'image'::public.app_mode, 'mouvements-artistiques', 'Mouvements artistiques', 9, 'draft'::public.content_status, false, 'prompt-media/families/image/mouvements-artistiques.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-03-09');
update public.categories set slug = 'mouvements-artistiques', name = 'Mouvements artistiques', sort_order = 9, parent_id = (select id from public.categories where external_ref = 'V2-CAT-03'), fallback_image_path = 'prompt-media/families/image/mouvements-artistiques.webp' where external_ref = 'V2-COL-03-09';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-03-10', (select id from public.categories where external_ref = 'V2-CAT-03'), 'image'::public.app_mode, 'matieres-et-metamorphoses', 'Matières & métamorphoses', 10, 'draft'::public.content_status, false, 'prompt-media/families/image/matieres-et-metamorphoses.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-03-10');
update public.categories set slug = 'matieres-et-metamorphoses', name = 'Matières & métamorphoses', sort_order = 10, parent_id = (select id from public.categories where external_ref = 'V2-CAT-03'), fallback_image_path = 'prompt-media/families/image/matieres-et-metamorphoses.webp' where external_ref = 'V2-COL-03-10';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-03-11', (select id from public.categories where external_ref = 'V2-CAT-03'), 'image'::public.app_mode, 'effets-de-scene', 'Effets de scène', 11, 'draft'::public.content_status, false, 'prompt-media/families/image/effets-de-scene.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-03-11');
update public.categories set slug = 'effets-de-scene', name = 'Effets de scène', sort_order = 11, parent_id = (select id from public.categories where external_ref = 'V2-CAT-03'), fallback_image_path = 'prompt-media/families/image/effets-de-scene.webp' where external_ref = 'V2-COL-03-11';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-03-12', (select id from public.categories where external_ref = 'V2-CAT-03'), 'image'::public.app_mode, 'espace-et-gravite', 'Espace & gravité', 12, 'draft'::public.content_status, false, 'prompt-media/families/image/espace-et-gravite.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-03-12');
update public.categories set slug = 'espace-et-gravite', name = 'Espace & gravité', sort_order = 12, parent_id = (select id from public.categories where external_ref = 'V2-CAT-03'), fallback_image_path = 'prompt-media/families/image/espace-et-gravite.webp' where external_ref = 'V2-COL-03-12';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-03-13', (select id from public.categories where external_ref = 'V2-CAT-03'), 'image'::public.app_mode, 'lumiere-et-optique', 'Lumière & optique', 13, 'draft'::public.content_status, false, 'prompt-media/families/image/lumiere-et-optique.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-03-13');
update public.categories set slug = 'lumiere-et-optique', name = 'Lumière & optique', sort_order = 13, parent_id = (select id from public.categories where external_ref = 'V2-CAT-03'), fallback_image_path = 'prompt-media/families/image/lumiere-et-optique.webp' where external_ref = 'V2-COL-03-13';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-03-14', (select id from public.categories where external_ref = 'V2-CAT-03'), 'image'::public.app_mode, 'particules-et-metamorphoses', 'Particules & métamorphoses', 14, 'draft'::public.content_status, false, 'prompt-media/families/image/particules-et-metamorphoses.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-03-14');
update public.categories set slug = 'particules-et-metamorphoses', name = 'Particules & métamorphoses', sort_order = 14, parent_id = (select id from public.categories where external_ref = 'V2-CAT-03'), fallback_image_path = 'prompt-media/families/image/particules-et-metamorphoses.webp' where external_ref = 'V2-COL-03-14';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-03-15', (select id from public.categories where external_ref = 'V2-CAT-03'), 'image'::public.app_mode, 'montages-originaux', 'Montages originaux', 15, 'draft'::public.content_status, false, 'prompt-media/families/image/montages-originaux.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-03-15');
update public.categories set slug = 'montages-originaux', name = 'Montages originaux', sort_order = 15, parent_id = (select id from public.categories where external_ref = 'V2-CAT-03'), fallback_image_path = 'prompt-media/families/image/montages-originaux.webp' where external_ref = 'V2-COL-03-15';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-03-16', (select id from public.categories where external_ref = 'V2-CAT-03'), 'image'::public.app_mode, 'scenes-atypiques', 'Scènes atypiques', 16, 'draft'::public.content_status, false, 'prompt-media/families/image/scenes-atypiques.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-03-16');
update public.categories set slug = 'scenes-atypiques', name = 'Scènes atypiques', sort_order = 16, parent_id = (select id from public.categories where external_ref = 'V2-CAT-03'), fallback_image_path = 'prompt-media/families/image/scenes-atypiques.webp' where external_ref = 'V2-COL-03-16';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-03-17', (select id from public.categories where external_ref = 'V2-CAT-03'), 'image'::public.app_mode, 'dessins-et-manuscrits', 'Dessins et manuscrits', 17, 'draft'::public.content_status, false, 'prompt-media/families/image/dessins-et-manuscrits.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-03-17');
update public.categories set slug = 'dessins-et-manuscrits', name = 'Dessins et manuscrits', sort_order = 17, parent_id = (select id from public.categories where external_ref = 'V2-CAT-03'), fallback_image_path = 'prompt-media/families/image/dessins-et-manuscrits.webp' where external_ref = 'V2-COL-03-17';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-03-18', (select id from public.categories where external_ref = 'V2-CAT-03'), 'image'::public.app_mode, 'musique-et-pop-culture', 'Musique & pop culture', 18, 'draft'::public.content_status, false, 'prompt-media/families/image/musique-et-pop-culture.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-03-18');
update public.categories set slug = 'musique-et-pop-culture', name = 'Musique & pop culture', sort_order = 18, parent_id = (select id from public.categories where external_ref = 'V2-CAT-03'), fallback_image_path = 'prompt-media/families/image/musique-et-pop-culture.webp' where external_ref = 'V2-COL-03-18';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-03-19', (select id from public.categories where external_ref = 'V2-CAT-03'), 'image'::public.app_mode, 'cinema', 'Cinéma', 19, 'draft'::public.content_status, false, 'prompt-media/families/image/cinema.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-03-19');
update public.categories set slug = 'cinema', name = 'Cinéma', sort_order = 19, parent_id = (select id from public.categories where external_ref = 'V2-CAT-03'), fallback_image_path = 'prompt-media/families/image/cinema.webp' where external_ref = 'V2-COL-03-19';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-03-20', (select id from public.categories where external_ref = 'V2-CAT-03'), 'image'::public.app_mode, 'ambiances-de-cinema', 'Ambiances de cinéma', 20, 'draft'::public.content_status, false, 'prompt-media/families/image/ambiances-de-cinema.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-03-20');
update public.categories set slug = 'ambiances-de-cinema', name = 'Ambiances de cinéma', sort_order = 20, parent_id = (select id from public.categories where external_ref = 'V2-CAT-03'), fallback_image_path = 'prompt-media/families/image/ambiances-de-cinema.webp' where external_ref = 'V2-COL-03-20';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-03-21', (select id from public.categories where external_ref = 'V2-CAT-03'), 'image'::public.app_mode, 'fantastique-et-mystere', 'Fantastique & mystère', 21, 'draft'::public.content_status, false, 'prompt-media/families/image/fantastique-et-mystere.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-03-21');
update public.categories set slug = 'fantastique-et-mystere', name = 'Fantastique & mystère', sort_order = 21, parent_id = (select id from public.categories where external_ref = 'V2-CAT-03'), fallback_image_path = 'prompt-media/families/image/fantastique-et-mystere.webp' where external_ref = 'V2-COL-03-21';

-- --- Photos produit (4 collections) ---
insert into public.categories (external_ref, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-CAT-04', 'image'::public.app_mode, 'produit-et-e-commerce', 'Photos produit', 4, 'draft'::public.content_status, false, 'prompt-media/families/image/produit-et-e-commerce.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-CAT-04');
update public.categories set slug = 'produit-et-e-commerce', name = 'Photos produit', sort_order = 4, mode = 'image'::public.app_mode, fallback_image_path = 'prompt-media/families/image/produit-et-e-commerce.webp' where external_ref = 'V2-CAT-04';

insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-04-01', (select id from public.categories where external_ref = 'V2-CAT-04'), 'image'::public.app_mode, 'photo-produit', 'Photo produit', 1, 'draft'::public.content_status, false, 'prompt-media/families/image/photo-produit.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-04-01');
update public.categories set slug = 'photo-produit', name = 'Photo produit', sort_order = 1, parent_id = (select id from public.categories where external_ref = 'V2-CAT-04'), fallback_image_path = 'prompt-media/families/image/photo-produit.webp' where external_ref = 'V2-COL-04-01';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-04-02', (select id from public.categories where external_ref = 'V2-CAT-04'), 'image'::public.app_mode, 'usage', 'Usage', 2, 'draft'::public.content_status, false, 'prompt-media/families/image/usage.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-04-02');
update public.categories set slug = 'usage', name = 'Usage', sort_order = 2, parent_id = (select id from public.categories where external_ref = 'V2-CAT-04'), fallback_image_path = 'prompt-media/families/image/usage.webp' where external_ref = 'V2-COL-04-02';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-04-03', (select id from public.categories where external_ref = 'V2-CAT-04'), 'image'::public.app_mode, 'preparation', 'Préparation', 3, 'draft'::public.content_status, false, 'prompt-media/families/image/preparation.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-04-03');
update public.categories set slug = 'preparation', name = 'Préparation', sort_order = 3, parent_id = (select id from public.categories where external_ref = 'V2-CAT-04'), fallback_image_path = 'prompt-media/families/image/preparation.webp' where external_ref = 'V2-COL-04-03';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-04-04', (select id from public.categories where external_ref = 'V2-CAT-04'), 'image'::public.app_mode, 'restauration', 'Restauration', 4, 'draft'::public.content_status, false, 'prompt-media/families/image/restauration.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-04-04');
update public.categories set slug = 'restauration', name = 'Restauration', sort_order = 4, parent_id = (select id from public.categories where external_ref = 'V2-CAT-04'), fallback_image_path = 'prompt-media/families/image/restauration.webp' where external_ref = 'V2-COL-04-04';

-- --- Marques & publicité (5 collections) ---
insert into public.categories (external_ref, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-CAT-05', 'image'::public.app_mode, 'publicite-et-marque', 'Marques & publicité', 5, 'draft'::public.content_status, false, 'prompt-media/families/image/publicite-et-marque.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-CAT-05');
update public.categories set slug = 'publicite-et-marque', name = 'Marques & publicité', sort_order = 5, mode = 'image'::public.app_mode, fallback_image_path = 'prompt-media/families/image/publicite-et-marque.webp' where external_ref = 'V2-CAT-05';

insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-05-01', (select id from public.categories where external_ref = 'V2-CAT-05'), 'image'::public.app_mode, 'commerce-local', 'Commerce local', 1, 'draft'::public.content_status, false, 'prompt-media/families/image/commerce-local.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-05-01');
update public.categories set slug = 'commerce-local', name = 'Commerce local', sort_order = 1, parent_id = (select id from public.categories where external_ref = 'V2-CAT-05'), fallback_image_path = 'prompt-media/families/image/commerce-local.webp' where external_ref = 'V2-COL-05-01';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-05-02', (select id from public.categories where external_ref = 'V2-CAT-05'), 'image'::public.app_mode, 'createurs', 'Créateurs', 2, 'draft'::public.content_status, false, 'prompt-media/families/image/createurs.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-05-02');
update public.categories set slug = 'createurs', name = 'Créateurs', sort_order = 2, parent_id = (select id from public.categories where external_ref = 'V2-CAT-05'), fallback_image_path = 'prompt-media/families/image/createurs.webp' where external_ref = 'V2-COL-05-02';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-05-03', (select id from public.categories where external_ref = 'V2-CAT-05'), 'image'::public.app_mode, 'publicites', 'Publicités', 3, 'draft'::public.content_status, false, 'prompt-media/families/image/publicites.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-05-03');
update public.categories set slug = 'publicites', name = 'Publicités', sort_order = 3, parent_id = (select id from public.categories where external_ref = 'V2-CAT-05'), fallback_image_path = 'prompt-media/families/image/publicites.webp' where external_ref = 'V2-COL-05-03';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-05-04', (select id from public.categories where external_ref = 'V2-CAT-05'), 'image'::public.app_mode, 'offres', 'Offres', 4, 'draft'::public.content_status, false, 'prompt-media/families/image/offres.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-05-04');
update public.categories set slug = 'offres', name = 'Offres', sort_order = 4, parent_id = (select id from public.categories where external_ref = 'V2-CAT-05'), fallback_image_path = 'prompt-media/families/image/offres.webp' where external_ref = 'V2-COL-05-04';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-05-05', (select id from public.categories where external_ref = 'V2-CAT-05'), 'image'::public.app_mode, 'packaging', 'Packaging', 5, 'draft'::public.content_status, false, 'prompt-media/families/image/packaging.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-05-05');
update public.categories set slug = 'packaging', name = 'Packaging', sort_order = 5, parent_id = (select id from public.categories where external_ref = 'V2-CAT-05'), fallback_image_path = 'prompt-media/families/image/packaging.webp' where external_ref = 'V2-COL-05-05';

-- --- Design & technique (5 collections) ---
insert into public.categories (external_ref, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-CAT-06', 'image'::public.app_mode, 'design-et-technique', 'Design & technique', 6, 'draft'::public.content_status, false, 'prompt-media/families/image/design-et-technique.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-CAT-06');
update public.categories set slug = 'design-et-technique', name = 'Design & technique', sort_order = 6, mode = 'image'::public.app_mode, fallback_image_path = 'prompt-media/families/image/design-et-technique.webp' where external_ref = 'V2-CAT-06';

insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-06-01', (select id from public.categories where external_ref = 'V2-CAT-06'), 'image'::public.app_mode, 'pedagogie', 'Pédagogie', 1, 'draft'::public.content_status, false, 'prompt-media/families/image/pedagogie.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-06-01');
update public.categories set slug = 'pedagogie', name = 'Pédagogie', sort_order = 1, parent_id = (select id from public.categories where external_ref = 'V2-CAT-06'), fallback_image_path = 'prompt-media/families/image/pedagogie.webp' where external_ref = 'V2-COL-06-01';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-06-02', (select id from public.categories where external_ref = 'V2-CAT-06'), 'image'::public.app_mode, 'concepts', 'Concepts', 2, 'draft'::public.content_status, false, 'prompt-media/families/image/concepts.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-06-02');
update public.categories set slug = 'concepts', name = 'Concepts', sort_order = 2, parent_id = (select id from public.categories where external_ref = 'V2-CAT-06'), fallback_image_path = 'prompt-media/families/image/concepts.webp' where external_ref = 'V2-COL-06-02';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-06-03', (select id from public.categories where external_ref = 'V2-CAT-06'), 'image'::public.app_mode, 'documentation', 'Documentation', 3, 'draft'::public.content_status, false, 'prompt-media/families/image/documentation.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-06-03');
update public.categories set slug = 'documentation', name = 'Documentation', sort_order = 3, parent_id = (select id from public.categories where external_ref = 'V2-CAT-06'), fallback_image_path = 'prompt-media/families/image/documentation.webp' where external_ref = 'V2-COL-06-03';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-06-04', (select id from public.categories where external_ref = 'V2-CAT-06'), 'image'::public.app_mode, 'matieres', 'Matières', 4, 'draft'::public.content_status, false, 'prompt-media/families/image/matieres.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-06-04');
update public.categories set slug = 'matieres', name = 'Matières', sort_order = 4, parent_id = (select id from public.categories where external_ref = 'V2-CAT-06'), fallback_image_path = 'prompt-media/families/image/matieres.webp' where external_ref = 'V2-COL-06-04';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-06-05', (select id from public.categories where external_ref = 'V2-CAT-06'), 'image'::public.app_mode, 'espaces', 'Espaces', 5, 'draft'::public.content_status, false, 'prompt-media/families/image/espaces.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-06-05');
update public.categories set slug = 'espaces', name = 'Espaces', sort_order = 5, parent_id = (select id from public.categories where external_ref = 'V2-CAT-06'), fallback_image_path = 'prompt-media/families/image/espaces.webp' where external_ref = 'V2-COL-06-05';

-- --- Modes IA (7 collections) ---
insert into public.categories (external_ref, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-CAT-07', 'texte'::public.app_mode, 'modes-ia', 'Modes IA', 7, 'draft'::public.content_status, false, 'prompt-media/families/texte/modes-ia.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-CAT-07');
update public.categories set slug = 'modes-ia', name = 'Modes IA', sort_order = 7, mode = 'texte'::public.app_mode, fallback_image_path = 'prompt-media/families/texte/modes-ia.webp' where external_ref = 'V2-CAT-07';

insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-07-01', (select id from public.categories where external_ref = 'V2-CAT-07'), 'texte'::public.app_mode, 'professionnels-et-vente', 'Professionnels et vente', 1, 'draft'::public.content_status, false, 'prompt-media/families/texte/professionnels-et-vente.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-07-01');
update public.categories set slug = 'professionnels-et-vente', name = 'Professionnels et vente', sort_order = 1, parent_id = (select id from public.categories where external_ref = 'V2-CAT-07'), fallback_image_path = 'prompt-media/families/texte/professionnels-et-vente.webp' where external_ref = 'V2-COL-07-01';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-07-02', (select id from public.categories where external_ref = 'V2-CAT-07'), 'texte'::public.app_mode, 'critiques-et-roasts', 'Critiques et roasts', 2, 'draft'::public.content_status, false, 'prompt-media/families/texte/critiques-et-roasts.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-07-02');
update public.categories set slug = 'critiques-et-roasts', name = 'Critiques et roasts', sort_order = 2, parent_id = (select id from public.categories where external_ref = 'V2-CAT-07'), fallback_image_path = 'prompt-media/families/texte/critiques-et-roasts.webp' where external_ref = 'V2-COL-07-02';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-07-03', (select id from public.categories where external_ref = 'V2-CAT-07'), 'texte'::public.app_mode, 'clarte-et-modeles-mentaux', 'Clarté et modèles mentaux', 3, 'draft'::public.content_status, false, 'prompt-media/families/texte/clarte-et-modeles-mentaux.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-07-03');
update public.categories set slug = 'clarte-et-modeles-mentaux', name = 'Clarté et modèles mentaux', sort_order = 3, parent_id = (select id from public.categories where external_ref = 'V2-CAT-07'), fallback_image_path = 'prompt-media/families/texte/clarte-et-modeles-mentaux.webp' where external_ref = 'V2-COL-07-03';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-07-04', (select id from public.categories where external_ref = 'V2-CAT-07'), 'texte'::public.app_mode, 'personnages-immersifs', 'Personnages immersifs', 4, 'draft'::public.content_status, false, 'prompt-media/families/texte/personnages-immersifs.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-07-04');
update public.categories set slug = 'personnages-immersifs', name = 'Personnages immersifs', sort_order = 4, parent_id = (select id from public.categories where external_ref = 'V2-CAT-07'), fallback_image_path = 'prompt-media/families/texte/personnages-immersifs.webp' where external_ref = 'V2-COL-07-04';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-07-05', (select id from public.categories where external_ref = 'V2-CAT-07'), 'texte'::public.app_mode, 'jeux-enigmes-et-simulations', 'Jeux, énigmes et simulations', 5, 'draft'::public.content_status, false, 'prompt-media/families/texte/jeux-enigmes-et-simulations.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-07-05');
update public.categories set slug = 'jeux-enigmes-et-simulations', name = 'Jeux, énigmes et simulations', sort_order = 5, parent_id = (select id from public.categories where external_ref = 'V2-CAT-07'), fallback_image_path = 'prompt-media/families/texte/jeux-enigmes-et-simulations.webp' where external_ref = 'V2-COL-07-05';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-07-06', (select id from public.categories where external_ref = 'V2-CAT-07'), 'texte'::public.app_mode, 'creativite-et-angles-inattendus', 'Créativité et angles inattendus', 6, 'draft'::public.content_status, false, 'prompt-media/families/texte/creativite-et-angles-inattendus.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-07-06');
update public.categories set slug = 'creativite-et-angles-inattendus', name = 'Créativité et angles inattendus', sort_order = 6, parent_id = (select id from public.categories where external_ref = 'V2-CAT-07'), fallback_image_path = 'prompt-media/families/texte/creativite-et-angles-inattendus.webp' where external_ref = 'V2-COL-07-06';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-07-07', (select id from public.categories where external_ref = 'V2-CAT-07'), 'texte'::public.app_mode, 'style-et-conseil-personnel', 'Style et conseil personnel', 7, 'draft'::public.content_status, false, 'prompt-media/families/texte/style-et-conseil-personnel.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-07-07');
update public.categories set slug = 'style-et-conseil-personnel', name = 'Style et conseil personnel', sort_order = 7, parent_id = (select id from public.categories where external_ref = 'V2-CAT-07'), fallback_image_path = 'prompt-media/families/texte/style-et-conseil-personnel.webp' where external_ref = 'V2-COL-07-07';

-- --- Parcours guidés (2 collections) ---
insert into public.categories (external_ref, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-CAT-08', 'image'::public.app_mode, 'parcours-guides', 'Parcours guidés', 8, 'draft'::public.content_status, false, 'prompt-media/families/image/parcours-guides.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-CAT-08');
update public.categories set slug = 'parcours-guides', name = 'Parcours guidés', sort_order = 8, mode = 'image'::public.app_mode, fallback_image_path = 'prompt-media/families/image/parcours-guides.webp' where external_ref = 'V2-CAT-08';

insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-08-01', (select id from public.categories where external_ref = 'V2-CAT-08'), 'image'::public.app_mode, 'parcours-visuels', 'Parcours visuels', 1, 'draft'::public.content_status, false, 'prompt-media/families/image/parcours-visuels.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-08-01');
update public.categories set slug = 'parcours-visuels', name = 'Parcours visuels', sort_order = 1, parent_id = (select id from public.categories where external_ref = 'V2-CAT-08'), fallback_image_path = 'prompt-media/families/image/parcours-visuels.webp' where external_ref = 'V2-COL-08-01';
insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)
select 'V2-COL-08-02', (select id from public.categories where external_ref = 'V2-CAT-08'), 'image'::public.app_mode, 'parcours-mixtes-et-modes', 'Parcours mixtes et modes', 2, 'draft'::public.content_status, false, 'prompt-media/families/image/parcours-mixtes-et-modes.webp'
where not exists (select 1 from public.categories c where c.external_ref = 'V2-COL-08-02');
update public.categories set slug = 'parcours-mixtes-et-modes', name = 'Parcours mixtes et modes', sort_order = 2, parent_id = (select id from public.categories where external_ref = 'V2-CAT-08'), fallback_image_path = 'prompt-media/families/image/parcours-mixtes-et-modes.webp' where external_ref = 'V2-COL-08-02';

do $ctrl$
declare v_n integer;
begin
  select count(*) into v_n from public.categories where external_ref like 'V2-%';
  if v_n <> 61 then
    raise exception 'Taxonomie V2 : % rayons au lieu de 61.', v_n;
  end if;
end $ctrl$;
