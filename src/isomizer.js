import { loadYaml } from "./loadYaml.js";
import { addImages } from "./addImages.js";
import { addSources } from "./addSources.js";
import { addLayers } from "./addLayers.js";
import { generateStyle } from "./generateStyle.js";

export async function isomizer(map, projectConfigPath) {
  try {
    const projectConfig = await loadYaml(projectConfigPath);

    const designPlanPromise = loadYaml(
      projectConfig.resources["design-plan"].file,
    );

    const symbolPalettePromise = loadYaml(
      projectConfig.resources["symbol-palette"].file,
    );

    const colorPalettePromise = loadYaml(
      projectConfig.resources["color-palette"].file,
    );

    const imagePalettePromise = projectConfig.resources["image-palette"]?.file
      ? loadYaml(projectConfig.resources["image-palette"].file)
      : Promise.resolve(null);

    const [designPlan, symbolPalette, colorPalette, imagePalette] =
      await Promise.all([
        designPlanPromise,
        symbolPalettePromise,
        colorPalettePromise,
        imagePalettePromise,
      ]);

    const projectId = projectConfig.project?.id;

    const style = await generateStyle(
      designPlan.rules,
      designPlan.sources,
      symbolPalette["symbol-palette"],
      colorPalette["color-palette"],
      projectId,
    );

    const images = imagePalette?.["image-palette"] ?? [];

    await addImages(map, imagePalette["image-palette"]);
    await addSources(map, designPlan.sources);
    await addLayers(map, style.layers);

    if (projectConfig.map && !window.location.hash) {
      map.jumpTo({
        center: projectConfig.map.center,
        zoom: projectConfig.map.zoom,
        bearing: projectConfig.map.bearing ?? 0,
        pitch: projectConfig.map.pitch ?? 0,
      });
    }

    return map;
  } catch (error) {
    console.error("Error during isomizer process:", error);
  }
}
