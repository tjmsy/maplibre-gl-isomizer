import { loadYaml } from "./loadYaml.js";
import { addImages } from "./addImages.js";
import { addSources } from "./addSources.js";
import { addLayers } from "./addLayers.js";
import { generateStyle } from "./generateStyle.js";

function resolveImagePaletteResource(resources) {
  if (resources["image-palette"]) {
    return {
      key: "image-palette",
      file: resources["image-palette"].file,
      deprecated: false,
    };
  }

  if (resources["svg-palette"]) {
    console.warn(
      "[DEPRECATED] 'svg-palette' is deprecated. Please use 'image-palette'."
    );
    return {
      key: "svg-palette",
      file: resources["svg-palette"].file,
      deprecated: true,
    };
  }

  throw new Error("Missing 'image-palette' resource.");
}

function resolveImagePaletteContent(palette, key) {
  if (palette["image-palette"]) {
    return palette["image-palette"];
  }

  if (palette["svg-palette"]) {
    return palette["svg-palette"];
  }

  throw new Error(
    `Invalid palette format in ${key}: expected 'image-palette'.`
  );
}

export async function isomizer(mapConfig, projectConfigPath) {
  try {
    const projectConfig = await loadYaml(projectConfigPath);

    const map = new maplibregl.Map({
      ...mapConfig,
      style: {
        version: 8,
        sources: {},
        layers: [],
      },
      hash: true,
    });

    const imagePaletteResource = resolveImagePaletteResource(
      projectConfig.resources
    );

    const [designPlan, symbolPalette, colorPalette, imagePaletteYaml] =
      await Promise.all([
        loadYaml(projectConfig.resources["design-plan"].file),
        loadYaml(projectConfig.resources["symbol-palette"].file),
        loadYaml(projectConfig.resources["color-palette"].file),
        loadYaml(imagePaletteResource.file),
      ]);

    const style = await generateStyle(
      designPlan.rules,
      designPlan.sources,
      symbolPalette["symbol-palette"],
      colorPalette["color-palette"]
    );

    const imagePalette = resolveImagePaletteContent(
      imagePaletteYaml,
      imagePaletteResource.key
    );

    await addImages(map, imagePalette);
    await addSources(map, designPlan.sources);
    await addLayers(map, style.layers);

    return map;
  } catch (error) {
    console.error("Error during isomizer process:", error);
  }
}
