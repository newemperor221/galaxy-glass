/**
 * figma-squircle — browser port → TypeScript
 * Generates Figma-flavored SVG squircle paths (continuous corner smoothing)
 * https://github.com/phamfoo/figma-squircle
 */

interface CornerOpts {
  cornerRadius: number;
  cornerSmoothing: number;
  preserveSmoothing?: boolean;
  roundingAndSmoothingBudget: number;
}

interface SqOpts {
  width: number;
  height: number;
  cornerRadius?: number;
  topLeftCornerRadius?: number;
  topRightCornerRadius?: number;
  bottomLeftCornerRadius?: number;
  bottomRightCornerRadius?: number;
  cornerSmoothing?: number;
  preserveSmoothing?: boolean;
}

function toRadians(d: number) { return d * Math.PI / 180; }

function min(a: number, b: number) { return a < b ? a : b; }

const adjacentsByCorner: Record<string, { corner: string; side: string }[]> = {
  topLeft: [{ corner: "topRight", side: "top" }, { corner: "bottomLeft", side: "left" }],
  topRight: [{ corner: "topLeft", side: "top" }, { corner: "bottomRight", side: "right" }],
  bottomLeft: [{ corner: "bottomRight", side: "bottom" }, { corner: "topLeft", side: "left" }],
  bottomRight: [{ corner: "bottomLeft", side: "bottom" }, { corner: "topRight", side: "right" }],
};

function distributeAndNormalize(opts: SqOpts) {
  const roundingAndSmoothingBudgetMap: Record<string, number> = { topLeft: -1, topRight: -1, bottomLeft: -1, bottomRight: -1 };
  const cornerRadiusMap: Record<string, number> = {
    topLeft: opts.topLeftCornerRadius ?? opts.cornerRadius ?? 0,
    topRight: opts.topRightCornerRadius ?? opts.cornerRadius ?? 0,
    bottomLeft: opts.bottomLeftCornerRadius ?? opts.cornerRadius ?? 0,
    bottomRight: opts.bottomRightCornerRadius ?? opts.cornerRadius ?? 0,
  };
  const entries = Object.entries(cornerRadiusMap).sort((a, b) => b[1] - a[1]);
  entries.forEach(([corner, radius]) => {
    const adjacents = adjacentsByCorner[corner];
    let budget = Infinity;
    adjacents.forEach((adj) => {
      const adjRadius = cornerRadiusMap[adj.corner];
      if (radius === 0 && adjRadius === 0) { budget = min(budget, 0); return; }
      const adjBudget = roundingAndSmoothingBudgetMap[adj.corner];
      const sideLen = adj.side === "top" || adj.side === "bottom" ? opts.width : opts.height;
      if (adjBudget >= 0) budget = min(budget, sideLen - adjBudget);
      else budget = min(budget, radius / (radius + adjRadius) * sideLen);
    });
    roundingAndSmoothingBudgetMap[corner] = budget;
    cornerRadiusMap[corner] = min(radius, budget);
  });
  return {
    topLeft: { radius: cornerRadiusMap.topLeft, roundingAndSmoothingBudget: roundingAndSmoothingBudgetMap.topLeft },
    topRight: { radius: cornerRadiusMap.topRight, roundingAndSmoothingBudget: roundingAndSmoothingBudgetMap.topRight },
    bottomLeft: { radius: cornerRadiusMap.bottomLeft, roundingAndSmoothingBudget: roundingAndSmoothingBudgetMap.bottomLeft },
    bottomRight: { radius: cornerRadiusMap.bottomRight, roundingAndSmoothingBudget: roundingAndSmoothingBudgetMap.bottomRight },
  };
}

function getPathParamsForCorner(opts: CornerOpts) {
  let cr = opts.cornerRadius;
  let cs = opts.cornerSmoothing;
  let p = (1 + cs) * cr;
  if (!opts.preserveSmoothing) {
    const maxCS = opts.roundingAndSmoothingBudget / cr - 1;
    cs = min(cs, maxCS);
    p = min(p, opts.roundingAndSmoothingBudget);
  }
  const arcMeasure = 90 * (1 - cs);
  const arcSectionLength = Math.sin(toRadians(arcMeasure / 2)) * cr * Math.SQRT2;
  const angleAlpha = (90 - arcMeasure) / 2;
  const p3ToP4Dist = cr * Math.tan(toRadians(angleAlpha / 2));
  const angleBeta = 45 * cs;
  const c = p3ToP4Dist * Math.cos(toRadians(angleBeta));
  const d = c * Math.tan(toRadians(angleBeta));
  let b = (p - arcSectionLength - c - d) / 3;
  let a = 2 * b;
  if (opts.preserveSmoothing && p > opts.roundingAndSmoothingBudget) {
    const p1ToP3Max = opts.roundingAndSmoothingBudget - d - arcSectionLength - c;
    const minA = p1ToP3Max / 6;
    const maxB = p1ToP3Max - minA;
    b = min(b, maxB);
    a = p1ToP3Max - b;
    p = min(p, opts.roundingAndSmoothingBudget);
  }
  return { a, b, c, d, p, arcSectionLength, cornerRadius: cr };
}

