export async function addLayers(map, layers = [], options = {}) {
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
      map.addLayer(layer, resolveBeforeId(map, layer, options));

      added.push(layer.id);
    } catch (error) {
      console.error(`Error adding layer ${layer.id}:`, error);
    }
  });

  return added;
}

function resolveBeforeId(map, layer, options) {
  let beforeId = options.beforeId;

  if (!options.enableLayerGrouping) return beforeId;

  const role = layer.metadata?.role;

  if (role === "basemap") {
    const firstNonBase = map
      .getStyle()
      .layers.find((l) => l.metadata?.role !== "basemap");

    return firstNonBase?.id ?? beforeId;
  }

  return beforeId;
}
