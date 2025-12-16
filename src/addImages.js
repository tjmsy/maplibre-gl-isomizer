async function getSvgText({ file, svg }) {
  if (typeof svg === "string" && svg.trim()) {
    return svg;
  }

  if (file) {
    const res = await fetch(file);
    if (!res.ok) {
      throw new Error(`Failed to fetch SVG: ${file} (${res.status})`);
    }
    return await res.text();
  }

  return null;
}

async function svgTextToImage(svgText) {
  const cleaned = svgText.replace(
    /<!--[\s\S]*?-->|<script[\s\S]*?<\/script>/g,
    ""
  );

  const blob = new Blob([cleaned], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);

  try {
    const img = new Image();
    img.src = url;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function addImages(map, svgPalette) {
  for (const { id, file, svg } of svgPalette) {
    try {
      if (!id) {
        console.warn("Missing image id. Skipping entry:", { file, svg });
        continue;
      }

      if (map.hasImage(id)) {
        console.warn(`Image id '${id}' already exists. Skipping.`);
        continue;
      }

      const svgText = await getSvgText({ file, svg });
      if (!svgText) continue;

      const img = await svgTextToImage(svgText);
      map.addImage(id, img);
    } catch (e) {
      console.error(`Error processing SVG with id ${id}:`, e);
    }
  }
}
