export async function addSources(map, sources = {}) {
  const added = [];

  for (const [id, source] of Object.entries(sources)) {
    if (map.getSource(id)) continue;

    map.addSource(id, source);
    added.push(id);
  }

  return added;
}