'use strict';

// ── Detail View ──
function showDetailView(uuid) {
  $('navbar').classList.add('in-detail');
  $('detail-view').classList.remove('hidden');
  $('list-view').classList.add('hidden');
  window.scrollTo(0, 0);
  loadDetailData(uuid);
}

function showListView() {
  hasError = false;
  render(false);
  window.removeEventListener('resize', redrawDetailCharts);
  window._detailChartData = null;
  window._dc = false;
  $('navbar').classList.remove('in-detail');
  $('detail-view').classList.add('hidden');
  $('list-view').classList.remove('hidden');
  window.scrollTo(0, 0);
}

function loadDetailData(uuid) {
  var l = $('detail-loading'), e = $('detail-error'), c = $('detail-content');
  l.classList.remove('hidden');
  e.classList.add('hidden');
  c.classList.add('hidden');

  var node = nodesList.find(function(n) { return n.uuid === uuid; });
  var nP = node ? Promise.resolve(node) :
    fetchJSON('/api/nodes').then(function(d) {
      return (d.data || []).find(function(n) { return n.uuid === uuid; });
    });

  nP.then(function(n) {
    if (!n) { l.classList.add('hidden'); e.textContent = '未找到该节点'; e.classList.remove('hidden'); return; }
    fetchJSON('/api/recent/' + uuid).then(function(rd) {
      var recent = rd ? rd.data || [] : [];
      renderDetailView(mergeNodeData(n, recent), recent);
    });
  }).catch(function(err) {
    l.classList.add('hidden');
    e.textContent = '加载失败: ' + err.message;
    e.classList.remove('hidden');
  });
}

