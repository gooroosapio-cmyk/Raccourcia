-- =====================================================================
-- Bascule du catalogue V2.
--
-- Les lots ont pose la taxonomie et les 692 cartes, en brouillon. Celle-ci
-- ouvre les rayons, publie les cartes que le classeur declare visibles, et
-- archive tout ce qui appartenait au catalogue precedent.
--
-- Rien n'est supprime. Les commandes et les categories d'avant passent en
-- archive : leurs lignes restent, les favoris et l'historique de copie qui
-- les designent restent valides, et republier une categorie suffit a
-- defaire le regroupement. C'est la regle du projet, et c'est de toute
-- facon la seule facon de revenir en arriere.
--
-- Les commandes que le classeur conserve ne sont pas archivees puis
-- recreees : les lots ont repris leur ligne. Elles gardent donc leur
-- identifiant, leurs favoris, leur historique et leurs visuels.
--
-- Tout tient dans une transaction, avec ses controles de sortie. Rejouable.
-- =====================================================================

begin;

-- --- Sauvegardes --------------------------------------------------------

create table if not exists public.prompts_avant_v2 as
select p.id, p.command, p.name, p.slug, p.mode, p.category_id, p.status,
       p.catalog_version, p.is_free, p.is_featured
from public.prompts p;

alter table public.prompts_avant_v2 enable row level security;
revoke all on table public.prompts_avant_v2 from anon, authenticated;

create table if not exists public.categories_avant_v2 as
select c.id, c.external_ref, c.slug, c.name, c.mode, c.parent_id, c.status, c.sort_order
from public.categories c;

alter table public.categories_avant_v2 enable row level security;
revoke all on table public.categories_avant_v2 from anon, authenticated;

-- --- Garde : le catalogue V2 doit etre la --------------------------------

do $garde$
declare
  v_rayons integer;
  v_cartes integer;
begin
  select count(*) into v_rayons from public.categories where external_ref like 'V2-%';
  if v_rayons <> 61 then
    raise exception 'Bascule V2 : % rayons au lieu de 61. Appliquer d abord les lots.', v_rayons;
  end if;

  select count(*) into v_cartes from public.prompts where catalog_v2;
  if v_cartes <> 692 then
    raise exception 'Bascule V2 : % cartes au lieu de 692. Appliquer d abord les lots.', v_cartes;
  end if;
end $garde$;

-- --- Publication des cartes ---------------------------------------------
--
-- Le classeur declare 594 cartes visibles sur 692. Les autres restent
-- en brouillon : elles existent, elles ne s'affichent pas.

