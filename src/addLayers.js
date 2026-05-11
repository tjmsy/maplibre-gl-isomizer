export async function addLayers(map, layers = []) {
  const added = [];

  layers.forEach((layer) => {
    if (!layer?.id) {
      console.warn("Layer missing id. Skipping:", layer);
      return;
    }

    if (map.getLayer(layer.id)) {
      console.warn(`Layer '${layer.id}' already exists. Skipping.`);
      return;
    }

    try {
      map.addLayer(layer);

      added.push(layer.id);
    } catch (error) {
      console.error(`Error adding layer ${layer.id}:`, error);
    }
  });

  return added;
}
