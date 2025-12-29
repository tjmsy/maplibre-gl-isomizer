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

function normalizeSymbolType(type) {
  switch (type) {
    case "point":
      return "symbol";
    case "area":
      return "fill";
    default:
      return type;
  }
}

function getSymbolFromPalette(symbolId, symbols) {
  const symbol = symbols.find((s) => s.symbol_id === symbolId);
  if (!symbol) return null;

  return {
    ...symbol,
    type: normalizeSymbolType(symbol.type),
  };
}

function generateLayerId(index, symbolId, suffix = "") {
  return suffix ? `${index}-${symbolId}-${suffix}` : `${index}-${symbolId}`;
}

function resolveLayerStyle(symbol, hex) {
  const paint = { ...(symbol.paint || {}) };
  const layout = { ...(symbol.layout || {}) };

  switch (symbol.type) {
    case "line": {
      paint["line-color"] = hex;

      if (symbol.property["line-width(mm)"]) {
        paint["line-width"] = symbol.property["line-width(mm)"] * MM_TO_PX;
      }

      if (symbol.property["line-dasharray(mm)"]) {
        paint["line-dasharray"] = symbol.property["line-dasharray(mm)"].map(
          (v) => v * MM_TO_PX
        );
      }
      break;
    }

    case "fill": {
      if (!("fill-pattern" in paint)) {
        paint["fill-color"] = hex;
      }
      break;
    }

    case "symbol": {
      if (symbol.property["image-id"]) {
        layout["icon-image"] = symbol.property["image-id"];
      }

      if (symbol.property["icon-size(mm)"]) {
        layout["icon-size"] = symbol.property["icon-size(mm)"] * MM_TO_PX;
      }
      break;
    }

    case "background": {
      break;
    }
  }

  return { paint, layout };
}

function createBaseLayer({ id, symbol, paint, layout }) {
  return {
    id,
    type: symbol.type,
    ...withIf(symbol.minzoom, { minzoom: symbol.minzoom }),
    ...withIf(symbol.maxzoom, { maxzoom: symbol.maxzoom }),
    ...withIf(Object.keys(layout).length, { layout }),
    ...withIf(Object.keys(paint).length, { paint }),
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

      const { paint, layout } = resolveLayerStyle(symbol, hex);

      const baseLayer = createBaseLayer({
        id: generateLayerId(index, symbolId, suffix),
        symbol,
        paint,
        layout,
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
