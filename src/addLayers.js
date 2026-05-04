export async function addLayers(map, layers) {
  layers.forEach((layer) => {
    if (map.getLayer(layer.id)) {
      console.warn(`Layer '${layer.id}' already exists. Skipping.`);
      return;
    }

    try {
      map.addLayer(layer);
    } catch (error) {
      console.error(`Error adding layer ${layer.id}:`, error);
    }
  });
}
