-- Entrega 05 CookLily: catálogo, LilyMix, adicionais, mídia, ofertas e combos.

PRAGMA foreign_keys=ON;

CREATE TABLE "LilyCategory" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "parentId" TEXT,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isComingSoon" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "LilyCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "LilyCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LilyCategory_slug_key" ON "LilyCategory"("slug");
CREATE INDEX "LilyCategory_parentId_idx" ON "LilyCategory"("parentId");
CREATE INDEX "LilyCategory_status_sortOrder_idx" ON "LilyCategory"("status","sortOrder");

CREATE TABLE "LilyMediaAsset" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "storageName" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mime" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "altText" TEXT NOT NULL,
  "placeholder" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "LilyMediaAsset_storageName_key" ON "LilyMediaAsset"("storageName");
CREATE INDEX "LilyMediaAsset_status_createdAt_idx" ON "LilyMediaAsset"("status","createdAt");

CREATE TABLE "LilyProduct" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "categoryId" TEXT NOT NULL,
  "coverMediaId" TEXT,
  "slug" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "descriptiveName" TEXT,
  "description" TEXT,
  "tagsJson" TEXT NOT NULL DEFAULT '[]',
  "configurationType" TEXT NOT NULL DEFAULT 'fixed',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "isAvailable" BOOLEAN NOT NULL DEFAULT false,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "weeklyHighlight" BOOLEAN NOT NULL DEFAULT false,
  "allowPlaceholder" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "preparationLeadMinutes" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "LilyProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "LilyCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LilyProduct_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "LilyMediaAsset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LilyProduct_slug_key" ON "LilyProduct"("slug");
CREATE INDEX "LilyProduct_categoryId_status_sortOrder_idx" ON "LilyProduct"("categoryId","status","sortOrder");
CREATE INDEX "LilyProduct_status_isAvailable_featured_idx" ON "LilyProduct"("status","isAvailable","featured");

CREATE TABLE "LilyProductVariant" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "productId" TEXT NOT NULL,
  "sizeMl" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "priceCents" INTEGER NOT NULL,
  "compareAtPriceCents" INTEGER,
  "costCents" INTEGER,
  "projectedMarginBps" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "isAvailable" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "LilyProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "LilyProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LilyProductVariant_productId_sizeMl_key" ON "LilyProductVariant"("productId","sizeMl");
CREATE INDEX "LilyProductVariant_productId_status_sortOrder_idx" ON "LilyProductVariant"("productId","status","sortOrder");

CREATE TABLE "LilyFlavorComponent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'published',
  "premium" BOOLEAN NOT NULL DEFAULT false,
  "tagsJson" TEXT NOT NULL DEFAULT '[]',
  "portion300" INTEGER NOT NULL,
  "portion500" INTEGER NOT NULL,
  "priceModifier300" INTEGER NOT NULL DEFAULT 0,
  "priceModifier500" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "LilyFlavorComponent_slug_key" ON "LilyFlavorComponent"("slug");
CREATE INDEX "LilyFlavorComponent_status_name_idx" ON "LilyFlavorComponent"("status","name");

