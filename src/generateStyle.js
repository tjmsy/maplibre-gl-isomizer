const MM_TO_PX = 3.8; // (96 DPI)
const withIf = (cond, obj) => (cond ? obj : {});

function getColor(colorKey, colors) {
  const [group, color] = colorKey.split(".");

  const groupIndex = colors.findIndex((item) => item[group]);
  const colorIndex = colors[groupIndex][group].findIndex((item) => item[color]);

  return colors[groupIndex][group][colorIndex][color].hex;
}

function getColorOrderIndex(colorKey, colors) {
  const [group, color] = colorKey.split(".");

  const groupIndex = colors.findIndex((item) => item[group]);
  const colorIndex = colors[groupIndex][group].findIndex((item) => item[color]);

  const paddedGroupIndex = groupIndex.toString().padStart(2, "0");
  const paddedColorIndex = colorIndex.toString().padStart(2, "0");

  return `${paddedGroupIndex}-${paddedColorIndex}`;
}

function getSymbolFromPalette(symbolId, symbols) {
  return symbols.find((s) => s.symbol_id === symbolId) || null;
}

function generateLayerId(index, symbolId, suffix = "") {
  return suffix ? `${index}-${symbolId}-${suffix}` : `${index}-${symbolId}`;
}

function resolveLayerPaint(symbol, hex) {
  const paint = { ...symbol.paint };

  if (symbol.type === "line") {
    paint["line-color"] = hex;
  } else if (symbol.type === "fill") {
    if (!("fill-pattern" in paint)) {
      paint["fill-color"] = hex;
    }
  }

  if (symbol.property["line-width(mm)"]) {
    paint["line-width"] = symbol.property["line-width(mm)"] * MM_TO_PX;
  }
  if (symbol.property["line-dasharray(mm)"]) {
    paint["line-dasharray"] = symbol.property["line-dasharray(mm)"].map(
      (element) => element * MM_TO_PX
    );
  }

  return paint;
}

function createBaseLayer({ id, symbol, paint }) {
  return {
    id,
    type: symbol.type,
    ...withIf(symbol.minzoom, { minzoom: symbol.minzoom }),
    ...withIf(symbol.maxzoom, { maxzoom: symbol.maxzoom }),
    ...withIf(symbol.layout, { layout: symbol.layout }),
    paint,
  };
}

function withSource(layer, link) {
  return {
    ...layer,
    ...withIf(link.source, { source: link.source }),
    ...withIf(link["source-layer"], {
      "source-layer": link["source-layer"],
    }),
    ...withIf(link.filter, { filter: link.filter }),
  };
}

function generateLayersFromRule(rule, symbols, colors) {
  return rule.symbol_id.flatMap((symbolId) => {
    const symbol = getSymbolFromPalette(symbolId, symbols);
    if (!symbol) {
      throw new Error(`Symbol not found for symbol_id: ${symbolId}`);
    }

    if (symbol.type === "background") {
      const colorKey = symbol.property["color-key"];
      const hex = getColor(colorKey, colors);
      const index = getColorOrderIndex(colorKey, colors);

      return [
        {
          id: generateLayerId(index, symbolId),
          type: "background",
          paint: {
            "background-color": hex,
          },
        },
      ];
    }

    return rule.links.map((link, linkIndex) => {
      const colorKey = symbol.property["color-key"];
      const hex = getColor(colorKey, colors);
      const index = getColorOrderIndex(colorKey, colors);

      const suffixParts = [link.source, link["source-layer"], linkIndex].filter(
        Boolean
      );

      const suffix = suffixParts.join("-");

      const paint = resolveLayerPaint(symbol, hex);

      const baseLayer = createBaseLayer({
        id: generateLayerId(index, symbolId, suffix),
        symbol,
        paint,
      });

      return withSource(baseLayer, link);
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

    const style = {
      version: 8,
      sources,
      layers,
    };

    return style;
  } catch (error) {
    console.error("Error generating style:", error);
    throw error;
  }
}
