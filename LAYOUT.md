# NodeGet Glass 主题布局文档

## 文件结构

```
nodeget-komari-theme/
├── LAYOUT.md          # 本文档
├── dist/
│   ├── index.html    # 主页（节点列表）
│   └── detail.html   # 详情页（单节点图表）
└── README.md
```

## 主页布局（index.html）

### 视觉层级（z-index）

| 层级 | 元素 | 用途 |
|------|------|------|
| -1 | `.bg-layer` | 背景图片/视频，fixed 铺满 |
| 10 | `.page` | 主容器，relative |
| 10 | `.navbar` | 导航栏，sticky top |
| 20 | `.back-to-top` | 回到顶部按钮，fixed |

### 页面结构

```
<body>
├── .bg-layer          # 背景视频/图片（始终 fixed，不随滚动）
│   ├── #poster         # 图片（移动端）
│   └── #bg-video       # 视频（桌面端）
│
├── .page
│   ├── nav.navbar     # 导航栏 sticky，包含：
│   │   ├── .container.navbar-inner
│   │   │   ├── .navbar-brand → ./（链接回主页）
│   │   │   └── .navbar-actions
│   │   │       ├── .search-box      # 搜索框（展开动画 0.6s）
│   │   │       ├── .view-toggle      # 卡片/表格 切换滑块
│   │   │       └── .dropdown#sort-dropdown  # 排序下拉
│   │   └── .navbar-mobile-search    # 移动端搜索（< 640px 显示）
│   │
│   └── main.container.main
│       ├── .stats-grid          # 4 张统计卡（固定高度不变）
│       │   └── .stat-card × 4
│       │       ① 当前时间（每秒更新）
│       │       ② 在线服务器
│       │       ③ 流量 / 速率
│       │       ④ 剩余价值 / 总价值
│       │
│       ├── #region-filters      # 区域筛选按钮（全部/US/JP/HK...）
│       ├── .loading              # 加载状态
│       ├── .nodes-grid          # 卡片网格（min-height 固定底部栏）
│       │   └── .node-card × N
│       ├── .table-view          # 表格视图（与网格二选一显示）
│       │   ├── .table-header
│       │   └── #table-body
│       └── .empty               # 空状态
│
├── footer.footer      # 页脚（非 sticky，随内容滚动）
│   └── .container.footer-inner（三栏：Logo | 在线运行 | Powered by）
│
└── button.back-to-top  # 回到顶部（滚动 > 25px 显示）
```

### CSS 关键约束（不要动）

```css
/* 主页容器 — 不要改 max-width */
.container { max-width: 1124px; margin: 0 auto; padding: 0 1.5rem; width: 100%; }

/* 节点网格 — min-height 固定底部栏位置，防止筛选时抖动 */
.nodes-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  align-content: start;
  min-height: calc(100vh - 380px); /* ← 必须保留 */
}
@media (min-width: 640px) { .nodes-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1024px) { .nodes-grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 1280px) { .nodes-grid { grid-template-columns: repeat(4, 1fr); } }

/* 卡片最小高度 — 防止最后一排卡片被拉伸 */
.node-card { min-height: 160px; }

/* 表格 — 不要改 max-width */
.table-view { max-width: 1124px; margin: 0 auto; padding: 0 1.5rem; width: 100%; }
.table-header, .table-row { grid-template-columns: 48px 1fr 70px 65px 65px 65px 100px 65px 85px 80px; }

/* 搜索框动画时长 — 0.6s */
.search-box { transition: all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
```

### 统计卡数据来源

统计卡由 `updateStats()` 驱动，**基于全部节点**（不过滤），每 30s 刷新：

| 字段 | 计算方式 |
|------|----------|
| 在线服务器 | `nodesList.filter(n => n.online).length` |
| 流量/速率 | Σ`network_out`，Σ`network_total_received` |
| 剩余价值/总价值 | `Σ price_CNY × 剩余天数/周期天数` |

汇率：USD → CNY 从 `exchangerate-api.com` 实时获取，localStorage 缓存 1 小时。

### 数据流向

```
fetchSiteInfo()          → /api/public     → 站点名称
fetchNodes()             → /api/nodes      → 节点静态信息
fetchRecentData(uuid)    → /api/recent/uuid → 节点动态数据
↓
mergeNodeData(node, recent) → 合并静态+动态
↓
nodesList[] → getFiltered() → renderCard() / renderRow()
```

### 筛选/排序流程