CREATE TABLE "LilyFlavorCompatibility" (
  "flavorAId" TEXT NOT NULL,
  "flavorBId" TEXT NOT NULL,
  "isCompatible" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" DATETIME NOT NULL,
  PRIMARY KEY ("flavorAId","flavorBId"),
  CONSTRAINT "LilyFlavorCompatibility_flavorAId_fkey" FOREIGN KEY ("flavorAId") REFERENCES "LilyFlavorComponent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LilyFlavorCompatibility_flavorBId_fkey" FOREIGN KEY ("flavorBId") REFERENCES "LilyFlavorComponent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LilyFlavorCompatibility_flavorBId_idx" ON "LilyFlavorCompatibility"("flavorBId");

CREATE TABLE "LilyProductFlavor" (
  "productId" TEXT NOT NULL,
  "flavorId" TEXT NOT NULL,
  PRIMARY KEY ("productId","flavorId"),
  CONSTRAINT "LilyProductFlavor_productId_fkey" FOREIGN KEY ("productId") REFERENCES "LilyProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LilyProductFlavor_flavorId_fkey" FOREIGN KEY ("flavorId") REFERENCES "LilyFlavorComponent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LilyProductFlavor_flavorId_idx" ON "LilyProductFlavor"("flavorId");

CREATE TABLE "LilyAddon" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "flavorId" TEXT,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "priceCents" INTEGER NOT NULL,
  "portion300" INTEGER NOT NULL,
  "portion500" INTEGER NOT NULL,
  "individualLimit" INTEGER NOT NULL DEFAULT 2,
  "status" TEXT NOT NULL DEFAULT 'published',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "LilyAddon_flavorId_fkey" FOREIGN KEY ("flavorId") REFERENCES "LilyFlavorComponent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LilyAddon_slug_key" ON "LilyAddon"("slug");
CREATE INDEX "LilyAddon_status_name_idx" ON "LilyAddon"("status","name");

CREATE TABLE "LilyProductAddon" (
  "productId" TEXT NOT NULL,
  "addonId" TEXT NOT NULL,
  "allowed" BOOLEAN NOT NULL DEFAULT true,
  "individualLimit" INTEGER,
  "priceOverride" INTEGER,
  "portion300" INTEGER,
  "portion500" INTEGER,
  PRIMARY KEY ("productId","addonId"),
  CONSTRAINT "LilyProductAddon_productId_fkey" FOREIGN KEY ("productId") REFERENCES "LilyProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LilyProductAddon_addonId_fkey" FOREIGN KEY ("addonId") REFERENCES "LilyAddon" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LilyProductAddon_addonId_idx" ON "LilyProductAddon"("addonId");

CREATE TABLE "LilyProductMedia" (
  "productId" TEXT NOT NULL,
  "mediaId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("productId","mediaId"),
  CONSTRAINT "LilyProductMedia_productId_fkey" FOREIGN KEY ("productId") REFERENCES "LilyProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LilyProductMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "LilyMediaAsset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LilyProductMedia_mediaId_sortOrder_idx" ON "LilyProductMedia"("mediaId","sortOrder");

CREATE TABLE "LilyMixPriceTier" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "productId" TEXT NOT NULL,
  "flavorCount" INTEGER NOT NULL,
  "sizeMl" INTEGER NOT NULL,
  "priceCents" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'published',
  CONSTRAINT "LilyMixPriceTier_productId_fkey" FOREIGN KEY ("productId") REFERENCES "LilyProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LilyMixPriceTier_productId_flavorCount_sizeMl_key" ON "LilyMixPriceTier"("productId","flavorCount","sizeMl");
CREATE INDEX "LilyMixPriceTier_productId_status_idx" ON "LilyMixPriceTier"("productId","status");

CREATE TABLE "LilyCombo" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "rulesJson" TEXT NOT NULL DEFAULT '{}',
  "regularPriceCents" INTEGER NOT NULL,
  "offerPriceCents" INTEGER NOT NULL,
  "savingsCents" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "startsAt" DATETIME,
  "endsAt" DATETIME,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "LilyCombo_slug_key" ON "LilyCombo"("slug");
CREATE INDEX "LilyCombo_status_featured_sortOrder_idx" ON "LilyCombo"("status","featured","sortOrder");

CREATE TABLE "LilyComboItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "comboId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "sizeMl" INTEGER,
  "flavorCount" INTEGER,
  CONSTRAINT "LilyComboItem_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "LilyCombo" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LilyComboItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "LilyProduct" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "LilyComboItem_comboId_idx" ON "LilyComboItem"("comboId");
CREATE INDEX "LilyComboItem_productId_idx" ON "LilyComboItem"("productId");

CREATE TABLE "LilyOffer" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "productId" TEXT,
  "variantId" TEXT,
  "name" TEXT NOT NULL,
  "regularPriceCents" INTEGER NOT NULL,
  "offerPriceCents" INTEGER NOT NULL,
  "savingsCents" INTEGER NOT NULL,
  "startsAt" DATETIME,
  "endsAt" DATETIME,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "campaignId" TEXT,
  "minProjectedMarginBps" INTEGER NOT NULL DEFAULT 1000,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "LilyOffer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "LilyProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LilyOffer_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "LilyProductVariant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LilyOffer_status_startsAt_endsAt_idx" ON "LilyOffer"("status","startsAt","endsAt");
CREATE INDEX "LilyOffer_productId_idx" ON "LilyOffer"("productId");
CREATE INDEX "LilyOffer_variantId_idx" ON "LilyOffer"("variantId");

-- Categorias.
INSERT INTO "LilyCategory" ("id","parentId","slug","name","description","status","sortOrder","isComingSoon","updatedAt") VALUES
('cat-acai',NULL,'batidas-de-acai','Batidas de Açaí','Batidas cremosas CookLily preparadas em lote.','published',10,false,CURRENT_TIMESTAMP),
('sub-acai-simple','cat-acai','batidas-simples','Simples',NULL,'published',11,false,CURRENT_TIMESTAMP),
('sub-acai-nutella','cat-acai','batidas-com-nutella','Com Nutella',NULL,'published',12,false,CURRENT_TIMESTAMP),
('cat-lilyshakes',NULL,'lilyshakes','LilyShakes','Milk-shake de gelato caseiro com base exclusiva CookLily.','published',20,false,CURRENT_TIMESTAMP),
('sub-ls-simple','cat-lilyshakes','lilyshakes-simples','Simples',NULL,'published',21,false,CURRENT_TIMESTAMP),
('sub-ls-nutella','cat-lilyshakes','lilyshakes-com-nutella','Com Nutella',NULL,'published',22,false,CURRENT_TIMESTAMP),
('sub-ls-duo','cat-lilyshakes','lilyshakes-duo','Duo',NULL,'published',23,false,CURRENT_TIMESTAMP),
('sub-ls-trio','cat-lilyshakes','lilyshakes-trio','Trio',NULL,'published',24,false,CURRENT_TIMESTAMP),
('sub-ls-fitness','cat-lilyshakes','lilyshakes-fitness','Fitness','Linha futura.','published',25,true,CURRENT_TIMESTAMP),
('cat-doces',NULL,'doces','Doces','Novidades CookLily em desenvolvimento.','published',30,true,CURRENT_TIMESTAMP);

-- Sabores.
INSERT INTO "LilyFlavorComponent" ("id","slug","name","status","premium","tagsJson","portion300","portion500","priceModifier300","priceModifier500","updatedAt") VALUES
('flv-cafe','cafe','Café 3 Corações','published',false,'["cafe","3 coracoes"]',6,10,0,0,CURRENT_TIMESTAMP),
('flv-morango','morango','Morango','published',false,'["fruta","fresco"]',36,60,0,0,CURRENT_TIMESTAMP),
('flv-maracuja','maracuja','Maracujá','published',false,'["fruta","fresco","sementes"]',36,60,0,0,CURRENT_TIMESTAMP),
('flv-doce-leite','doce-de-leite','Doce de leite','published',false,'["doce"]',30,50,0,0,CURRENT_TIMESTAMP),
('flv-frutas-vermelhas','frutas-vermelhas','Frutas vermelhas','published',false,'["fruta"]',36,60,0,0,CURRENT_TIMESTAMP),
('flv-oreo','oreo','Oreo','published',false,'["biscoito"]',20,30,0,0,CURRENT_TIMESTAMP),
('flv-banana','banana','Banana','published',false,'["fruta","fresco"]',36,60,0,0,CURRENT_TIMESTAMP),
('flv-leite-condensado','leite-condensado','Leite condensado','published',false,'["cremoso"]',30,50,0,0,CURRENT_TIMESTAMP),
('flv-pacoca','pacoca','Paçoca','published',false,'["amendoim"]',20,30,0,0,CURRENT_TIMESTAMP),
('flv-ovomaltine','ovomaltine','Ovomaltine','published',false,'["crocante"]',20,30,0,0,CURRENT_TIMESTAMP),
('flv-ninho','ninho','Leite Ninho','published',false,'["leite","ninho"]',20,30,0,0,CURRENT_TIMESTAMP),
('flv-creme-ninho','creme-de-ninho','Creme de Ninho','published',false,'["creme","ninho"]',30,50,0,0,CURRENT_TIMESTAMP),
('flv-nutella','nutella','Nutella','published',true,'["nutella","avela","premium"]',30,50,500,500,CURRENT_TIMESTAMP);

-- Compatibilidade: auto, alta compatibilidade e pares aprovados.
INSERT INTO "LilyFlavorCompatibility" ("flavorAId","flavorBId","isCompatible","updatedAt")
SELECT a.id,b.id,true,CURRENT_TIMESTAMP
FROM "LilyFlavorComponent" a CROSS JOIN "LilyFlavorComponent" b
WHERE a.id=b.id
   OR a.slug IN ('ninho','creme-de-ninho','nutella')
   OR b.slug IN ('ninho','creme-de-ninho','nutella')
   OR (a.slug='cafe' AND b.slug IN ('doce-de-leite','oreo','banana','pacoca','ovomaltine','leite-condensado'))
   OR (b.slug='cafe' AND a.slug IN ('doce-de-leite','oreo','banana','pacoca','ovomaltine','leite-condensado'))
   OR (a.slug='morango' AND b.slug IN ('maracuja','frutas-vermelhas','banana','doce-de-leite','oreo','ovomaltine','leite-condensado'))
   OR (b.slug='morango' AND a.slug IN ('maracuja','frutas-vermelhas','banana','doce-de-leite','oreo','ovomaltine','leite-condensado'))
   OR (a.slug='maracuja' AND b.slug IN ('morango','frutas-vermelhas','leite-condensado'))
   OR (b.slug='maracuja' AND a.slug IN ('morango','frutas-vermelhas','leite-condensado'))
   OR (a.slug='doce-de-leite' AND b.slug IN ('cafe','morango','banana','oreo','pacoca','ovomaltine','leite-condensado'))
   OR (b.slug='doce-de-leite' AND a.slug IN ('cafe','morango','banana','oreo','pacoca','ovomaltine','leite-condensado'))
   OR (a.slug='frutas-vermelhas' AND b.slug IN ('morango','maracuja','banana','leite-condensado'))
   OR (b.slug='frutas-vermelhas' AND a.slug IN ('morango','maracuja','banana','leite-condensado'))
   OR (a.slug='oreo' AND b.slug IN ('cafe','morango','banana','doce-de-leite','pacoca','ovomaltine','leite-condensado'))
   OR (b.slug='oreo' AND a.slug IN ('cafe','morango','banana','doce-de-leite','pacoca','ovomaltine','leite-condensado'))
   OR (a.slug='banana' AND b.slug IN ('cafe','morango','frutas-vermelhas','doce-de-leite','oreo','pacoca','ovomaltine','leite-condensado'))
   OR (b.slug='banana' AND a.slug IN ('cafe','morango','frutas-vermelhas','doce-de-leite','oreo','pacoca','ovomaltine','leite-condensado'))
   OR (a.slug='pacoca' AND b.slug IN ('cafe','banana','doce-de-leite','oreo','ovomaltine','leite-condensado'))
   OR (b.slug='pacoca' AND a.slug IN ('cafe','banana','doce-de-leite','oreo','ovomaltine','leite-condensado'))
   OR (a.slug='ovomaltine' AND b.slug IN ('cafe','morango','banana','doce-de-leite','oreo','pacoca','leite-condensado'))
   OR (b.slug='ovomaltine' AND a.slug IN ('cafe','morango','banana','doce-de-leite','oreo','pacoca','leite-condensado'));

-- Adicionais.
INSERT INTO "LilyAddon" ("id","flavorId","slug","name","priceCents","portion300","portion500","individualLimit","status","updatedAt") VALUES
('add-nutella','flv-nutella','nutella','Nutella',500,30,50,2,'published',CURRENT_TIMESTAMP),
('add-creme-ninho','flv-creme-ninho','creme-de-ninho','Creme de Ninho',400,30,50,2,'published',CURRENT_TIMESTAMP),
('add-ninho','flv-ninho','ninho','Leite Ninho',300,15,25,2,'published',CURRENT_TIMESTAMP),
('add-doce-leite','flv-doce-leite','doce-de-leite','Doce de leite',400,30,50,2,'published',CURRENT_TIMESTAMP),
('add-oreo','flv-oreo','oreo','Oreo',300,15,25,2,'published',CURRENT_TIMESTAMP),
('add-ovomaltine','flv-ovomaltine','ovomaltine','Ovomaltine',300,15,25,2,'published',CURRENT_TIMESTAMP),
('add-pacoca','flv-pacoca','pacoca','Paçoca',200,15,25,2,'published',CURRENT_TIMESTAMP),
('add-leite-condensado','flv-leite-condensado','leite-condensado','Leite condensado',200,20,35,2,'published',CURRENT_TIMESTAMP),
('add-morango','flv-morango','morango','Morango fresco',400,30,50,2,'published',CURRENT_TIMESTAMP),
('add-maracuja','flv-maracuja','maracuja','Maracujá',300,30,50,2,'published',CURRENT_TIMESTAMP),
('add-frutas-vermelhas','flv-frutas-vermelhas','frutas-vermelhas','Frutas vermelhas',400,30,50,2,'published',CURRENT_TIMESTAMP),
('add-banana','flv-banana','banana','Banana',200,40,70,2,'published',CURRENT_TIMESTAMP),
('add-cafe','flv-cafe','cafe-extra','Café extra',200,3,5,2,'published',CURRENT_TIMESTAMP);

-- Batidas.
INSERT INTO "LilyProduct" ("id","categoryId","slug","displayName","descriptiveName","description","tagsJson","configurationType","status","isAvailable","featured","weeklyHighlight","allowPlaceholder","sortOrder","updatedAt") VALUES
('prod-acai-rosa-lily','sub-acai-simple','rosa-da-lily','Rosa da Lily','Batida de açaí com mousse de morango','Açaí cremoso com mousse de morango, doce, frutado e macio.','["acai","morango","simples"]','fixed','published',true,true,false,true,10,CURRENT_TIMESTAMP),
('prod-acai-rosa-nutt','sub-acai-nutella','rosa-nutt','Rosa Nutt','Batida de açaí com mousse de morango e Nutella','A cremosidade da batida de morango encontra a Nutella para um perfil de sobremesa.','["acai","morango","nutella"]','fixed','published',true,false,false,true,20,CURRENT_TIMESTAMP),
('prod-acai-sol-lily','sub-acai-simple','sol-da-lily','Sol da Lily','Batida de açaí com mousse de maracujá','Açaí cremoso com mousse de maracujá e aquele toque azedinho especial da fruta.','["acai","maracuja","simples"]','fixed','published',true,true,false,true,30,CURRENT_TIMESTAMP),
('prod-acai-sol-nutt','sub-acai-nutella','sol-nutt','Sol Nutt','Batida de açaí com mousse de maracujá e Nutella','Maracujá e Nutella equilibrando o frutado, o azedinho e a cremosidade.','["acai","maracuja","nutella"]','fixed','published',true,false,false,true,40,CURRENT_TIMESTAMP),
('prod-acai-ninho-nutt','sub-acai-nutella','ninho-nutt','Ninho Nutt','Batida de açaí com Leite Ninho e Nutella','Açaí cremoso, Leite Ninho e Nutella em uma combinação de sobremesa.','["acai","ninho","nutella","premium"]','fixed','published',true,true,false,true,50,CURRENT_TIMESTAMP);

INSERT INTO "LilyProductVariant" ("id","productId","sizeMl","name","priceCents","status","isAvailable","sortOrder","updatedAt") VALUES
('var-rosa-300','prod-acai-rosa-lily',300,'300 ml',1500,'published',true,10,CURRENT_TIMESTAMP),
('var-rosa-500','prod-acai-rosa-lily',500,'500 ml',2500,'published',true,20,CURRENT_TIMESTAMP),
('var-rosa-nutt-300','prod-acai-rosa-nutt',300,'300 ml',2200,'published',true,10,CURRENT_TIMESTAMP),
('var-rosa-nutt-500','prod-acai-rosa-nutt',500,'500 ml',3000,'published',true,20,CURRENT_TIMESTAMP),
('var-sol-300','prod-acai-sol-lily',300,'300 ml',1500,'published',true,10,CURRENT_TIMESTAMP),
('var-sol-500','prod-acai-sol-lily',500,'500 ml',2500,'published',true,20,CURRENT_TIMESTAMP),
('var-sol-nutt-300','prod-acai-sol-nutt',300,'300 ml',2200,'published',true,10,CURRENT_TIMESTAMP),
('var-sol-nutt-500','prod-acai-sol-nutt',500,'500 ml',3000,'published',true,20,CURRENT_TIMESTAMP),
('var-ninho-nutt-300','prod-acai-ninho-nutt',300,'300 ml',2500,'published',true,10,CURRENT_TIMESTAMP),
('var-ninho-nutt-500','prod-acai-ninho-nutt',500,'500 ml',3500,'published',true,20,CURRENT_TIMESTAMP);

INSERT INTO "LilyProductFlavor" ("productId","flavorId") VALUES
('prod-acai-rosa-lily','flv-morango'),
('prod-acai-rosa-nutt','flv-morango'),('prod-acai-rosa-nutt','flv-nutella'),
('prod-acai-sol-lily','flv-maracuja'),
('prod-acai-sol-nutt','flv-maracuja'),('prod-acai-sol-nutt','flv-nutella'),
('prod-acai-ninho-nutt','flv-ninho'),('prod-acai-ninho-nutt','flv-nutella');

-- LilyShakes simples.
INSERT INTO "LilyProduct" ("id","categoryId","slug","displayName","descriptiveName","description","tagsJson","configurationType","status","isAvailable","featured","weeklyHighlight","allowPlaceholder","sortOrder","updatedAt")
SELECT 'prod-ls-'||slug,'sub-ls-simple','lilyshake-'||slug,'LilyShake '||name,'Milk-shake de gelato caseiro · '||name,
       'Base exclusiva CookLily, cremosa e leve, saborizada com '||name||'.',
       '["lilyshake","simples","'||slug||'"]','fixed','published',true,
       CASE WHEN slug IN ('morango','maracuja','cafe') THEN true ELSE false END,false,true,
       100 + ROW_NUMBER() OVER (ORDER BY name),CURRENT_TIMESTAMP
FROM "LilyFlavorComponent"
WHERE slug <> 'nutella';

INSERT INTO "LilyProductVariant" ("id","productId","sizeMl","name","priceCents","status","isAvailable","sortOrder","updatedAt")
SELECT 'var-'||p.slug||'-300',p.id,300,'300 ml',1500,'published',true,10,CURRENT_TIMESTAMP
FROM "LilyProduct" p WHERE p.categoryId='sub-ls-simple';
INSERT INTO "LilyProductVariant" ("id","productId","sizeMl","name","priceCents","status","isAvailable","sortOrder","updatedAt")
SELECT 'var-'||p.slug||'-500',p.id,500,'500 ml',2200,'published',true,20,CURRENT_TIMESTAMP
FROM "LilyProduct" p WHERE p.categoryId='sub-ls-simple';

INSERT INTO "LilyProductFlavor" ("productId","flavorId")
SELECT p.id,f.id FROM "LilyProduct" p JOIN "LilyFlavorComponent" f ON p.slug='lilyshake-'||f.slug
WHERE p.categoryId='sub-ls-simple';

-- Versões especiais Com Nutella, uma por sabor simples.
INSERT INTO "LilyProduct" ("id","categoryId","slug","displayName","descriptiveName","description","tagsJson","configurationType","status","isAvailable","featured","weeklyHighlight","allowPlaceholder","sortOrder","updatedAt")
SELECT 'prod-ls-nutt-'||f.slug,'sub-ls-nutella','lilyshake-'||f.slug||'-com-nutella',
       'LilyShake '||f.name||' Nutt',
       'Milk-shake de gelato caseiro · '||f.name||' + Nutella',
       'Base exclusiva CookLily com '||f.name||' e Nutella.',
       '["lilyshake","nutella","'||f.slug||'"]','fixed','published',true,false,false,true,
       300 + ROW_NUMBER() OVER (ORDER BY f.name),CURRENT_TIMESTAMP
FROM "LilyFlavorComponent" f WHERE f.slug <> 'nutella';

INSERT INTO "LilyProductVariant" ("id","productId","sizeMl","name","priceCents","status","isAvailable","sortOrder","updatedAt")
SELECT 'var-'||p.slug||'-300',p.id,300,'300 ml',2000,'published',true,10,CURRENT_TIMESTAMP
FROM "LilyProduct" p WHERE p.categoryId='sub-ls-nutella';
INSERT INTO "LilyProductVariant" ("id","productId","sizeMl","name","priceCents","status","isAvailable","sortOrder","updatedAt")
SELECT 'var-'||p.slug||'-500',p.id,500,'500 ml',2700,'published',true,20,CURRENT_TIMESTAMP
FROM "LilyProduct" p WHERE p.categoryId='sub-ls-nutella';

INSERT INTO "LilyProductFlavor" ("productId","flavorId")
SELECT p.id,f.id FROM "LilyProduct" p JOIN "LilyFlavorComponent" f ON p.slug='lilyshake-'||f.slug||'-com-nutella'
WHERE p.categoryId='sub-ls-nutella';
INSERT INTO "LilyProductFlavor" ("productId","flavorId")
SELECT p.id,'flv-nutella' FROM "LilyProduct" p WHERE p.categoryId='sub-ls-nutella';

-- LilyMix configurável.
INSERT INTO "LilyProduct" ("id","categoryId","slug","displayName","descriptiveName","description","tagsJson","configurationType","status","isAvailable","featured","weeklyHighlight","allowPlaceholder","sortOrder","updatedAt")
VALUES ('prod-lilymix','cat-lilyshakes','lilymix','LilyMix','Monte seu LilyShake com até 3 sabores','Escolha o tamanho e combine até três sabores compatíveis da CookLily.','["lilyshake","duo","trio","personalizavel"]','lilymix','published',true,true,false,true,1,CURRENT_TIMESTAMP);

INSERT INTO "LilyProductVariant" ("id","productId","sizeMl","name","priceCents","status","isAvailable","sortOrder","updatedAt") VALUES
('var-lilymix-300','prod-lilymix',300,'300 ml',1500,'published',true,10,CURRENT_TIMESTAMP),
('var-lilymix-500','prod-lilymix',500,'500 ml',2200,'published',true,20,CURRENT_TIMESTAMP);

INSERT INTO "LilyProductFlavor" ("productId","flavorId")
SELECT 'prod-lilymix',id FROM "LilyFlavorComponent";

INSERT INTO "LilyMixPriceTier" ("id","productId","flavorCount","sizeMl","priceCents","status") VALUES
('tier-lilymix-1-300','prod-lilymix',1,300,1500,'published'),
('tier-lilymix-1-500','prod-lilymix',1,500,2200,'published'),
('tier-lilymix-2-300','prod-lilymix',2,300,1800,'published'),
('tier-lilymix-2-500','prod-lilymix',2,500,2500,'published'),
('tier-lilymix-3-300','prod-lilymix',3,300,2000,'published'),
('tier-lilymix-3-500','prod-lilymix',3,500,2800,'published');

-- Adicionais por produto: listas reais, derivadas da compatibilidade para LilyShakes.
INSERT INTO "LilyProductAddon" ("productId","addonId","allowed","individualLimit")
SELECT pf.productId,a.id,true,2
FROM "LilyProductFlavor" pf
JOIN "LilyProduct" p ON p.id=pf.productId
JOIN "LilyAddon" a ON a.flavorId IS NOT NULL
WHERE p.categoryId='sub-ls-simple'
  AND (
    a.flavorId=pf.flavorId OR EXISTS (
      SELECT 1 FROM "LilyFlavorCompatibility" c
      WHERE c.flavorAId=pf.flavorId AND c.flavorBId=a.flavorId AND c.isCompatible=true
    )
  );

INSERT OR IGNORE INTO "LilyProductAddon" ("productId","addonId","allowed","individualLimit")
SELECT p.id,a.id,true,
       CASE WHEN a.id='add-nutella' THEN 1 ELSE 2 END
FROM "LilyProduct" p CROSS JOIN "LilyAddon" a
WHERE p.categoryId='sub-ls-nutella'
  AND a.id IN ('add-nutella','add-creme-ninho','add-ninho','add-oreo','add-ovomaltine','add-pacoca','add-leite-condensado');

INSERT INTO "LilyProductAddon" ("productId","addonId","allowed","individualLimit")
SELECT 'prod-lilymix',a.id,true,2 FROM "LilyAddon" a;

INSERT INTO "LilyProductAddon" ("productId","addonId","allowed","individualLimit") VALUES
('prod-acai-rosa-lily','add-nutella',true,2),('prod-acai-rosa-lily','add-ninho',true,2),('prod-acai-rosa-lily','add-creme-ninho',true,2),('prod-acai-rosa-lily','add-leite-condensado',true,2),('prod-acai-rosa-lily','add-oreo',true,2),('prod-acai-rosa-lily','add-ovomaltine',true,2),('prod-acai-rosa-lily','add-morango',true,2),
('prod-acai-rosa-nutt','add-nutella',true,1),('prod-acai-rosa-nutt','add-ninho',true,2),('prod-acai-rosa-nutt','add-creme-ninho',true,2),('prod-acai-rosa-nutt','add-leite-condensado',true,2),('prod-acai-rosa-nutt','add-oreo',true,2),('prod-acai-rosa-nutt','add-ovomaltine',true,2),('prod-acai-rosa-nutt','add-morango',true,2),
('prod-acai-sol-lily','add-nutella',true,2),('prod-acai-sol-lily','add-ninho',true,2),('prod-acai-sol-lily','add-creme-ninho',true,2),('prod-acai-sol-lily','add-leite-condensado',true,2),('prod-acai-sol-lily','add-maracuja',true,2),
('prod-acai-sol-nutt','add-nutella',true,1),('prod-acai-sol-nutt','add-ninho',true,2),('prod-acai-sol-nutt','add-creme-ninho',true,2),('prod-acai-sol-nutt','add-leite-condensado',true,2),('prod-acai-sol-nutt','add-maracuja',true,2),
('prod-acai-ninho-nutt','add-nutella',true,1),('prod-acai-ninho-nutt','add-ninho',true,2),('prod-acai-ninho-nutt','add-creme-ninho',true,2),('prod-acai-ninho-nutt','add-oreo',true,2),('prod-acai-ninho-nutt','add-ovomaltine',true,2),('prod-acai-ninho-nutt','add-pacoca',true,2);

-- Combos permanentes.
INSERT INTO "LilyCombo" ("id","slug","name","description","rulesJson","regularPriceCents","offerPriceCents","savingsCents","status","featured","sortOrder","updatedAt") VALUES
('combo-dupla-lily','dupla-lily','Dupla Lily','2 LilyShakes simples de 500 ml.','{"quantity":2,"category":"lilyshakes","subtype":"simple","sizeMl":500,"flavorCount":1}',4400,4000,400,'published',true,10,CURRENT_TIMESTAMP),
('combo-trio-lily','trio-lily','Trio Lily','3 LilyShakes simples de 300 ml.','{"quantity":3,"category":"lilyshakes","subtype":"simple","sizeMl":300,"flavorCount":1}',4500,4000,500,'published',true,20,CURRENT_TIMESTAMP),
('combo-dupla-acai','dupla-acai','Dupla Açaí','2 Batidas simples de 500 ml.','{"quantity":2,"category":"batidas-de-acai","subtype":"simple","sizeMl":500}',5000,4800,200,'published',true,30,CURRENT_TIMESTAMP);
