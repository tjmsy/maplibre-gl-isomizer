function generateLayerPaint(symbol, hex) {
  const MM_TO_PX = 3.8; // (96 DPI)
  const paint = { ...symbol.paint };

  if (symbol.type === "line") {
    paint["line-color"] = hex;
  } else if (symbol.type === "fill") {
    paint["fill-color"] = hex;
  }

  if (symbol["line-width(mm)"]) {
    paint["line-width"] = symbol["line-width(mm)"] * MM_TO_PX;
  }
  if (symbol["line-dasharray(mm)"]) {
    paint["line-dasharray"] = symbol["line-dasharray(mm)"].map(
      (element) => element * MM_TO_PX
    );
  }

  return paint;
}

function generateLayerId(index, symbolId, link, linkIndex) {
  return `${index}_${symbolId}_${link.source}_${link["source-layer"]}_${linkIndex}`;
}

function getColor(colorKey, colors) {
  const [group, color] = colorKey.split(".");

  const groupIndex = colors.findIndex((item) => item[group]);
  const colorIndex = colors[groupIndex][group].findIndex((item) => item[color]);

  const hex = colors[groupIndex][group][colorIndex][color].hex;
  const index = `${groupIndex}-${colorIndex}`;

  return { hex, index };
}

function getSymbolFromPalette(symbolId, symbols) {
  return symbols.find((s) => s.symbol_id === symbolId) || null;
}

function generateLayersFromRule(rule, symbols, colors) {
  return rule.symbol_id.flatMap((symbolId) => {
    return rule.links.map((link, linkIndex) => {
      const symbol = getSymbolFromPalette(symbolId, symbols);
      if (!symbol) {
        throw new Error(`Symbol not found for symbol_id: ${symbolId}`);
      }

      const { hex, index } = getColor(symbol["color-key"], colors);

      return {
        id: generateLayerId(index, symbolId, link, linkIndex),
        type: symbol.type,
        ...(link.source ? { source: link.source } : {}),
        ...(link["source-layer"] ? {"source-layer": link["source-layer"]} : {}),
        ...(symbol.minzoom ? { minzoom: symbol.minzoom } : {}),
        ...(symbol.maxzoom ? { maxzoom: symbol.maxzoom } : {}),
        ...(link.filter ? { filter: link.filter } : {}),
        ...(symbol.layout ? { layout: symbol.layout } : {}),
        paint: generateLayerPaint(symbol, hex),
      };
    });
  });
}

async function generateLayers(rules, symbols, colors) {
  const layers = rules.flatMap((rule) => {
    try {
      return generateLayersFromRule(rule, symbols, colors);
    } catch (error) {
      console.error(
        `Failed to process rule with symbol_id ${rule.symbol_id}: ${error.message}`
      );
      return [];
    }
  });

  layers.sort((a, b) => a.id.localeCompare(b.id));

  return layers;
}

export async function generateStyle(rules, sources, symbols, colors) {
  try {
    const layers = await generateLayers(rules, symbols, colors);
    return {
      version: 8,
      sources: sources,
      layers: layers,
    };
  } catch (error) {
    console.error("Error generating style:", error);
    throw error;
  }
}
