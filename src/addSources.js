export async function addSources(map, sourcesJson) {
  Object.entries(sourcesJson).forEach(([sourceId, sourceData]) => {
    map.addSource(sourceId, sourceData);
  });
}