-- Par la commande, seul identifiant que partagent une carte du classeur et
-- une ligne reprise du catalogue precedent : celle-ci garde son
-- external_ref d'origine.
create temporary table cartes_visibles (command text primary key) on commit drop;
insert into cartes_visibles (command) values
  ('/ancestorportrait'),
  ('/thenandnow'),
  ('/coupletimeline'),
  ('/futuredescendant'),
  ('/1990sflash'),
  ('/lifeline'),
  ('/familygenerations'),
  ('/childme'),
  ('/yearbookportrait'),
  ('/future2050'),
  ('/1920sportrait'),
  ('/1960smod'),
  ('/1970soul'),
  ('/y2kportrait'),
  ('/legacyportrait'),
  ('/futureelder'),
  ('/royalancestor'),
  ('/agerewind'),
  ('/1950sstudio'),
  ('/1980sstudio'),
  ('/futureheadline'),
  ('/teenself'),
  ('/babyself'),
  ('/friendshipportrait'),
  ('/anniversaryportrait'),
  ('/engagementportrait'),
  ('/siblingportrait'),
  ('/petandme'),
  ('/mentorandme'),
  ('/communityportrait'),
  ('/coupleportrait'),
  ('/familyportrait'),
  ('/weddingportrait'),
  ('/familysignature'),
  ('/innerchildhug'),
  ('/reunionportrait'),
  ('/newbornfamily'),
  ('/birthdayportrait'),
  ('/graduationportrait'),
  ('/festivalportrait'),
  ('/maternityportrait'),
  ('/awardnight'),
  ('/redcarpetmoment'),
  ('/habeshaceremony'),
  ('/russianceremony'),
  ('/yorubaceremony'),
  ('/ndebelegeometryportrait'),
  ('/mariage-bengali'),
  ('/indianweddingportrait'),
  ('/mariage-tamoul'),
  ('/amazighheritage'),
  ('/bambaraheritage'),
  ('/bamilekeheritage'),
  ('/boboheritage'),
  ('/hanbokportrait'),
  ('/kebaya'),
  ('/kimonoheritage'),
  ('/aodai'),
  ('/gouroheritage'),
  ('/igboheritage'),
  ('/kabyle'),
  ('/kenteheritage'),
  ('/kente-ewe'),
  ('/rifain'),
  ('/senoufoheritage'),
  ('/baouleheritage'),
  ('/hausaheritage'),
  ('/mossiheritage'),
  ('/wolofelegance'),
  ('/africancapitalportrait'),
  ('/vacationpostcard'),
  ('/worldcapitalportrait'),
  ('/locspreview'),
  ('/braidpreview'),
  ('/bridalbeauty'),
  ('/haircolor'),
  ('/makeuptry'),
  ('/afroshape'),
  ('/nailartpreview'),
  ('/hairstyle'),
  ('/beardstyle'),
  ('/headwrapstyle'),
  ('/skincareglow'),
  ('/capsulelook'),
  ('/outfitchange'),
  ('/suittryon'),
  ('/glassestry'),
  ('/androgynouslook'),
  ('/couturelook'),
  ('/weddinglook'),
  ('/sportswearlook'),
  ('/streetwearlook'),
  ('/modestfashion'),
  ('/graduationlook'),
  ('/eveninglook'),
  ('/traditionalattire'),
  ('/uniformpreview'),
  ('/runwayeditorial'),
  ('/waxeditorial'),
  ('/dutchportrait'),
  ('/rimlightportrait'),
  ('/lowangleportrait'),
  ('/hardflashportrait'),
  ('/headshot'),
  ('/bluehourportrait'),
  ('/goldenhourportrait'),
  ('/windowlightportrait'),
  ('/personalbrand'),
  ('/motionportrait'),
  ('/overshoulderportrait'),
  ('/musicianpress'),
  ('/bustportrait'),
  ('/highangleportrait'),
  ('/campaignportrait'),
  ('/chefportrait'),
  ('/speakerportrait'),
  ('/creatorportrait'),
  ('/executiveportrait'),
  ('/artisanportrait'),
  ('/authorportrait'),
  ('/fullbodyportrait'),
  ('/teacherportrait'),
  ('/founderportrait'),
  ('/realtorportrait'),
  ('/legalportrait'),
  ('/medicalportrait'),
  ('/neonportrait'),
  ('/profileportrait'),
  ('/silhouetteportrait'),
  ('/threequarterportrait'),
  ('/closeupportrait'),
  ('/splitlighting'),
  ('/butterflylighting'),
  ('/rembrandtlighting'),
  ('/teamportrait'),
  ('/portraitexpand'),
  ('/colorrestore'),
  ('/backgroundclean'),
  ('/oldphotoheal'),
  ('/portraitcrop'),
  ('/portraitclean'),
  ('/friendlycaricature'),
  ('/bigheadcaricature'),
  ('/editorialcaricature'),
  ('/candidchaos'),
  ('/everydayhero'),
  ('/pocketcrew'),
  ('/miniceo'),
  ('/petboss'),
  ('/shadowbuddy'),
  ('/snackplanet'),
  ('/tinyjoy'),
  ('/angelordemon'),
  ('/leadershipavatar'),
  ('/zodiacwarrior'),
  ('/citysoul'),
  ('/personalitymovie'),
  ('/personalityportrait'),
  ('/lovelanguageportrait'),
  ('/auraportraitqcm'),
  ('/animaltotem'),
  ('/mythicarchetype'),
  ('/shadowselfqcm'),
  ('/musicpersona'),
  ('/superpowerreveal'),
  ('/movieposter'),
  ('/affiche-mission'),
  ('/magazinecover'),
  ('/fashionmagazine'),
  ('/biopicposter'),
  ('/romcomposter'),
  ('/horrorposter'),
  ('/sportsposter'),
  ('/originalvillain'),
  ('/comiccover'),
  ('/spythriller'),
  ('/scifiexplorer'),
  ('/noirportrait'),
  ('/actionhero'),
  ('/cyberpunkcharacter'),
  ('/gamecharacter'),
  ('/portraitcinema'),
  ('/documentaryportrait'),
  ('/fantasyroyalty'),
  ('/originalhero'),
  ('/afrobeatsstar'),
  ('/serieskeyart'),
  ('/businesscover'),
  ('/newsmagazine'),
  ('/cover-football'),
  ('/cover-running'),
  ('/sportmagazine'),
  ('/monetportrait'),
  ('/fridabotanical'),
  ('/klimtgold'),
  ('/matissecutout'),
  ('/vermeerlight'),
  ('/hokusaiwave'),
  ('/picassofacets'),
  ('/rembrandtportrait'),
  ('/dalidream'),
  ('/vangoghcanvas'),
  ('/artnouveauobject'),
  ('/bauhausobject'),
  ('/watercolorobject'),
  ('/naivefolkportrait'),
  ('/baroquedrama'),
  ('/tactilecollage'),
  ('/sketchtocharacter'),
  ('/childdrawing3d'),
  ('/inkobject'),
  ('/expressionistportrait'),
  ('/gouacheobject'),
  ('/doodleavatar'),
  ('/storybookobject'),
  ('/lowpolyobject'),
  ('/stickerme'),
  ('/africanmodernism'),
  ('/dutchstilllife'),
  ('/impressionistobject'),
  ('/ukiyoeobject'),
  ('/oilpaintobject'),
  ('/botanicalplate'),
  ('/pophalftone'),
  ('/artnouveauportrait'),
  ('/bauhausportrait'),
  ('/cubistportrait'),
  ('/fauvistportrait'),
  ('/pointillistportrait'),
  ('/renaissancepanel'),
  ('/tingatingaportrait'),
  ('/ukiyoeprofile'),
  ('/rococopastel'),
  ('/actionfigure'),
  ('/brickfigure'),
  ('/papercutportrait'),
  ('/toybox'),
  ('/tinypersonworld'),
  ('/balloonart'),
  ('/plushie'),
  ('/giantcity'),
  ('/hologramportrait'),
  ('/liquidmetal'),
  ('/levitationorbit'),
  ('/fireportrait'),
  ('/watersplashportrait'),
  ('/screenescape'),
  ('/portalstep'),
  ('/aurore'),
  ('/collage-xerox'),
  ('/collage-riso'),
  ('/double-exposition-foret'),
  ('/double-exposition-ville'),
  ('/photo-brodee'),
  ('/planche-contact'),
  ('/collage-carte'),
  ('/polaroids'),
  ('/triptyque-dechire'),
  ('/miroirs-triptyque'),
  ('/marque-page'),
  ('/annotation-rouge'),
  ('/recette-illustree'),
  ('/carnet-voyage'),
  ('/carte-manuscrite'),
  ('/croquis-mode'),
  ('/croquis-produit'),
  ('/aquarelle-portrait'),
  ('/fusain'),
  ('/stylo-bleu'),
  ('/ligne-continue'),
  ('/gouache-portrait'),
  ('/graphite'),
  ('/pastel-portrait'),
  ('/plume'),
  ('/clayrender'),
  ('/poster-music-tv'),
  ('/cover-musique'),
  ('/dutchproduct'),
  ('/heroangle'),
  ('/reflectionangle'),
  ('/jewelrydetail'),
  ('/shoeshape'),
  ('/lowangleproduct'),
  ('/luxmockup'),
  ('/extremecloseup'),
  ('/fisheyeproduct'),
  ('/flatlay'),
  ('/gradientbackdrop'),
  ('/widecontext'),
  ('/sizeguidevisual'),
  ('/marketplacehero'),
  ('/shadowplay'),
  ('/rimlightproduct'),
  ('/softboxproduct'),
  ('/macrodetail'),
  ('/packshot'),
  ('/acrylicpedestal'),
  ('/floatingproduct'),
  ('/spotlightproduct'),
  ('/orthographicview'),
  ('/sunbeamproduct'),
  ('/mirrorbase'),
  ('/highkeyproduct'),
  ('/lowkeyproduct'),
  ('/monochromestudio'),
  ('/metallicstudio'),
  ('/pastelstudio'),
  ('/catalogconsistency'),
  ('/catalogset'),
  ('/telecompression'),
  ('/blackvelvet'),
  ('/rearview'),
  ('/wormeyeproduct'),
  ('/frontview'),
  ('/highangleproduct'),
  ('/isometric'),
  ('/sideview'),
  ('/threequarterview'),
  ('/topdown'),
  ('/throughglass'),
  ('/splashfreeze'),
  ('/workshopscene'),
  ('/desklifestyle'),
  ('/giftscene'),
  ('/unboxingmoment'),
  ('/naturescene'),
  ('/tropicalscene'),
  ('/ingredienthero'),
  ('/luxuryliving'),
  ('/picnicscene'),
  ('/handheldproduct'),
  ('/artisanproductstory'),
  ('/localproducthero'),
  ('/seasonallifestyle'),
  ('/kitchenlifestyle'),
  ('/bathroomlifestyle'),
  ('/travellifestyle'),
  ('/urbanstreetproduct'),
  ('/restauranttable'),
  ('/gymlifestyle'),
  ('/outdoorlifestyle'),
  ('/familyuse'),
  ('/nightlifestyle'),
  ('/pocketscale'),
  ('/scalecomparison'),
  ('/resalehonest'),
  ('/productcolormatch'),
  ('/productupscale'),
  ('/cleancutout'),
  ('/productcleanup'),
  ('/ecomcrop'),
  ('/glarecontrol'),
  ('/labelstraighten'),
  ('/foodhero'),
  ('/menucard'),
  ('/vendingmockup'),
  ('/storefrontmockup'),
  ('/vehiclewrap'),
  ('/shelfmockup'),
  ('/servicevisual'),
  ('/whatsappoffer'),
  ('/billboard'),
  ('/campaignbillboard'),
  ('/counterdisplay'),
  ('/displaystand'),
  ('/boothdesign'),
  ('/concertposter'),
  ('/creatorcover'),
  ('/brandmascotobject'),
  ('/albumcover'),
  ('/visualhook'),
  ('/launchposter'),
  ('/retailposter'),
  ('/benefitvisual'),
  ('/seasonalcampaign'),
  ('/productcarousel'),
  ('/adcreative'),
  ('/featurecallout'),
  ('/featurefocus'),
  ('/productgrid'),
  ('/landinghero'),
  ('/usecasepanel'),
  ('/problemsolution'),
  ('/localbusinessad'),
  ('/investorreveal'),
  ('/brandworld'),
  ('/pitchdeckhero'),
  ('/salesproposalvisual'),
  ('/tradefairhero'),
  ('/limiteddrop'),
  ('/loyaltyvisual'),
  ('/salesbattlecard'),
  ('/promocoupon'),
  ('/bundleoffer'),
  ('/socialproofscene'),
  ('/beforeafterad'),
  ('/comparisonad'),
  ('/testimonialvisual'),
  ('/pricingvisual'),
  ('/boxmockup'),
  ('/canmockup'),
  ('/giftboxmockup'),
  ('/calabashpack'),
  ('/cocoaheritagepack'),
  ('/shippingbox'),
  ('/packagingmockup'),
  ('/labelmockup'),
  ('/adinkrapack'),
  ('/bogolanpack'),
  ('/sheaoriginpack'),
  ('/spiceoriginpack'),
  ('/sahelianpack'),
  ('/basketrypack'),
  ('/jarlabel'),
  ('/shoppingbag'),
  ('/deliverybag'),
  ('/sachetpack'),
  ('/pouchmockup'),
  ('/kenteedition'),
  ('/waxlimitedpack'),
  ('/bottlelabel'),
  ('/medicalanatomy'),
  ('/posturemap'),
  ('/musclemap'),
  ('/howitworks'),
  ('/rehabmovement'),
  ('/organposition'),
  ('/skeletonview'),
  ('/futurearchaeology'),
  ('/afrofuturistobject'),
  ('/museumartifact'),
  ('/objectrestore'),
  ('/anatomyview'),
  ('/stressmap'),
  ('/thermalmap'),
  ('/fluidpath'),
  ('/airflowvisual'),
  ('/comparisonvisual'),
  ('/compatibilityvisual'),
  ('/safetyvisual'),
  ('/schematiccutaway'),
  ('/crosssection'),
  ('/patentdrawing'),
  ('/layerstack'),
  ('/maintenanceguide'),
  ('/energyflow'),
  ('/assembly'),
  ('/installationguide'),
  ('/failuremode'),
  ('/partslegend'),
  ('/blueprint'),
  ('/turntableboard'),
  ('/orthographicboard'),
  ('/wearpoints'),
  ('/processvisual'),
  ('/repairsequence'),
  ('/circuittrace'),
  ('/dimensionview'),
  ('/wireframe'),
  ('/xray'),
  ('/explodeview'),
  ('/biomaterialfinish'),
  ('/materialswap'),
  ('/chromefinish'),
  ('/gradientfinish'),
  ('/woodfinish'),
  ('/glossfinish'),
  ('/leatherfinish'),
  ('/ceramicfinish'),
  ('/mattefinish'),
  ('/metalfinish'),
  ('/stonefinish'),
  ('/fabricfinish'),
  ('/glassfinish'),
  ('/colorways'),
  ('/iridescentfinish'),
  ('/recycledfinish'),
  ('/translucentfinish'),
  ('/patinafinish'),
  ('/recolor'),
  ('/weatheredfinish'),
  ('/roomstage'),
  ('/roomrefresh'),
  ('/renovationconcept'),
  ('/pressrelease'),
  ('/copywriter'),
  ('/landingpage'),
  ('/cialdini'),
  ('/coldemail'),
  ('/ugcscript'),
  ('/chef-projet'),
  ('/redacteur-en-chef'),
  ('/directeur-artistique'),
  ('/recruteur'),
  ('/investisseur'),
  ('/adcopy'),
  ('/client-difficile'),
  ('/chrissvoss'),
  ('/salespitch'),
  ('/product-manager'),
  ('/facilitateur'),
  ('/negociateur'),
  ('/avocat-du-diable'),
  ('/critique-design'),
  ('/anti-jargon'),
  ('/fact-or-fluff'),
  ('/jury-sans-pitie'),
  ('/client-perdu'),
  ('/roast-mon-offre'),
  ('/roast-mon-pitch'),
  ('/roast-mon-site'),
  ('/red-team'),
  ('/tradeoffs'),
  ('/decision-tree'),
  ('/cognitivebias'),
  ('/systems-map'),
  ('/feynman'),
  ('/second-order'),
  ('/causes-cachees'),
  ('/cheatsheet'),
  ('/shadowwork'),
  ('/premortem'),
  ('/fivewhys'),
  ('/analogy'),
  ('/riskmitigation'),
  ('/entonnoir'),
  ('/dashboard'),
  ('/checklist'),
  ('/timeline'),
  ('/first-principles'),
  ('/gdprcheck'),
  ('/pirate'),
  ('/detective-noir'),
  ('/prof-excentrique'),
  ('/robot-litteral'),
  ('/archiviste-futur'),
  ('/aubergiste'),
  ('/oracle-pragmatique'),
  ('/debate-arena'),
  ('/boardgame-lab'),
  ('/conseil-de-crise'),
  ('/story-dice'),
  ('/enquete'),
  ('/escape-room'),
  ('/pitch-battle'),
  ('/code-secret'),
  ('/conseil-royaume'),
  ('/jeu-negociation'),
  ('/alibi'),
  ('/detective-objet'),
  ('/ile-survie'),
  ('/roleplay'),
  ('/scamper'),
  ('/storyboard'),
  ('/collision-idees'),
  ('/objet-impossible'),
  ('/contrainte-folle'),
  ('/twist'),
  ('/anti-brief'),
  ('/metaphore-marque'),
  ('/unboxing'),
  ('/morphostyle'),
  ('/capsulewardrobe'),
  ('/dresscode'),
  ('/outfitmatrix'),
  ('/colorpalette'),
  ('/packresale'),
  ('/packcampaign'),
  ('/packheritage'),
  ('/packstickers'),
  ('/packlocalshop'),
  ('/packcelebration'),
  ('/packtechnical'),
  ('/packexplainer'),
  ('/packecommerce'),
  ('/packbrandlaunch'),
  ('/packvfx'),
  ('/packlooks'),
  ('/packartisan'),
  ('/packproperty'),
  ('/packpro'),
  ('/packpackaging'),
  ('/packrestaurant'),
  ('/packmusic'),
  ('/packfamily'),
  ('/packbeauty'),
  ('/parcours-offre'),
  ('/parcours-clarte'),
  ('/parcours-affiche'),
  ('/parcours-tribunal'),
  ('/parcours-produit'),
  ('/parcours-identite'),
  ('/parcours-negociation'),
  ('/parcours-enquete');

