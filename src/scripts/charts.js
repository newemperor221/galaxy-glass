'use strict';

function getCtx(id) {
  var c = document.getElementById(id);
  if (!c) return null;
  var ctx = c.getContext('2d');
  var dpr = window.devicePixelRatio || 1;
  var w = c.offsetWidth;
  var h = c.offsetHeight || parseInt(c.style.height) || 130;
  c.width = w * dpr;
  c.height = h * dpr;
  c.style.width = w + 'px';
  c.style.height = h + 'px';
  ctx.scale(dpr, dpr);
  return { ctx: ctx, w: w, h: h };
}

function drawLineChart(id, points, color, bgColor) {
  var chartId = id.replace('chart-', '');
  if (_chartPaused[chartId]) return;

  var o = getCtx(id);
  if (!o) return;
  var ctx = o.ctx, w = o.w, h = o.h;
  ctx.clearRect(0, 0, w, h);

  if (!points || points.length < 2) {
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('数据不足', w / 2, h / 2 + 4);
    return;
  }

  var min = Math.min.apply(null, points);
  var max = Math.max.apply(null, points);
  var range = max - min || 1;
  var step = w / (points.length - 1);
  var py = 10;
  var ch = h - py * 2;

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  [0.25, 0.5, 0.75].forEach(function(r) {
    var y = py + (1 - r) * ch + 0.5;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  });

  var lp = points.map(function(v, i) {
    return { x: i * step, y: py + (1 - (v - min) / range) * ch };
  });

  // Gradient fill
  var g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, bgColor);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  lp.forEach(function(p, i) { i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); });
  ctx.lineTo(lp[lp.length - 1].x, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();

  // Line
  ctx.shadowColor = color;
  ctx.shadowBlur = 4;
  ctx.beginPath();
  lp.forEach(function(p, i) { i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); });
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.shadowBlur = 0;

  // End dot
  var lt = lp[lp.length - 1];
  ctx.beginPath(); ctx.arc(lt.x, lt.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
  ctx.beginPath(); ctx.arc(lt.x, lt.y, 1.5, 0, Math.PI * 2);
  ctx.fillStyle = '#fff'; ctx.fill();
}

function drawNetChart(id, upPts, downPts, pts) {
  var chartId = id.replace('chart-', '');
  if (_chartPaused[chartId]) return;

  var o = getCtx(id);
  if (!o) return;
  var ctx = o.ctx, w = o.w, h = o.h;
  ctx.clearRect(0, 0, w, h);

  var len = Math.min(upPts.length, downPts.length);
  if (len < 2) {
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('数据不足', w / 2, h / 2 + 4);
    return;
  }

  var all = [];
  for (var i = 0; i < len; i++) { all.push(upPts[i]); all.push(downPts[i]); }
  var mv = Math.max.apply(null, all) || 1;
  var py = 10, ch = h - py * 2, step = w / (len - 1);

  // Timestamps
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(bytes(mv) + '/s', 4, 10);
  if (pts[0]) {
    ctx.textAlign = 'left';
    ctx.fillText(new Date(pts[0].updated_at).toLocaleTimeString('zh-CN',
      { hour: '2-digit', minute: '2-digit' }), 4, h - 2);
  }
  if (pts[len - 1]) {
    ctx.textAlign = 'right';
    ctx.fillText(new Date(pts[len - 1].updated_at).toLocaleTimeString('zh-CN',
      { hour: '2-digit', minute: '2-digit' }), w - 4, h - 2);
  }

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  [0.25, 0.5, 0.75].forEach(function(r) {
    var gy = py + (1 - r) * ch + 0.5;
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
  });

  function drawLine(pv, color) {
    var lp2 = pv.slice(0, len).map(function(v, i) {
      return { x: i * step, y: py + (1 - v / mv) * ch };
    });

    // Gradient
    var _hc = function(c, a) {
      if (c[0] === '#') {
        return 'rgba(' + parseInt(c.slice(1,3),16) + ',' +
          parseInt(c.slice(3,5),16) + ',' +
          parseInt(c.slice(5,7),16) + ',' + a + ')';
      }
      return c.replace(')', ',' + a + ')').replace('rgb', 'rgba');
    };
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, _hc(color, '0.15'));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    lp2.forEach(function(p, i) { i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); });
    ctx.lineTo(lp2[lp2.length - 1].x, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = g; ctx.fill();

    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    lp2.forEach(function(p, i) { i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.shadowBlur = 0;

    var lt2 = lp2[lp2.length - 1];
    ctx.beginPath(); ctx.arc(lt2.x, lt2.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    ctx.beginPath(); ctx.arc(lt2.x, lt2.y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
  }

  drawLine(upPts, '#f59e0b');
  drawLine(downPts, '#10b981');
}
