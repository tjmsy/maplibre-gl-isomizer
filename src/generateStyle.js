const MM_TO_PX = 3.8; // (96 DPI)
const withIf = (cond, obj) => (cond ? obj : {});

function mmToPx(mm, precision = 1) {
  const factor = 10 ** precision;
  return Math.round(mm * MM_TO_PX * factor) / factor;
}

function getColor(colorKey, colors) {
  const [group, color] = colorKey.split(".");

  const groupIndex = colors.findIndex((item) => item[group]);
  const colorIndex = colors[groupIndex][group].findIndex((item) => item[color]);

  return colors[groupIndex][group][colorIndex][color].hex;
}

function getColorOrder(colorKey, colors) {
  const [group, color] = colorKey.split(".");

  const groupIndex = colors.findIndex((item) => item[group]);
  const colorIndex = colors[groupIndex][group].findIndex((item) => item[color]);

  return groupIndex * 100 + colorIndex;
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

function generateLayerId(symbolId, suffix = "") {
  return suffix ? `${symbolId}-${suffix}` : `${symbolId}`;
}

function resolveLayerStyle(symbol, hex) {
  const paint = { ...(symbol.paint || {}) };
  const layout = { ...(symbol.layout || {}) };

  switch (symbol.type) {
    case "line": {
      paint["line-color"] = hex;

      if (symbol.property["line-width(mm)"]) {
        paint["line-width"] = mmToPx(symbol.property["line-width(mm)"]);
      }

      if (symbol.property["line-dasharray(mm)"]) {
        paint["line-dasharray"] = symbol.property["line-dasharray(mm)"].map(
          (v) => mmToPx(v),
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
        layout["icon-size"] = mmToPx(symbol.property["icon-size(mm)"]);
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

function generateLayersFromRule(rule, symbols, colors, projectId) {
  return rule.symbol_id.flatMap((symbolId) => {
    const symbol = getSymbolFromPalette(symbolId, symbols);
    if (!symbol) {
      throw new Error(`Symbol not found for symbol_id: ${symbolId}`);
    }

    const colorKey = symbol.property["color-key"];
    const hex = getColor(colorKey, colors);
    const order = getColorOrder(colorKey, colors);

    if (symbol.type === "background") {
      return [
        {
          id: "background",
          type: "background",
          paint: {
            "background-color": hex,
          },
          metadata: {
            ...(projectId && { "isomizer:project": projectId }),
            "isomizer:order": 0,
          },
        },
      ];
    }

    return rule.links.map((link, linkIndex) => {
      const suffixParts = [link.source, link["source-layer"], linkIndex].filter(
        Boolean,
      );

      const suffix = suffixParts.join("-");

      const { paint, layout } = resolveLayerStyle(symbol, hex);

      const baseLayer = createBaseLayer({
        id: generateLayerId(symbolId, suffix),
        symbol,
        paint,
        layout,
      });

      return {
        ...withSource(baseLayer, link),
        metadata: {
          ...(baseLayer.metadata || {}),
          ...(projectId && { "isomizer:project": projectId }),
          "isomizer:order": order,
        },
      };
    });
  });
}

async function generateLayers(rules, symbols, colors, projectId) {
  const layers = rules.flatMap((rule) => {
    try {
      return generateLayersFromRule(rule, symbols, colors, projectId);
    } catch (error) {
      console.error(
        `Failed to process rule with symbol_id ${rule.symbol_id}: ${error.message}`,
      );
      return [];
    }
  });

  layers.sort((a, b) => {
    const oa = a.metadata?.["isomizer:order"] ?? Infinity;
    const ob = b.metadata?.["isomizer:order"] ?? Infinity;
    return oa - ob;
  });

  return layers;
}

export async function generateStyle(
  rules,
  sources,
  symbols,
  colors,
  projectId,
) {
  try {
    const layers = await generateLayers(rules, symbols, colors, projectId);

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
