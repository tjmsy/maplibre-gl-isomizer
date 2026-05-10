export async function addStyleAssets(map, mapConfig = {}) {
  if (mapConfig.glyphs && !map.getStyle()?.glyphs) {
    map.setGlyphs(mapConfig.glyphs);
  }

  if (!mapConfig.sprite) return;

  const sprites = Array.isArray(mapConfig.sprite)
    ? mapConfig.sprite
    : [{ id: "default", url: mapConfig.sprite }];

  for (const { id, url } of sprites) {
    if (!id || typeof url !== "string") {
      console.error(`Invalid sprite config:`, { id, url });
      continue;
    }

    try {
      map.addSprite(id, url);
    } catch (e) {
      if (e?.message?.includes("already exists")) {
        console.warn(`Sprite '${id}' already exists`);
      } else {
        console.error(`Failed to add sprite '${id}':`, e);
      }
    }
  }
}
