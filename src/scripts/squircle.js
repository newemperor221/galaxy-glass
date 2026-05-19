'use strict';

// figma-squircle v1.1.0 — browser port
// Generates Figma-flavored SVG squircle paths (continuous corner smoothing)
// https://github.com/phamfoo/figma-squircle

(function(global) {
  function toRadians(d) { return d * Math.PI / 180; }

  function rounded(strings) {
    var result = strings[0];
    for (var i = 1; i < arguments.length; i++) {
      var v = arguments[i];
      result += (typeof v === 'number' ? v.toFixed(4) : (v ?? '')) + strings[i];
    }
    return result;
  }

  var adjacentsByCorner = {
    topLeft: [{ corner: 'topRight', side: 'top' }, { corner: 'bottomLeft', side: 'left' }],
    topRight: [{ corner: 'topLeft', side: 'top' }, { corner: 'bottomRight', side: 'right' }],
    bottomLeft: [{ corner: 'bottomRight', side: 'bottom' }, { corner: 'topLeft', side: 'left' }],
    bottomRight: [{ corner: 'bottomLeft', side: 'bottom' }, { corner: 'topRight', side: 'right' }]
  };

  function distributeAndNormalize(opts) {
    var roundingAndSmoothingBudgetMap = { topLeft: -1, topRight: -1, bottomLeft: -1, bottomRight: -1 };
    var cornerRadiusMap = {
      topLeft: opts.topLeftCornerRadius,
      topRight: opts.topRightCornerRadius,
      bottomLeft: opts.bottomLeftCornerRadius,
      bottomRight: opts.bottomRightCornerRadius
    };
    var entries = Object.entries(cornerRadiusMap).sort(function(a, b) { return b[1] - a[1]; });
    entries.forEach(function(entry) {
      var corner = entry[0];
      var radius = entry[1];
      var adjacents = adjacentsByCorner[corner];
      var budget = Infinity;
      adjacents.forEach(function(adj) {
        var adjRadius = cornerRadiusMap[adj.corner];
        if (radius === 0 && adjRadius === 0) {
          budget = Math.min(budget, 0);
          return;
        }
        var adjBudget = roundingAndSmoothingBudgetMap[adj.corner];
        var sideLen = adj.side === 'top' || adj.side === 'bottom' ? opts.width : opts.height;
        if (adjBudget >= 0) {
          budget = Math.min(budget, sideLen - roundingAndSmoothingBudgetMap[adj.corner]);
        } else {
          budget = Math.min(budget, radius / (radius + adjRadius) * sideLen);
        }
      });
      roundingAndSmoothingBudgetMap[corner] = budget;
      cornerRadiusMap[corner] = Math.min(radius, budget);
    });
    return {
      topLeft: { radius: cornerRadiusMap.topLeft, roundingAndSmoothingBudget: roundingAndSmoothingBudgetMap.topLeft },
      topRight: { radius: cornerRadiusMap.topRight, roundingAndSmoothingBudget: roundingAndSmoothingBudgetMap.topRight },
      bottomLeft: { radius: cornerRadiusMap.bottomLeft, roundingAndSmoothingBudget: roundingAndSmoothingBudgetMap.bottomLeft },
      bottomRight: { radius: cornerRadiusMap.bottomRight, roundingAndSmoothingBudget: roundingAndSmoothingBudgetMap.bottomRight }
    };
  }

  function getPathParamsForCorner(opts) {
    var cr = opts.cornerRadius;
    var cs = opts.cornerSmoothing;
    var p = (1 + cs) * cr;
    if (!opts.preserveSmoothing) {
      var maxCS = opts.roundingAndSmoothingBudget / cr - 1;
      cs = Math.min(cs, maxCS);
      p = Math.min(p, opts.roundingAndSmoothingBudget);
    }
    var arcMeasure = 90 * (1 - cs);
    var arcSectionLength = Math.sin(toRadians(arcMeasure / 2)) * cr * Math.SQRT2;
    var angleAlpha = (90 - arcMeasure) / 2;
    var p3ToP4Dist = cr * Math.tan(toRadians(angleAlpha / 2));
    var angleBeta = 45 * cs;
    var c = p3ToP4Dist * Math.cos(toRadians(angleBeta));
    var d = c * Math.tan(toRadians(angleBeta));
    var b = (p - arcSectionLength - c - d) / 3;
    var a = 2 * b;
    if (opts.preserveSmoothing && p > opts.roundingAndSmoothingBudget) {
      var p1ToP3Max = opts.roundingAndSmoothingBudget - d - arcSectionLength - c;
      var minA = p1ToP3Max / 6;
      var maxB = p1ToP3Max - minA;
      b = Math.min(b, maxB);
      a = p1ToP3Max - b;
      p = Math.min(p, opts.roundingAndSmoothingBudget);
    }
    return { a: a, b: b, c: c, d: d, p: p, arcSectionLength: arcSectionLength, cornerRadius: cr };
  }

  function f4(x) { return x.toFixed(4); }

  function drawCorner(params, corner) {
    if (!params.cornerRadius) return 'l ' + params.p.toFixed(4) + ' 0';
    var a = params.a, b = params.b, c = params.c, d = params.d;
    var cr = params.cornerRadius, arc = params.arcSectionLength;
    var a4 = f4, ab = a + b, abc = a + b + c, bc = b + c;
    var neg = function(x){ return -x; };
    switch (corner) {
      case 'topRight':
        return 'c ' + a4(a) + ' 0 ' + a4(ab) + ' 0 ' + a4(abc) + ' ' + a4(d) +
          ' a ' + a4(cr) + ' ' + a4(cr) + ' 0 0 1 ' + a4(arc) + ' ' + a4(arc) +
          ' c ' + a4(d) + ' ' + a4(c) + ' ' + a4(d) + ' ' + a4(bc) + ' ' + a4(d) + ' ' + a4(abc);
      case 'bottomRight':
        return 'c 0 ' + a4(a) + ' 0 ' + a4(ab) + ' ' + a4(-d) + ' ' + a4(abc) +
          ' a ' + a4(cr) + ' ' + a4(cr) + ' 0 0 1 ' + a4(-arc) + ' ' + a4(arc) +
          ' c ' + a4(-c) + ' ' + a4(d) + ' ' + a4(-bc) + ' ' + a4(d) + ' ' + a4(-abc) + ' ' + a4(d);
      case 'bottomLeft':
        return 'c ' + a4(-a) + ' 0 ' + a4(-ab) + ' 0 ' + a4(-abc) + ' ' + a4(-d) +
          ' a ' + a4(cr) + ' ' + a4(cr) + ' 0 0 1 ' + a4(-arc) + ' ' + a4(-arc) +
          ' c ' + a4(-d) + ' ' + a4(-c) + ' ' + a4(-d) + ' ' + a4(-bc) + ' ' + a4(-d) + ' ' + a4(-abc);
      case 'topLeft':
        return 'c 0 ' + a4(-a) + ' 0 ' + a4(-ab) + ' ' + a4(d) + ' ' + a4(-abc) +
          ' a ' + a4(cr) + ' ' + a4(cr) + ' 0 0 1 ' + a4(arc) + ' ' + a4(-arc) +
          ' c ' + a4(c) + ' ' + a4(-d) + ' ' + a4(bc) + ' ' + a4(-d) + ' ' + a4(abc) + ' ' + a4(-d);
    }
  }

  function getSVGPathFromPathParams(p) {
    var tr = drawCorner(p.topRightPathParams, 'topRight');
    var br = drawCorner(p.bottomRightPathParams, 'bottomRight');
    var bl = drawCorner(p.bottomLeftPathParams, 'bottomLeft');
    var tl = drawCorner(p.topLeftPathParams, 'topLeft');
    return ('M ' + (p.width - p.topRightPathParams.p) + ' 0 ' + tr +
      ' L ' + p.width + ' ' + (p.height - p.bottomRightPathParams.p) + ' ' + br +
      ' L ' + p.bottomLeftPathParams.p + ' ' + p.height + ' ' + bl +
      ' L 0 ' + p.topLeftPathParams.p + ' ' + tl + ' Z')
      .replace(/\s+/g, ' ').trim();
  }

  function getSvgPath(opts) {
    var cornerRadius = opts.cornerRadius || 0;
    var topLeft = opts.topLeftCornerRadius ?? cornerRadius;
    var topRight = opts.topRightCornerRadius ?? cornerRadius;
    var bottomLeft = opts.bottomLeftCornerRadius ?? cornerRadius;
    var bottomRight = opts.bottomRightCornerRadius ?? cornerRadius;
    var width = opts.width;
    var height = opts.height;
    var cornerSmoothing = opts.cornerSmoothing;
    var preserve = opts.preserveSmoothing || false;

    if (topLeft === topRight && topRight === bottomRight && bottomRight === bottomLeft) {
      var budget = Math.min(width, height) / 2;
      var cr2 = Math.min(topLeft, budget);
      var pp = getPathParamsForCorner({ cornerRadius: cr2, cornerSmoothing: cornerSmoothing, preserveSmoothing: preserve, roundingAndSmoothingBudget: budget });
      return getSVGPathFromPathParams({ width: width, height: height, topLeftPathParams: pp, topRightPathParams: pp, bottomLeftPathParams: pp, bottomRightPathParams: pp });
    }
    var dist = distributeAndNormalize({ topLeftCornerRadius: topLeft, topRightCornerRadius: topRight, bottomRightCornerRadius: bottomRight, bottomLeftCornerRadius: bottomLeft, width: width, height: height });
    return getSVGPathFromPathParams({
      width: width, height: height,
      topLeftPathParams: getPathParamsForCorner({ cornerRadius: dist.topLeft.radius, cornerSmoothing: cornerSmoothing, preserveSmoothing: preserve, roundingAndSmoothingBudget: dist.topLeft.roundingAndSmoothingBudget }),
      topRightPathParams: getPathParamsForCorner({ cornerRadius: dist.topRight.radius, cornerSmoothing: cornerSmoothing, preserveSmoothing: preserve, roundingAndSmoothingBudget: dist.topRight.roundingAndSmoothingBudget }),
      bottomRightPathParams: getPathParamsForCorner({ cornerRadius: dist.bottomRight.radius, cornerSmoothing: cornerSmoothing, preserveSmoothing: preserve, roundingAndSmoothingBudget: dist.bottomRight.roundingAndSmoothingBudget }),
      bottomLeftPathParams: getPathParamsForCorner({ cornerRadius: dist.bottomLeft.radius, cornerSmoothing: cornerSmoothing, preserveSmoothing: preserve, roundingAndSmoothingBudget: dist.bottomLeft.roundingAndSmoothingBudget })
    });
  }

  // ── Apply to page ──
  var sqCounter = 0;
  var sqResizeTimer = null;

  function applySquircles() {
    var cards = document.querySelectorAll('.node-card, .stat-card, .metric-card, .skeleton-card, .sysinfo-card, .tags-card, .chart-card');
    if (!cards.length) return;

    var defs = document.querySelector('svg#sq-defs defs');
    if (!defs) {
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'sq-defs';
      svg.style.cssText = 'position:absolute;width:0;height:0';
      svg.setAttribute('aria-hidden', 'true');
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svg.appendChild(defs);
      document.body.prepend(svg);
    }

    // Remove old dynamic clip paths
    var existing = defs.querySelectorAll('[id^="sq-dyn-"]');
    for (var i = 0; i < existing.length; i++) {
      defs.removeChild(existing[i]);
    }

    cards.forEach(function(card, idx) {
      var w = card.offsetWidth;
      var h = card.offsetHeight;
      if (!w || !h) return;

      var isNode = card.classList.contains('node-card');
      var isChart = card.classList.contains('chart-card');
      var isSkeleton = card.classList.contains('skeleton-card');
      var rad = isNode || isSkeleton || isChart ? 22 : 16;
      if (card.classList.contains('metric-card')) rad = 16;

      var path = getSvgPath({ width: w, height: h, cornerRadius: rad, cornerSmoothing: 1 });

      var id = 'sq-dyn-' + idx;
      var clip = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
      clip.id = id;
      clip.setAttribute('clipPathUnits', 'userSpaceOnUse');
      var pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathEl.setAttribute('d', path);
      clip.appendChild(pathEl);
      defs.appendChild(clip);

      card.style.clipPath = 'url(#' + id + ')';
    });
  }

  // Debounced resize
  function onResize() {
    if (sqResizeTimer) clearTimeout(sqResizeTimer);
    sqResizeTimer = setTimeout(applySquircles, 150);
  }

  if (window.addEventListener) {
    window.addEventListener('resize', onResize);
  }

  global.getSvgPath = getSvgPath;
  global.applySquircles = applySquircles;

})(window);
