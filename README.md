# Glass

> 玻璃 — Komari 监控面板主题
> 纯静态 HTML/CSS/JS · 毛玻璃特效 · 深空黑底色

## 特性

- **深空黑毛玻璃 UI** — `#0e152e` 底色 + 翠绿 `#10b981` 点缀
- **切面水晶 Logo** — 自定义 SVG 图标，favicon + 页眉同步
- **自托管 Inter 字体** — 5 个权重（300-700），零外部依赖，`font-display:swap`
- **动态视频壁纸** — poster+video 双层过渡，桌面端视频 / 移动端海报
- **响应式卡片网格** — 从单列到多列自适应，移动端搜索栏折叠展开
- **实时 stats 栏** — 在线节点数 / 总流量 / 瞬时速率 / 开销统计
- **区域筛选** — 滑动 snap 吸附 + 弹簧动画指示器
- **详情页** — 双列系统信息 + 计费芯片 + 3 个实时图表（CPU/内存/网络）
- **纯静态单文件** — 零框架，单 `dist/index.html` 所有样式+脚本内联

## 截图

![Glass 预览](preview.png)

## 项目结构

```
glass/
├── build.sh                # 从 src/ 编译单文件 index.html
├── deploy.sh               # 构建 + 部署到 Komari 面板（含字体同步）
├── release.sh              # 构建 + 打包 + GitHub Release 一键发布
├── komari-theme.json       # Komari 主题元数据（名称/版本/作者）
├── icon.svg                # 切面水晶 SVG 主题图标
├── preview.png             # 预览截图
├── README.md
└── src/
│   ├── index.html          # HTML 模板（含 {{CSS}} {{JS}} {{BODY}} 占位符）
│   ├── body.html           # HTML body 内容
│   ├── styles/             # ITCSS 分层
│   │   ├── settings.css    # CSS 变量 + Inter @font-face
│   │   ├── base.css        # 裸元素样式（reset + body/a/img）
│   │   ├── layout.css      # 页面骨架（navbar/container/grid/footer）
│   │   ├── components.css  # 可复用 UI 组件（card/search/filter/detail）
│   │   ├── states.css      # 状态覆盖（loading/error/paused）
│   │   ├── utilities.css   # 工具类（hidden/滚动条/动画）
│   │   ├── web.css         # 桌面端（≥640px）
│   │   └── mobile.css      # 手机端（≤800px）
│   └── scripts/
│       └── app.js          # 全部脚本（config/data/render/chart/events/logic）
└── fonts/                  # 自托管 Inter 字体（300/400/500/600/700）
```

## 开发流程

```bash
# 1. 修改 src/ 下的源文件
# 2. 编译为单文件 index.html
./build.sh

# 3. 部署到 Komari 面板（自动同步字体）
./deploy.sh
```

## Release（发布 Komari 主题包）

Glass 遵循 Komari 官方主题打包规范：

```
Glass-vX.Y.Z.zip
├── komari-theme.json      ← 主题元数据（Komari 管理后台识别）
├── icon.svg               ← 切面水晶 SVG 主题图标
├── preview.png            ← 预览截图
├── fonts/                 ← 自托管 Inter 字体
│   ├── Inter-300.ttf
│   ├── Inter-400.ttf
│   ├── Inter-500.ttf
│   ├── Inter-600.ttf
│   └── Inter-700.ttf
└── dist/
    └── index.html         ← 主题主页（所有 CSS/JS 内联）
```

一键发布：

```bash
./release.sh v1.1.0
```

脚本自动完成：
1. `build.sh` 编译 `src/` → `index.html`
2. 创建 `dist/index.html` + `fonts/` 结构
3. 打包为 `Glass-v1.1.0.zip`
4. 推 tag + GitHub Release（包含 zip 附件）

> 安装方式：登录 Komari 后台 → 设置 → 主题管理 → 上传主题 → 选择 zip

## 设计规范

| Token | 值 |
|---|---|
| accent | `#10b981` (翠绿) |
| accent-2 | `#818cf8` (靛蓝) |
| bg-deepest | `#020203` |
| bg-deep | `#050510` |
| bg-surface | `#0a0e1a` |
| glass-bg | `rgba(255,255,255,0.06)` |
| blur-glass | `60px` |
| radius-lg | `16px` (苹果圆角) |
| font-sans | `Inter` → 系统字体栈 |
| font-size | `14px` 基准 |

## 技术栈

- **纯静态** — 无框架，单 `dist/index.html` 部署
- **毛玻璃** — `backdrop-filter: blur()` + `rgba()` 多层叠加
- **实时图表** — Chart.js 4.4.7（CDN 加载，CPU/内存/网络三曲线）
- **视频壁纸** — poster+video 双元素，JS 控制切换动画
- **区域筛选** — CSS transition + JS 滑动指示器
- **自托管字体** — Inter 5 权重内联 @font-face，`font-display:swap`
- **自定义 Logo** — 切面水晶 SVG，favicon 内联 + 页眉同步
