'use strict';

function renderSkeletons() {
  var grid = $('grid-view');
  if (!grid) return;
  var html = '';
  for (var i = 0; i < 8; i++) {
    html += '<div class="skeleton-card" style="animation-delay:' + (i * 40) + 'ms">';
    for (var j = 0; j < 5; j++) html += '<div class="skeleton-line"></div>';
    html += '</div>';
  }
  grid.innerHTML = html;
}

function render(skipFilters) {
  if (hasError) return;
  clearAnimDelays();
  var grid = $('grid-view');
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      var filtered = nodesList.filter(function(n) {
        if (filterRegion && n.region !== filterRegion) return false;
        if (searchQuery) {
          var q = searchQuery.toLowerCase();
          var name = (n.name || '').toLowerCase();
          var region = (n.region || '').toLowerCase();
          var tags = (n.tags || '').toLowerCase();
          var uuid = (n.uuid || '').toLowerCase();
          if (name.indexOf(q) === -1 && region.indexOf(q) === -1 &&
              tags.indexOf(q) === -1 && uuid.indexOf(q) === -1) return false;
        }
        return true;
      });
      sortNodes(filtered);

      if (nodesList.length === 0) {
        grid.innerHTML = '<div class="empty-state"><span>暂无节点</span></div>';
        return;
      }
      if (filtered.length === 0) {
        grid.innerHTML = '<div class="empty-state"><span>没有匹配的节点</span></div>';
      } else {
        grid.innerHTML = filtered.map(renderCard).join('');
      }
      updateStats();
      if (!skipFilters) buildRegionFilters();
      positionBackToTop();
    });
  });
}

function clearAnimDelays() {
  nodesList.forEach(function(n) { delete n._animDelay; });
}

function sortNodes(arr) {
  var fns = {
    default: function(a, b) {
      return (b.online ? 1 : 0) - (a.online ? 1 : 0) || (a.weight || 0) - (b.weight || 0);
    },
    name: function(a, b) { return (a.name || '').localeCompare(b.name || ''); },
    region: function(a, b) { return (a.region || '').localeCompare(b.region || ''); },
    cpu: function(a, b) { return (b.cpu_usage || 0) - (a.cpu_usage || 0); },
    mem: function(a, b) {
      return ((b.mem_used || 0) / (b.mem_total || 1) - (a.mem_used || 0) / (a.mem_total || 1));
    },
    disk: function(a, b) {
      return ((b.disk_used || 0) / (b.disk_total || 1) - (a.disk_used || 0) / (a.disk_total || 1));
    },
    down: function(a, b) { return (b.net_down || 0) - (a.net_down || 0); },
    up: function(a, b) { return (b.net_up || 0) - (a.net_up || 0); },
    uptime: function(a, b) { return (b.uptime_sec || 0) - (a.uptime_sec || 0); }
  };
  arr.sort(fns[sortMode] || fns.default);
  var i = 0;
  arr.forEach(function(n) { n._animDelay = i++; });
}

function renderCard(n) {
  var d = (n._animDelay || 0) * 20;
  var cpu = n.cpu_usage || 0;
  var mp = n.mem_total > 0 ? ((n.mem_used || 0) / n.mem_total) * 100 : 0;
  var dp = n.disk_total > 0 ? ((n.disk_used || 0) / n.disk_total) * 100 : 0;
  var on = n.online;
  var fc = flagEmoji(n.region);
  var up = n.net_up || 0;
  var down = n.net_down || 0;
  var oc = osClass(n.os);

  return '<div class="node-card' + (on ? '' : ' offline') + '" data-uuid="' + n.uuid +
    '" tabindex="0" role="listitem" style="animation-delay:' + d + 'ms">' +
    '<div class="node-card-header"><div class="node-status ' + (on ? 'online' : 'offline') +
    '"></div>' + (oc ? '<span class="node-os-icon" data-os="' + oc + '"></span>' : '') +
    '<div class="node-name"><span class="status-dot ' + (on ? 'online pulse' : 'offline') +
    '"></span>' + (n.name || n.uuid || '—') + '</div>' +
    (n.region ? '<div class="node-region">' +
      (fc ? '<img class="node-flag" src="https://flagcdn.com/' + fc +
        '.svg" alt="" loading="lazy">' : '') + '</div>' : '') +
    '</div>' +
    (n.tags ? '<div class="card-tags">' +
      String(n.tags).split(',').filter(function(t) { return t.trim(); })
        .map(function(t) { return '<span class="tag-chip">' + t.trim() + '</span>'; }).join('') +
      '</div>' : '') +
    '<div class="card-metrics">' +
    cpuMetric('cpu', cpu) + cpuMetric('mem', mp) + cpuMetric('dsk', dp) +
    '<div class="card-metric net-row"><span class="cm-label">NET</span>' +
    '<span class="cm-value"><span class="up">↑' + bytes(up) + '/s</span>' +
    '<span class="down">↓' + bytes(down) + '/s</span></span></div>' +
    '</div>' +
    '<div class=\"node-footer\"><span class=\"node-footer-item\"><svg class=\"clock-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><polyline points=\"12,6 12,12 16,14\"/></svg> ' + uptime(n.uptime_sec) + '</span>' +
    (n.price ? '<span class="price-badge">' + (n.currency || '¥') + n.price + '/' +
      (n.billing_cycle === 365 ? '年' : n.billing_cycle === 30 ? '月' :
        n.billing_cycle === 1095 ? '3年' : n.billing_cycle === 0 ? '永久' : '期') +
      '</span>' : '') + '</div></div>';
}