function renderDetailView(node, recent) {
  var latest = recent[0] || {};
  var pts = recent.slice().reverse();

  // Header
  $('detail-name').textContent = node.name || node.uuid;
  var fc = flagEmoji(node.region);
  var fi = fc ? '<img class="detail-flag" src="https://flagcdn.com/' + fc + '.svg" alt="" loading="lazy">' : '';
  var oc = osClass(node.os);
  var oi = oc ? '<span class="node-os-icon" data-os="' + oc + '" style="width:14px;height:14px;font-size:12px;"></span>' : '';
  $('detail-meta').innerHTML = fi + oi + ' ' +
    [node.region, node.virtualization, (node.os || '').split(' ')[0]]
      .filter(Boolean).join(' · ');

  // Metrics
  var cpu = (latest.cpu && latest.cpu.usage) || 0;
  var mp = node.mem_total > 0 ? ((latest.ram && latest.ram.used || 0) / node.mem_total) * 100 : 0;
  var dp = node.disk_total > 0 ? ((latest.disk && latest.disk.used || 0) / node.disk_total) * 100 : 0;
  var mu = (latest.ram && latest.ram.used) || 0;
  var du = (latest.disk && latest.disk.used) || 0;
  var nu = (latest.network && latest.network.up) || 0;
  var nd = (latest.network && latest.network.down) || 0;
  var tu = (latest.network && latest.network.totalUp) || 0;
  var td = (latest.network && latest.network.totalDown) || 0;
  var traf = tu + td;
  var tl = node.traffic_limit || 0;

  $('detail-metrics').innerHTML = [
    { label: 'CPU',  value: cpu.toFixed(1) + '%',   pct: cpu, sub: '' },
    { label: '内存', value: mp.toFixed(1) + '%',   pct: mp,  sub: bytes(mu) + ' / ' + bytes(node.mem_total) },
    { label: '磁盘', value: dp.toFixed(1) + '%',   pct: dp,  sub: bytes(du) + ' / ' + bytes(node.disk_total) },
    { label: '在线', value: uptime(latest.uptime) },
    { label: '网络', value: '<span style="font-size:14px;font-weight:900">▲</span> ' + bytes(nu) + '/s <span style="font-size:14px;font-weight:900">▼</span> ' + bytes(nd) + '/s' },
    { label: '流量', value: bytes(traf) + (tl > 0 ? ' / ' + bytes(tl) : '') }
  ].map(function(m) {
    return '<div class="metric-card"><span class="metric-label">' + m.label +
      '</span><span class="metric-value">' + m.value + '</span>' +
      (m.sub ? '<span class="metric-sub">' + m.sub + '</span>' : '') +
      (m.pct !== undefined ? '<div class="metric-bar"><div class="metric-fill ' +
        metricClass(m.pct) + '" style="transform:scaleX(' + Math.min(1, m.pct / 100) + ')"></div></div>' : '') +
      '</div>';
  }).join('');

  // Sysinfo
  var l1 = (latest.load && latest.load.load1 !== undefined) ? latest.load.load1 : latest.load1;
  var l5 = (latest.load && latest.load.load5 !== undefined) ? latest.load.load5 : latest.load5;
  var l15 = (latest.load && latest.load.load15 !== undefined) ? latest.load.load15 : latest.load15;
  var cores = node.cpu_cores || 1;
  function lc(v) { return v >= cores * 2 ? 'high' : (v >= cores * 1 ? 'medium' : 'low'); }

  var leftRows = [
    { l: 'CPU 型号', v: node.cpu_name || '-' },
    { l: '核心数', v: node.cpu_cores ? '× ' + node.cpu_cores : '-' },
    { l: '架构', v: node.arch || '-' },
    { l: '虚拟化', v: node.virtualization || '-' },
    { l: '操作系统', v: (node.os || '-').split(' ').slice(0, 2).join(' ') },
    { l: 'Swap', v: (node.swap_total || 0) > 0 ? bytes(node.swap_total) : '无' },
    { l: '磁盘', v: bytes(node.disk_total) }
  ];
  if (node.gpu_name && node.gpu_name !== 'None' && node.gpu_name !== '-') {
    leftRows.push({ l: 'GPU', v: node.gpu_name });
  }

  var rightRows = [
    { l: '流量限额', v: tl > 0 ? bytes(tl) : '无' },
    { l: '进程数', v: latest.process || '-' },
    { l: 'TCP', v: (latest.connections && latest.connections.tcp) || '-' },
    { l: '更新', v: age(latest.updated_at) },
    { l: '到期', v: node.expired_at ? new Date(node.expired_at).toLocaleDateString('zh-CN') : '-' }
  ];
  if (l1 != null && l1 !== undefined) {
    rightRows.splice(rightRows.findIndex(function(r) { return r.l === '更新'; }) + 1, 0, {
      l: '负载', isLoad: true, v1: l1, v5: l5, v15: l15, cores: cores
    });
  }

  function rr(r) {
    if (r.isLoad) {
      return '<div class="sysinfo-row"><span class="lbl">' + r.l + '</span><div class="load-row">' +
        '<span class="load-badge ' + lc(r.v1) + '">1m ' + (r.v1 !== undefined ? r.v1 : '--') + '</span>' +
        '<span class="load-badge ' + lc(r.v5) + '">5m ' + (r.v5 !== undefined ? r.v5 : '--') + '</span>' +
        '<span class="load-badge ' + lc(r.v15) + '">15m ' + (r.v15 !== undefined ? r.v15 : '--') + '</span>' +
        '</div></div>';
    }
    return '<div class="sysinfo-row"><span class="lbl">' + r.l + '</span><span class="val">' + r.v + '</span></div>';
  }

  var tp = tl > 0 ? (traf / tl) * 100 : 0;
  var ps = node.price ? (node.currency || '¥') + node.price + '/' +
    (node.billing_cycle === 365 ? '年' : node.billing_cycle === 30 ? '月' :
      node.billing_cycle === 1095 ? '3年' : node.billing_cycle === 0 ? '永久' : '期') : '无';
  var dl = node.expired_at ? Math.max(0, Math.ceil((new Date(node.expired_at).getTime() - Date.now()) / 86400000)) : null;

  $('detail-sysinfo').innerHTML = '<div class="sysinfo-grid"><div>' +
    leftRows.map(rr).join('') + '</div><div>' + rightRows.map(rr).join('') +
    '</div><div class="sysinfo-bill"><span class="bill-chip">' + ps +
    '</span><span class="bill-chip' + (tp >= 80 ? ' danger' : '') + '"><svg class="chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="10" width="4" height="11"/><rect x="10" y="6" width="4" height="15"/><rect x="17" y="2" width="4" height="19"/></svg> ' +
    bytes(traf) + (tl > 0 ? '/' + bytes(tl) : '') + '</span><span class="bill-chip' +
    (dl !== null && dl < 15 ? ' danger' : '') + '"><svg class="chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg> ' +
    (dl !== null ? dl + '天' : '永久') + '</span></div></div>';

  // Tags & connections
  var tags = node.tags ? String(node.tags).split(',').filter(function(t) { return t.trim(); }) : [];
  var tcp = (latest.connections && latest.connections.tcp) || 0;
  var udp = (latest.connections && latest.connections.udp) || 0;
  var te = $('detail-tags');
  if (tags.length === 0 && !tcp && !udp) {
    te.classList.add('hidden');
  } else {
    te.classList.remove('hidden');
    var th = '';
    if (tags.length) {
      th = '<div class="tags-list">';
      for (var _i = 0; _i < tags.length; _i++) {
        th += '<span class="tag-chip">' + tags[_i].trim() + '</span>';
      }
      th += '</div>';
    }
    var ch = '';
    if (tcp || udp) { ch = '<div class="conn-row"><span class="conn-item">' + tcp + ' TCP</span><span class="conn-item">' + udp + ' UDP</span></div>'; }
    te.innerHTML = '<div class="tags-title">标签 · 连接</div>' + th + ch;
  }

  // Badge updates
  $('badge-cpu').textContent = cpu.toFixed(1) + '%';
  $('badge-mem').textContent = mp.toFixed(1) + '%';
  $('badge-net').textContent = '↑ ' + bytes(nu) + '/s · ↓ ' + bytes(nd) + '/s';

  // Show content
  $('detail-loading').classList.add('hidden');
  $('detail-content').classList.remove('hidden');

  // Charts
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      var cpuPts = pts.map(function(r) { return (r.cpu && r.cpu.usage) || 0; });
      var memPts = pts.map(function(r) {
        var t = (r.ram && r.ram.total) || node.mem_total || 1;
        var u = (r.ram && r.ram.used) || 0;
        return t > 0 ? (u / t) * 100 : 0;
      });
      var upPts = pts.map(function(r) { return (r.network && r.network.up) || 0; });
      var downPts = pts.map(function(r) { return (r.network && r.network.down) || 0; });

      drawLineChart('chart-cpu', cpuPts, '#10b981', 'rgba(16,185,129,0.12)');
      drawLineChart('chart-mem', memPts, '#818cf8', 'rgba(129,140,248,0.12)');
      drawNetChart('chart-net', upPts, downPts, pts);
      window._detailChartData = { cpuPts: cpuPts, memPts: memPts, upPts: upPts, downPts: downPts, pts: pts };
      if (!window._dc) { window.addEventListener('resize', redrawDetailCharts); window._dc = true; }
    });
  });
}

