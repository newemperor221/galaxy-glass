'use strict';

// ── State ──
var nodesList = [];
var sortMode = localStorage.getItem('nodeSort') || 'default';
var filterRegion = null;
var searchQuery = '';
var siteStart = new Date("2026-05-08T03:28:02Z").getTime();
var exchangeRate = 6.82;
var hasError = false;
var _chartPaused = {};
var _connOk = true;
var _tabId = 't' + Math.random().toString(36).substr(2, 8) + Date.now().toString(36);

// ── Constants ──
var SORT_OPTIONS = [
  {value:'default', label:'默认'},
  {value:'name',    label:'名称'},
  {value:'region',  label:'地区'},
  {value:'cpu',     label:'CPU 占用'},
  {value:'mem',     label:'内存占用'},
  {value:'disk',    label:'磁盘占用'},
  {value:'down',    label:'下行速度'},
  {value:'up',      label:'上行速度'},
  {value:'uptime',  label:'在线时长'}
];

// ── DOM Helpers ──
function $(id) { return document.getElementById(id); }
function debounce(fn, ms) {
  var t = null;
  return function() {
    var a = arguments, c = this;
    clearTimeout(t);
    t = setTimeout(function() { fn.apply(c, a); }, ms);
  };
}

// ── Formatting Helpers ──
function bytes(v) {
  if (!v || v <= 0) return '0B';
  var u = ['B','KB','MB','GB','TB','PB'];
  var i = Math.min(Math.floor(Math.log(v) / Math.log(1024)), u.length - 1);
  return (v / Math.pow(1024, i)).toFixed(i < 2 ? 0 : 1) + u[i];
}

function uptime(s) {
  if (!s || s <= 0) return '—';
  var d = Math.floor(s / 86400);
  var h = Math.floor((s % 86400) / 3600);
  return (d > 0 ? d + ' 天 ' : '') + h + ' 时';
}

function age(t) {
  if (!t) return '—';
  var diff = Math.floor((Date.now() - new Date(t).getTime()) / 1000);
  if (diff < 60) return diff + '秒前';
  if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
  return Math.floor(diff / 3600) + '小时前';
}

function metricClass(p) {
  return p >= 80 ? 'high' : (p >= 60 ? 'medium' : 'low');
}

function flagEmoji(r) {
  var m = {'🇺🇸':'us','🇯🇵':'jp','🇭🇰':'hk','🇳🇱':'nl','🇰🇵':'kp','🇩🇪':'de','🇸🇬':'sg','🇬🇧':'gb','🇰🇷':'kr','🇨🇳':'cn','🇷🇺':'ru','🇨🇦':'ca','🇦🇺':'au','🇹🇼':'tw'};
  return m[r] || '';
}

function osClass(os) {
  if (!os) return '';
  os = os.toLowerCase();
  if (os.includes('alpine')) return 'alpine';
  if (os.includes('debian')) return 'debian';
  if (os.includes('ubuntu')) return 'ubuntu';
  if (os.includes('centos') || os.includes('rhel')) return 'centos';
  return '';
}

// ── Connection Toast ──
function showConnToast(msg, ok) {
  var t = document.getElementById('conn-toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.remove('online', 'offline', 'visible');
  t.classList.add(ok ? 'online' : 'offline', 'visible');
  clearTimeout(t._hideTimer);
  t._hideTimer = setTimeout(function() { t.classList.remove('visible'); }, 4000);
}