update public.prompts p
set status = 'published'::public.content_status,
    published_at = coalesce(p.published_at, now())
where p.catalog_v2
  and exists (select 1 from cartes_visibles v where v.command = p.command::text)
  and p.status <> 'published';

update public.prompts p
set status = 'draft'::public.content_status
where p.catalog_v2
  and not exists (select 1 from cartes_visibles v where v.command = p.command::text)
  and p.status = 'published';

-- --- Ouverture des rayons -------------------------------------------------
--
-- Une collection ne s'ouvre que si elle a une carte publiee, une categorie
-- que si une de ses collections s'ouvre. Un rayon vide est un cul-de-sac :
-- cinq collections du classeur n'ont aucune carte visible et restent donc
-- fermees, sans qu'il faille les nommer ici.

update public.categories c
set status = 'published'::public.content_status
where c.external_ref like 'V2-COL-%'
  and exists (
    select 1 from public.prompts p
    where p.category_id = c.id and p.status = 'published'
  );

-- Et se referme si elle s'est videe. Un regroupement deplace des cartes
-- d'une collection vers une autre : celle qui se vide restait ouverte sur
-- un rayon sans rien dedans, parce que l'ouverture ne savait que publier.
-- Fermee, pas supprimee — sa ligne demeure, et lui rendre une carte la
-- rouvre.
update public.categories c
set status = 'draft'::public.content_status
where c.external_ref like 'V2-COL-%'
  and c.status = 'published'
  and not exists (
    select 1 from public.prompts p
    where p.category_id = c.id and p.status = 'published'
  );