- `filterRegion`：按 `n.region` 精确匹配
- `filterTag`：按 `n.tags` 包含匹配
- `searchQuery`：在 `uuid, name, os, virtualization, cpu_name, tags_list` 中搜索
- 排序：先在线状态，再 sortMode 字段，最后 name

## 详情页布局（detail.html）

### 页面结构

```
<body>
├── .bg-layer          # 背景视频（与主页共用）
├── .page
│   ├── nav.detail-nav    # 顶部栏 sticky
│   │   ├── .back-btn      # 返回主页
│   │   └── .detail-title  # 节点名称
│   └── main.container.main
│       ├── .loading
│       ├── .error-state
│       └── #detail-content（flex column, gap 16px）
│           ├── .current-metrics    # 6 个指标卡（CPU/内存/磁盘/3个负载）
│           ├── .info-grid          # 14 个概览信息卡
│           ├── .chart-card（CPU 图表）
│           ├── .chart-card（内存图表）
│           └── .chart-card（网络图表）
```

### 概览信息卡字段（14个）

CPU | 虚拟化 | 操作系统 | 内核版本 | 内存总量 | 磁盘总量 | 流量限额 | 价格 | 到期时间 | 在线时长 | 进程数 | TCP 连接 | 标签 | 最后更新

### 图表绘制

- `drawLine(canvasId, points, color, bgColor)`：单线图（CPU/内存）
- `drawNet(canvasId, upPoints, downPoints)`：双线图（网络上行橙色/下行绿色）
- Canvas 使用 DPR 缩放，禁止设置固定 width/height 属性，只用 style

## 两页共用规范

| 项目 | 值 |
|------|-----|
| 背景色 | `#0a1a0f` |
| 毛玻璃背景 | `rgba(0,0,0,0.35)` |
| 边框圆角 | `16px`（卡片），`9999px`（胶囊按钮）|
| 字体 | 系统字体 + `ui-monospace` 等宽 |
| 导航栏高度 | `padding: 0.75rem 0`（主页 `.navbar-inner`）|
| 图表高度 | `120px`（canvas style height）|
| 模糊效果 | `backdrop-filter: blur(80px) saturate(180%)`（卡片）|
| 触摸反馈 | `hover: translateY(-6px) scale(1.02)`（卡片和表格行）|

## detail.html 与 index.html 的差异

| 项目 | index.html | detail.html |
|------|-----------|-------------|
| 导航栏 | `.navbar` + 搜索+视图切换+排序 | `.detail-nav` + 返回按钮+标题 |
| 节点区域 | 网格/表格列表 | 单节点详情 |
| 统计卡 | 有 | 无 |
| 区域筛选 | 有 | 无 |
| 图表 | 无 | CPU/内存/网络 3个 |
| 概览信息 | 无 | 14 个 info-card |

## 常见操作规范

### 改样式
1. 先确认是 index.html 还是 detail.html
2. 不要改 `.container` 的 `max-width`
3. 不要改 `.table-view` 的 `max-width`
4. 改完 GitHub → 56idc 两步推送

### 加卡片信息（footer）
- 卡片 footer 在 `.node-card` 底部 `div.node-footer`
- 路由：主页 `renderCard()` 第 981-1007 行
- 格式：`flex` 行，`.node-footer-row` 内元素用 `margin-left: auto` 靠右

### 改统计卡
- 路由：`updateStats()` 第 1057-1085 行
- 不要在 `updateStats()` 里操作 DOM 结构的重建，只更新已有元素的 `textContent`

### 改表格
- 路由：`renderRow()` 第 1013-1033 行
- 表头 HTML 写死在 `.table-header` 里，列数必须和 `renderRow` 的 grid 列数一致
- 当前 10 列：`48px 1fr 70px 65px 65px 65px 100px 65px 85px 80px`

## 部署路径

| 位置 | 路径 |
|------|------|
| 服务器 | `root@107.172.231.70:/opt/komari/data/theme/NodeGetGlass/dist/` |
| GitHub | `https://github.com/newemperor221/nodeget-komari-theme` |
| 访问地址 | `http://stat.357561.xyz` |

## 已知的敏感逻辑

1. **汇率获取是异步的**：首次渲染用默认值 6.84，异步更新后 DOM 会闪一下
2. **30s 刷新**：`setInterval(render, 30000)` 会重新渲染整个列表
3. **detail.html 视频**：直接 `video.style.opacity = '1'`（无 fade 动画）
4. **表格 hover**：`transform: scale(1.02)` 会产生涟漪效应，介意可去掉
5. **nodes-grid min-height**：`calc(100vh - 380px)` 固定了底部栏，任何改导航栏高度的操作都可能需要同步修改