function redrawDetailCharts() {
  var d = window._detailChartData;
  if (!d) return;
  if (!_chartPaused['cpu']) drawLineChart('chart-cpu', d.cpuPts, '#10b981', 'rgba(16,185,129,0.12)');
  if (!_chartPaused['mem']) drawLineChart('chart-mem', d.memPts, '#818cf8', 'rgba(129,140,248,0.12)');
  if (!_chartPaused['net']) drawNetChart('chart-net', d.upPts, d.downPts, d.pts);
}

// ── Event Setup ──
function setupEvents() {
  // Search
  var sb = $('search-box'), si = $('search-input');
  sb.addEventListener('click', function(e) {
    e.stopPropagation();
    sb.classList.add('open');
    setTimeout(function() { si.focus(); }, 50);
  });
  document.addEventListener('click', function(e) {
    if (!sb.contains(e.target)) { sb.classList.remove('open'); si.blur(); }
  });
  si.addEventListener('input', debounce(function() { searchQuery = this.value; render(false); }, 150));

  // Sort dropdown
  var sBtn = $('sort-btn'), sM = $('sort-menu');
  sBtn.addEventListener('click', function(e) { e.stopPropagation(); sM.classList.toggle('hidden'); });
  document.addEventListener('click', function() { sM.classList.add('hidden'); });
  sM.querySelectorAll('.dropdown-item').forEach(function(item) {
    item.addEventListener('click', function() {
      sortMode = this.dataset.sort;
      localStorage.setItem('nodeSort', sortMode);
      updateSortUI();
      render(false);
      sM.classList.add('hidden');
    });
  });

  // Card click → detail
  $('grid-view').addEventListener('click', function(e) {
    var card = e.target.closest('.node-card');
    if (!card) return;
    var uuid = card.dataset.uuid;
    if (uuid) { history.pushState({ uuid: uuid }, '', '/instance/' + encodeURIComponent(uuid)); showDetailView(uuid); }
  });

  // Keyboard nav
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      var t = e.target.closest('[data-uuid]');
      if (t) { e.preventDefault(); var uuid = t.dataset.uuid; history.pushState({ uuid: uuid }, '', '/instance/' + encodeURIComponent(uuid)); showDetailView(uuid); }
    }
  });

  // Back to top
  $('back-to-top').addEventListener('click', function() { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  // Detail back
  $('detail-back').addEventListener('click', function() { history.pushState(null, '', '/'); showListView(); });

  updateSortUI();
  wirePauseButtons();
}

// ── Scroll ──
function setupScroll() {
  var bt = $('back-to-top');
  var scrolled = false, ticking = false;
  window.addEventListener('scroll', function() {
    if (!ticking) {
      window.requestAnimationFrame(function() {
        var y = window.scrollY || document.documentElement.scrollTop;
        if (y > 25 && !scrolled) { scrolled = true; bt.classList.add('visible'); }
        else if (y <= 25 && scrolled) { scrolled = false; bt.classList.remove('visible'); }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

// ── Router ──
function setupRouter() {
  window.addEventListener('popstate', function(e) {
    var p = window.location.pathname;
    var m = p.match(/^\/instance\/(.+)$/);
    if (m && m[1]) showDetailView(decodeURIComponent(m[1]));
    else showListView();
  });
  var p = window.location.pathname;
  var m = p.match(/^\/instance\/(.+)$/);
  if (m && m[1]) showDetailView(decodeURIComponent(m[1]));
}

// ── Pause / Resume ──
function toggleChartPause(id) {
  _chartPaused[id] = !_chartPaused[id];
  var btn = document.getElementById('pause-' + id);
  if (!btn) return;
  btn.textContent = _chartPaused[id] ? '▶ 继续' : '⏸ 暂停';
  btn.classList.toggle('paused', _chartPaused[id]);
}

function wirePauseButtons() {
  ['cpu', 'mem', 'net'].forEach(function(id) {
    var btn = document.getElementById('pause-' + id);
    if (btn) btn.addEventListener('click', function() { toggleChartPause(id); });
  });
}

// ── Timers ──
function startFooterUptime() {
  function u() {
    var d = Math.floor((Date.now() - siteStart) / 1000);
    var dd = Math.floor(d / 86400);
    var hh = Math.floor((d % 86400) / 3600);
    var mm = Math.floor((d % 3600) / 60);
    var e = $('footer-uptime');
    if (e) e.textContent = 'GG 探针 · 已稳定运行 ' + dd + ' 日 ' + hh + ' 时 ' + mm + ' 分';
  }
  u();
  setInterval(u, 60000);
}

function startClock() {
  function t() {
    var e = $('stat-time-value');
    if (e) e.textContent = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  }
  t();
  setInterval(t, 1000);
}