update public.categories c
set status = 'published'::public.content_status
where c.external_ref like 'V2-CAT-%'
  and exists (
    select 1 from public.categories f
    where f.parent_id = c.id and f.status = 'published'
  );

-- --- Archivage de l'ancien catalogue --------------------------------------

-- Borne au catalogue : une commande posee a la main — un jeu de recette,
-- un essai en administration — n'a ete rangee par aucun import et n'a pas a
-- etre emportee par celui-ci. La colonne catalog_version marque un import.
update public.prompts p
set status = 'archived'::public.content_status
where not p.catalog_v2
  and p.catalog_version is not null
  and p.status <> 'archived';

update public.categories c
set status = 'archived'::public.content_status
where c.external_ref is distinct from null
  and c.external_ref not like 'V2-%'
  and c.status <> 'archived';

-- Les categories heritees des taxonomies precedentes portent toutes une
-- reference externe ou plus rien du tout. Celles qui n'en portent pas et qui
-- gardent une commande active ont ete posees a la main : on les laisse.
update public.categories c
set status = 'archived'::public.content_status
where c.external_ref is null
  and c.status <> 'archived'
  and not exists (
    select 1 from public.prompts p
    where p.category_id = c.id and p.status <> 'archived'
  );

-- --- Controles de sortie ---------------------------------------------------

