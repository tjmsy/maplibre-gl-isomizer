export async function addSources(map, sourcesJson) {
  Object.entries(sourcesJson).forEach(([sourceId, sourceData]) => {
    if (map.getSource(sourceId)) {
      return;
    }

    map.addSource(sourceId, sourceData);
  });
}