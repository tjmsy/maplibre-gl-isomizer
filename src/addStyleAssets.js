export async function addStyleAssets(map, mapConfig = {}) {
  let appliedGlyphs = null;
  const addedSprites = [];

  if (mapConfig.glyphs) {
    map.setGlyphs(mapConfig.glyphs);
    appliedGlyphs = mapConfig.glyphs;
  }

  if (!mapConfig.sprite) {
    return { sprites: addedSprites, glyphs: appliedGlyphs };
  }

  const sprites = Array.isArray(mapConfig.sprite)
    ? mapConfig.sprite
    : [{ id: "default", url: mapConfig.sprite }];

  for (const { id, url } of sprites) {
    try {
      map.addSprite(id, url);
      addedSprites.push(id);
    } catch (e) {
      if (!e?.message?.includes("is duplicated")) {
        console.error(`Failed to add sprite '${id}':`, e);
      }
    }
  }

  return {
    sprites: addedSprites,
    glyphs: appliedGlyphs,
  };
}