function drawCorner(params: ReturnType<typeof getPathParamsForCorner>, corner: string) {
  if (!params.cornerRadius) return `l ${params.p.toFixed(4)} 0`;
  const { a, b, c, d, cr, arc } = { ...params, cr: params.cornerRadius, arc: params.arcSectionLength };
  const a4 = (x: number) => x.toFixed(4);
  switch (corner) {
    case "topRight":
      return `c ${a4(a)} 0 ${a4(a + b)} 0 ${a4(a + b + c)} ${a4(d)} a ${a4(cr)} ${a4(cr)} 0 0 1 ${a4(arc)} ${a4(arc)} c ${a4(d)} ${a4(c)} ${a4(d)} ${a4(b + c)} ${a4(d)} ${a4(a + b + c)}`;
    case "bottomRight":
      return `c 0 ${a4(a)} 0 ${a4(a + b)} ${a4(-d)} ${a4(a + b + c)} a ${a4(cr)} ${a4(cr)} 0 0 1 ${a4(-arc)} ${a4(arc)} c ${a4(-c)} ${a4(d)} ${a4(-(b + c))} ${a4(d)} ${a4(-(a + b + c))} ${a4(d)}`;
    case "bottomLeft":
      return `c ${a4(-a)} 0 ${a4(-(a + b))} 0 ${a4(-(a + b + c))} ${a4(-d)} a ${a4(cr)} ${a4(cr)} 0 0 1 ${a4(-arc)} ${a4(-arc)} c ${a4(-d)} ${a4(-c)} ${a4(-d)} ${a4(-(b + c))} ${a4(-d)} ${a4(-(a + b + c))}`;
    case "topLeft":
      return `c 0 ${a4(-a)} 0 ${a4(-(a + b))} ${a4(d)} ${a4(-(a + b + c))} a ${a4(cr)} ${a4(cr)} 0 0 1 ${a4(arc)} ${a4(-arc)} c ${a4(c)} ${a4(-d)} ${a4(b + c)} ${a4(-d)} ${a4(a + b + c)} ${a4(-d)}`;
  }
  return "";
}

export function getSvgPath(opts: SqOpts): string {
  const w = opts.width, h = opts.height;
  const cs = opts.cornerSmoothing ?? 1;

  const topLeft = opts.topLeftCornerRadius ?? opts.cornerRadius ?? 0;
  const topRight = opts.topRightCornerRadius ?? opts.cornerRadius ?? 0;
  const bottomLeft = opts.bottomLeftCornerRadius ?? opts.cornerRadius ?? 0;
  const bottomRight = opts.bottomRightCornerRadius ?? opts.cornerRadius ?? 0;

  if (topLeft === topRight && topRight === bottomRight && bottomRight === bottomLeft) {
    const budget = min(w, h) / 2;
    const cr2 = min(topLeft, budget);
    const pp = getPathParamsForCorner({ cornerRadius: cr2, cornerSmoothing: cs, preserveSmoothing: opts.preserveSmoothing, roundingAndSmoothingBudget: budget });
    return (
      `M ${(w - pp.p).toFixed(4)} 0 ${drawCorner(pp, "topRight")} ` +
      `L ${w} ${(h - pp.p).toFixed(4)} ${drawCorner(pp, "bottomRight")} ` +
      `L ${pp.p.toFixed(4)} ${h} ${drawCorner(pp, "bottomLeft")} ` +
      `L 0 ${pp.p.toFixed(4)} ${drawCorner(pp, "topLeft")} Z`
    ).replace(/\s+/g, " ").trim();
  }

  const dist = distributeAndNormalize(opts);
  const tl = getPathParamsForCorner({ cornerRadius: dist.topLeft.radius, cornerSmoothing: cs, preserveSmoothing: opts.preserveSmoothing, roundingAndSmoothingBudget: dist.topLeft.roundingAndSmoothingBudget });
  const tr = getPathParamsForCorner({ cornerRadius: dist.topRight.radius, cornerSmoothing: cs, preserveSmoothing: opts.preserveSmoothing, roundingAndSmoothingBudget: dist.topRight.roundingAndSmoothingBudget });
  const br = getPathParamsForCorner({ cornerRadius: dist.bottomRight.radius, cornerSmoothing: cs, preserveSmoothing: opts.preserveSmoothing, roundingAndSmoothingBudget: dist.bottomRight.roundingAndSmoothingBudget });
  const bl = getPathParamsForCorner({ cornerRadius: dist.bottomLeft.radius, cornerSmoothing: cs, preserveSmoothing: opts.preserveSmoothing, roundingAndSmoothingBudget: dist.bottomLeft.roundingAndSmoothingBudget });
  return (
    `M ${(w - tr.p).toFixed(4)} 0 ${drawCorner(tr, "topRight")} ` +
    `L ${w} ${(h - br.p).toFixed(4)} ${drawCorner(br, "bottomRight")} ` +
    `L ${bl.p.toFixed(4)} ${h} ${drawCorner(bl, "bottomLeft")} ` +
    `L 0 ${tl.p.toFixed(4)} ${drawCorner(tl, "topLeft")} Z`
  ).replace(/\s+/g, " ").trim();
}
