async function getSvgText({ url, file, svg }) {
  if (svg && (url || file)) {
    console.warn("Both 'svg' and 'url/file' are provided. 'svg' will be used.");
  }

  if (url && file) {
    console.warn(
      "Both 'url' and deprecated 'file' are provided. 'url' will be used."
    );
  }

  if (typeof svg === "string" && svg.trim()) {
    return svg;
  }

  if (url) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch SVG: ${url} (${res.status})`);
    }
    return await res.text();
  }

  if (file) {
    console.warn("The 'file' field is deprecated. Please use 'url' instead.");
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
  for (const { id, svg, url, file } of svgPalette) {
    try {
      if (!id) {
        console.warn("Missing image id. Skipping entry:", { svg, url, file });
        continue;
      }

      if (map.hasImage(id)) {
        console.warn(`Image id '${id}' already exists. Skipping.`);
        continue;
      }

      const svgText = await getSvgText({ svg, url, file });
      if (!svgText) continue;

      const img = await svgTextToImage(svgText);
      map.addImage(id, img);
    } catch (e) {
      console.error(`Error processing SVG with id ${id}:`, e);
    }
  }
}