do $ctrl$
declare
  v_publiees integer;
  v_hors integer;
  v_desertes integer;
  v_perdues integer;
  v_cat integer;
begin
  select count(*) into v_publiees
  from public.prompts where catalog_v2 and status = 'published';
  if v_publiees <> 594 then
    raise exception 'Catalogue V2 : % cartes publiees au lieu de 594.', v_publiees;
  end if;

  -- Plus rien du catalogue precedent ne doit rester actif.
  select count(*) into v_hors
  from public.prompts
  where not catalog_v2 and catalog_version is not null and status <> 'archived';
  if v_hors > 0 then
    raise exception 'Catalogue V2 : % commandes de l ancien catalogue encore actives.', v_hors;
  end if;

  -- Aucun rayon ouvert et vide.
  select count(*) into v_desertes
  from public.categories c
  where c.is_visible
    and not exists (select 1 from public.categories f where f.parent_id = c.id and f.is_visible)
    and not exists (select 1 from public.prompts p where p.category_id = c.id and p.status = 'published');
  if v_desertes > 0 then
    raise exception 'Catalogue V2 : % rayons ouverts sans aucune carte.', v_desertes;
  end if;

  -- Aucune carte publiee hors d'un rayon visible : elle existerait sans exister.
  select count(*) into v_perdues
  from public.prompts p
  where p.status = 'published'
    and (p.category_id is null
         or not exists (select 1 from public.categories c where c.id = p.category_id and c.is_visible));
  if v_perdues > 0 then
    raise exception 'Catalogue V2 : % cartes publiees hors d un rayon visible.', v_perdues;
  end if;

  -- Rien n'a disparu : ce qui n'est plus actif est archive.
  if (select count(*) from public.prompts) < (select count(*) from public.prompts_avant_v2) then
    raise exception 'Catalogue V2 : des commandes ont disparu de la base.';
  end if;

  select count(*) into v_cat from public.categories where external_ref like 'V2-CAT-%' and is_visible;
  raise notice 'Catalogue V2 : % cartes publiees, % categories ouvertes.', v_publiees, v_cat;
end $ctrl$;

commit;
