'use strict';

function mergeNodeData(node, recent) {
  var r = recent && recent.length ? recent[0] : {};
  return Object.assign({}, node, {
    cpu_usage: (r.cpu && r.cpu.usage) || 0,
    mem_used: (r.ram && r.ram.used) || 0,
    disk_used: (r.disk && r.disk.used) || 0,
    net_up: (r.network && r.network.up) || 0,
    net_down: (r.network && r.network.down) || 0,
    total_up: (r.network && r.network.totalUp) || 0,
    total_down: (r.network && r.network.totalDown) || 0,
    uptime_sec: r.uptime || 0,
    load1: r.load && r.load.load1,
    load5: r.load && r.load.load5,
    load15: r.load && r.load.load15,
    connections: r.connections,
    process: r.process,
    online: !!r.updated_at,
    updated_at: r.updated_at || node.updated_at
  });
}

var _origFetchJSON = fetchJSON;
async function fetchJSON(url, timeoutMs) {
  timeoutMs = timeoutMs || 15000;
  try {
    var ctrl = new AbortController();
    var timer = setTimeout(function() { ctrl.abort(); }, timeoutMs);
    var r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    var result = await r.json();

    // Connection recovery notification
    if (!_connOk) { _connOk = true; showConnToast('已恢复连接', true); }
    return result;
  } catch (e) {
    if (_connOk) { _connOk = false; showConnToast('连接中断，正在重试…', false); }
    return null;
  }
}

async function loadData() {
  renderSkeletons();

  // Theme / wallpaper
  var siteData = await fetchJSON('/api/public');
  $('poster').src = 'https://img.357561.xyz/image-wallpaper2.png';
  $('bg-video').src = 'https://img.357561.xyz/wallpaper1.mp4';
  if (siteData && siteData.theme_settings) {
    var ts = siteData.theme_settings;
    if (ts.posterUrl) $('poster').src = ts.posterUrl;
    if (ts.videoUrl) $('bg-video').src = ts.videoUrl;
    if (siteData.sitename) {
      document.querySelectorAll('#site-name,#footer-brand').forEach(function(el) { el.textContent = siteData.sitename; });
      document.title = siteData.sitename;
    }
  }

  // Exchange rate
  var rateData = await fetchJSON('/api/proxy/exchange-rate');
  if (rateData && rateData.conversion_rates && rateData.conversion_rates.CNY) {
    exchangeRate = rateData.conversion_rates.CNY;
    var re = $('stat-cost-rate');
    if (re) re.textContent = '@' + exchangeRate.toFixed(2);
  }

  // Online count
  async function refreshOnline() {
    var oc = await fetchJSON('/api/proxy/online-count');
    var pill = document.querySelector('.online-pill');
    if (pill && oc && oc.online !== undefined) {
      pill.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13" aria-hidden="true"><path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-2.625 6c-.54 0-.828.419-.936.634a1.96 1.96 0 0 0-.189.866c0 .298.059.605.189.866.108.215.395.634.936.634.54 0 .828-.419.936-.634.13-.26.189-.568.189-.866 0-.298-.059-.605-.189-.866-.108-.215-.395-.634-.936-.634Zm4.314 0c-.54 0-.828.419-.936.634a1.96 1.96 0 0 0-.189.866c0 .298.059.605.189.866.108.215.395.634.936.634.54 0 .828-.419.936-.634.13-.26.189-.568.189-.866 0-.298-.059-.605-.189-.866-.108-.215-.395-.634-.936-.634ZM12 13.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" clip-rule="evenodd"/></svg>在线 ' + oc.online + ' 人';
    }
  }
  refreshOnline();
  setInterval(refreshOnline, 60000);

  // Nodes
  var nodeData = await fetchJSON('/api/nodes');
  if (!nodeData || !nodeData.data) {
    hasError = true;
    $('grid-view').innerHTML = '<div class="error-state"><div class="error-icon">⚠️</div><span>无法连接到服务器，请检查后端状态</span></div>';
    return;
  }
  hasError = false;

  var raw = nodeData.data;
  var merged = await Promise.all(raw.map(async function(node) {
    var recent = await fetchJSON('/api/recent/' + node.uuid);
    return mergeNodeData(node, recent ? recent.data : []);
  }));
  nodesList = merged;
  render(false);
}