function cpuMetric(type, pct) {
  var c = pct >= 80 ? 'var(--danger)' : (pct >= 60 ? 'var(--accent-orange)' : 'var(--accent)');
  return '<div class="card-metric ' + type + '"><span class="cm-label">' +
    type.toUpperCase() + '</span><div class="cm-bar"><div class="cm-fill ' +
    metricClass(pct) + '" style="transform:scaleX(' + Math.min(1, pct / 100) + ')"></div></div>' +
    '<span class="cm-value" style="color:' + c + '">' + pct.toFixed(1) + '%</span></div>';
}

function updateStats() {
  var on = 0, ttUp = 0, ttDown = 0, tc = 0, tr = 0, rs = {};
  nodesList.forEach(function(n) {
    if (n.online) { on++; if (n.region) rs[n.region] = true; }
    ttUp += n.total_up || 0;
    ttDown += n.total_down || 0;
    if (n.price && n.billing_cycle > 0) {
      var rate = n.currency === '$' ? exchangeRate : 1;
      var p = n.price * rate;
      if (n.billing_cycle === 30) tc += p;
      else if (n.billing_cycle === 365) tc += p / 12;
      else if (n.billing_cycle === 1095) tc += p / 36;
      if (n.expired_at) {
        var remain = Math.max(0,(new Date(n.expired_at).getTime() - Date.now()) / 86400000);
        tr += p * remain / n.billing_cycle;
      }
    }
  });
  var total = nodesList.length, off = total - on;
  $('stat-online-value').textContent = on + '/' + total;
  $('stat-region-value').innerHTML = (off > 0 ?
    '<span style="color:var(--danger)">' + off + ' 离线</span> · ' : '') +
    '点亮区域 ' + Object.keys(rs).length;
  $('stat-traffic-up').textContent = '↑ ' + bytes(ttUp);
  $('stat-traffic-down').textContent = '↓ ' + bytes(ttDown);
  var ru = 0, rd = 0;
  nodesList.forEach(function(n) { ru += n.net_up || 0; rd += n.net_down || 0; });
  $('stat-traffic-rate').innerHTML = '<span><svg class="zap-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>↑ ' + bytes(ru) + '/s</span> · <span><svg class="zap-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>↓ ' +
    bytes(rd) + '/s</span>';
  $('stat-cost-monthly').textContent = '¥' + Math.round(tc) +
    (tr > 0 ? ' · 剩余 ¥' + Math.round(tr) : '');
  $('stat-cost-usd').textContent = '≈ $' + (tc / exchangeRate).toFixed(2) +
    (tr > 0 ? ' / $' + (tr / exchangeRate).toFixed(2) : '');
}

function buildRegionFilters() {
  var m = {};
  nodesList.forEach(function(n) { if (n.region) m[n.region] = (m[n.region] || 0) + 1; });
  var r = Object.keys(m).sort(function(a, b) { return m[b] - m[a]; });
  var c = $('filters-container');
  if (!c) return;
  if (r.length === 0) { c.innerHTML = ''; return; }

  var h = '<button class="chip' + (filterRegion === null ? ' active' : '') +
    '" data-region="">全部 ' + nodesList.length + '</button>';
  r.forEach(function(k) {
    var fc = flagEmoji(k);
    var fi = fc ? '<img src="https://flagcdn.com/' + fc +
      '.svg" alt="" style="width:20px;height:13px;object-fit:cover;border-radius:2px;" loading="lazy">' : '';
    h += '<button class="chip' + (filterRegion === k ? ' active' : '') +
      '" data-region="' + k + '">' + fi + (fc ? fc.toUpperCase() : k) + ' ' + m[k] + '</button>';
  });
  c.querySelectorAll('.chip').forEach(function(e) { e.remove(); });
  c.insertAdjacentHTML('beforeend', h);
  c.querySelectorAll('.chip').forEach(function(b) {
    b.addEventListener('click', function() {
      if (this.classList.contains('active')) return;
      filterRegion = this.dataset.region || null;
      c.querySelectorAll('.chip').forEach(function(ch) { ch.classList.remove('active'); });
      this.classList.add('active');
      this.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      positionFilterSlider();
      render(true);
    });
  });
  requestAnimationFrame(function() { positionFilterSlider(); });
}

function positionFilterSlider() {
  var s = $('filter-slider');
  var a = document.querySelector('.chip.active');
  var f = $('filters-container');
  if (!s || !a || !f) return;
  s.style.left = a.offsetLeft + 'px';
  s.style.width = a.offsetWidth + 'px';
}

function positionBackToTop() {
  var btn = $('back-to-top');
  var grid = $('grid-view');
  if (!btn || !grid) return;
  var cards = grid.querySelectorAll('.node-card');
  if (cards.length === 0) return;
  var last = cards[cards.length - 1];
  var lr = last.getBoundingClientRect();
  var gr = grid.getBoundingClientRect();
  var bottom = lr.bottom + window.scrollY;
  var dist = document.documentElement.scrollHeight - bottom;
  btn.style.bottom = Math.max(4, dist) + 'px';
  btn.style.top = 'auto';
  btn.style.right = Math.max(4, (window.innerWidth - gr.right + 16) / 3) + 'px';
}

function updateSortUI() {
  var o = SORT_OPTIONS.find(function(o) { return o.value === sortMode; });
  $('sort-label').textContent = o ? o.label : '默认';
  $('sort-menu').querySelectorAll('.dropdown-item').forEach(function(item) {
    item.classList.toggle('active', item.dataset.sort === sortMode);
  });
}
