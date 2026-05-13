export async function addStyleAssets(map, mapConfig = {}) {
  let appliedGlyphs = null;
  const addedSprites = [];

  if (mapConfig.glyphs) {
    map.setGlyphs(mapConfig.glyphs);
    appliedGlyphs = mapConfig.glyphs;
  }

  if (!mapConfig.sprite) {
    return {
      sprites: addedSprites,
      glyphs: appliedGlyphs,
    };
  }

  const sprites = Array.isArray(mapConfig.sprite)
    ? mapConfig.sprite
    : [{ id: "default", url: mapConfig.sprite }];

  const existingSprites = map.getSprite() ?? [];

  const existingIds = new Set(existingSprites.map((sprite) => sprite.id));

  for (const { id, url } of sprites) {
    if (!id || typeof url !== "string") {
      console.error(`Invalid sprite config:`, { id, url });
      continue;
    }

    if (existingIds.has(id)) {
      continue;
    }

    try {
      map.addSprite(id, url);

      addedSprites.push(id);
      existingIds.add(id);
    } catch (e) {
      console.error(`Failed to add sprite '${id}':`, e);
    }
  }

  return {
    sprites: addedSprites,
    glyphs: appliedGlyphs,
  };
}
