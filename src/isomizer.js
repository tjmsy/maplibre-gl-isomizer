import { loadYaml } from "./loadYaml.js";
import { addImages } from "./addImages.js";
import { addSources } from "./addSources.js";
import { addLayers } from "./addLayers.js";
import { generateStyle } from "./generateStyle.js";

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

    const [designPlan, symbolPalette, colorPalette, svgPalette] =
      await Promise.all([
        loadYaml(projectConfig.resources["design-plan"].file),
        loadYaml(projectConfig.resources["symbol-palette"].file),
        loadYaml(projectConfig.resources["color-palette"].file),
        loadYaml(projectConfig.resources["svg-palette"].file),
      ]);

      const style = await generateStyle(
      designPlan.rules,
      designPlan.sources,
      symbolPalette["symbol-palette"],
      colorPalette["color-palette"]
    );

    await addImages(map, svgPalette["svg-palette"]);
    await addSources(map, designPlan.sources);
    await addLayers(map, style.layers);
    return map;
  } catch (error) {
    console.error("Error during isomizer process:", error);
  }
}
