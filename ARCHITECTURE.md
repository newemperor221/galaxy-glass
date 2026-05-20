# Glass 架构说明

## 项目结构

```
galaxy-glass/
├── build.sh               # 编译（src/ → index.html）
├── deploy.sh              # 编译 + 部署到 Komari
├── komari-theme.json      # Komari 主题配置
├── icon.svg
├── .gitignore
├── README.md
├── ARCHITECTURE.md        # ← 你在这里
└── src/
    ├── index.html         # HTML 模板（含 {{CSS}} {{JS}} {{BODY}} 占位符）
    ├── body.html          # HTML body 内容
    ├── styles/            # CSS（ITCSS 分层）
    │   ├── settings.css   # CSS 变量（配色、尺寸、字体令牌）
    │   ├── base.css       # 裸元素样式（body、a、img、重置）
    │   ├── layout.css     # 页面骨架（navbar、container、grid、footer）
    │   ├── components.css # 可复用 UI 组件（search、card、filter、detail、chart、toast…）
    │   ├── states.css     # 状态覆盖（loading、error、paused、online/offline）
    │   ├── utilities.css  # 工具类（.hidden、滚动条、动画）
    │   ├── web.css        # 桌面端覆盖（≥640px）
    │   └── mobile.css     # 手机端覆盖（≤800px）
    └── scripts/
        └── app.js         # 全部 JS（IIFE 封装，通用）
```

## CSS 架构：ITCSS（倒三角）

文件按 ITCSS 分层组织，从低特异性 → 高特异性：

```
settings.css      ← 最低特异性。CSS 变量，无实际输出
base.css           ← 元素选择器（body, a, *）。影响全局
layout.css         ← 页面骨架选择器（.navbar, .container, .footer）
components.css     ← 类选择器（.node-card, .stat-card, .search-box）。主要工作区
states.css         ← 状态覆盖（.is-active, .paused, .loading-state）
utilities.css      ← 最高特异性（.hidden, ::-webkit-scrollbar, @keyframes）
web.css            ← 桌面媒体查询（min-width: 640px）
mobile.css         ← 手机媒体查询（max-width: 800px）
```

### 构建顺序

`build.sh` 按上述顺序拼接 → 内联到 `index.html`，保证层叠正确。

### 命名规范

类名使用 BEM 风格变体：
- `.search-box` — 区块
- `.search-box.open` — 区块 + 状态修饰符
- `.node-card:hover` — 伪类状态
- `.card-metric .cm-bar .cm-fill.low` — 层级关系

## JS 架构

所有 JS 在一个 `app.js` 中，以 IIFE 包裹：
- 配置 + 工具函数（flagEmoji、bytes、uptime、debounce）
- 数据获取（fetchJSON、loadData、定时轮询）
- DOM 渲染（render、renderCard、renderFilters、renderDetailView）
- 图表（Canvas 实时曲线）
- 事件绑定（search、sort、filter、detail、back-to-top）
- 连接心跳 + 在线人数

不分文件的原因：原始代码是单一 IIFE，函数间共享闭包变量，强行拆分反而容易出 bug。

## 开发流程

```
1. 修改 src/styles/*.css   → 改某个组件的样式
2. 修改 src/scripts/app.js → 改逻辑或数据
3. 修改 src/body.html      → 改 HTML 结构
4. ./build.sh              → 编译为根目录 index.html
5. ./deploy.sh             → 编译 + 上传到波兰服务器
```

### 快速指南

| 想改什么 | 改哪个文件 |
|---------|-----------|
| 颜色/字体 | `settings.css` |
| 元素的默认样式 | `base.css` |
| 导航栏/页脚布局 | `layout.css` |
| 卡片/搜索/筛选/图表 | `components.css` |
| 加载/错误/暂停状态 | `states.css` |
| 工具类/滚动条/动画 | `utilities.css` |
| 桌面端布局优化 | `web.css` |
| 手机端自适应 | `mobile.css` |
| JavaScript 逻辑 | `app.js` |
| HTML 结构 | `body.html` |

## 部署架构

```
用户浏览器 → stat.357561.xyz
   ↓ Cloudflare CDN（缓存、加速）
   ↓ cloudflared tunnel
   ↓ 波兰服务器 :25774
   ↓ Komari 1.2.0
   ↓ /opt/komari/data/theme/Glass/dist/index.html
```

`deploy.sh` 通过 SCP 上传到波兰服务器的 `Glass/dist/`，并同步到 `theme/` 根目录。

## 记忆要点

1. **只改 src/ 下的文件**，根目录 index.html 是编译产物
2. **CSS 加法原则**：新样式先找是否已有类名，不要重复写
3. **settings.css 改完要全局搜引用**：变量名改了，用到的地方都得改
4. **web.css / mobile.css 只写覆盖**：公共样式放 layout/component，不要两边都写一遍
