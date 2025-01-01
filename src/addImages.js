import { loadYaml } from "./loadYaml.js";

export async function addImages(map, svgPalette) {
  for (const { id, file } of svgPalette) {
    let url;
    try {
      const svgResponse = await fetch(file);
      if (!svgResponse.ok) {
        console.error(`Failed to fetch SVG file: ${file}, status: ${svgResponse.status}`);
        continue;
      }
      const svgText = await svgResponse.text();
      const cleanedSvgText = svgText.replace(
        /<!--[\s\S]*?-->|\<script[\s\S]*?<\/script>/g,
        ""
      );
      const blob = new Blob([cleanedSvgText], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      img.src = url;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = (e) => {
          console.error("Image load error:", e);
          reject(e);
        };
      });
      map.addImage(id, img);
    } catch (error) {
      console.error(`Error processing SVG with id ${id}:`, error);
    } finally {
      if (url) {
        URL.revokeObjectURL(url);
      }
    }
  }
}
