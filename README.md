# GalaxyGlass

> 银河玻璃 — Komari 监控面板主题
> 深空蓝黑 · 翠绿点缀 · 毛玻璃特效 · Next.js + React 19

![Preview](preview.png)

## Screenshots

| 桌面端 | 移动端 |
|--------|--------|
| ![Desktop](screenshot-desktop.png) | ![Mobile](screenshot-mobile.png) |

## 特性

- **深空蓝黑毛玻璃 UI** — `#0e152e` 底色 + 翠绿 `#10b981` 点缀，三层背景深度
- **动态视频壁纸** — poster+video 双层过渡，桌面端视频 / 移动端海报
- **响应式卡片网格** — 从单列到四列自适应，移动端搜索栏折叠展开
- **实时 stats 栏** — 在线节点数 / 总流量 + 瞬时速率 / 剩余价值 + 总价值
- **区域筛选** — 滑动 snap 吸附 + 弹簧动画指示器
- **详情页** — 双列系统信息 + 计费芯片 + 3 个实时图表（CPU/内存/网络）
- **Squircle 圆角** — Figma 风格连续曲线 Apple 圆角，匹配 CSS token
- **Next.js 静态导出** — 零运行时依赖，纯静态托管

## 项目结构

```
galaxy-glass/
├── deploy.sh              # 一键构建 + 部署脚本
├── nextjs/                # Next.js 源码 + 构建输出
│   ├── src/app/           # 路由页面 (page.tsx, detail/page.tsx)
│   ├── src/components/    # UI 组件 (Background, NodeCard, ParticleBackground)
│   ├── src/lib/           # API 客户端 + 工具函数
│   ├── out/               # 构建产物 (next build 输出)
│   └── package.json       # Next.js 16.2.6 + React 19 + Tailwind 4
├── src/                   # 旧版静态源码（存档备份）
├── svelte/                # Svelte 迁移实验版
├── README.md
└── preview.png
```

## 部署

### 前置条件

- Komari 服务器（运行中）
- SSH 密钥接入 Komari 宿主机

### 一键部署

```bash
./deploy.sh
```

自动执行：`next build` → 打包 `out/` → SCP 上传 → 解压覆盖主题目录

### 手动部署

```bash
cd nextjs
npm run build
scp -r out/* root@<server>:/opt/komari/data/theme/
```

### 架构说明

线上服务由 `galaxy-proxy.py` 驱动：

```
浏览器 → Cloudflare → galaxy-proxy.py(:25774)
                          ├── /_next/* → 静态文件
                          ├── / → index.html (Next.js)
                          ├── /api/* → 转发 Komari(:25776)
                          └── /detail → 详情页 SPA
```

## 数据字段

| 卡片字段 | 来源 | 说明 |
|----------|------|------|
| CPU | `cpu` | 百分比 |
| 内存 | `memory_used / memory_total` | 已用量 / 总量 |
| 磁盘 | `disk_used / disk_total` | 已用量 / 总量 |
| 下行 | `network_in` | 瞬时速率 (B/s) |
| 上行 | `network_out` | 瞬时速率 (B/s) |
| 运行 | `uptime` | 秒数 → 显示天/时 |
| 价格 | `price / billing_cycle` | 含币种和周期 |
| 到期 | `expired_at` | 剩余天数计算 |
| 标签 | `tags` | 自定义标签 |

## 技术栈

- **Next.js 16** + **React 19** — 框架层，静态导出
- **Tailwind CSS 4** — 原子化样式
- **Framer Motion** — 页面过渡动画
- **Lucide Icons** — SVG 图标集
- **Canvas 图表** — DPR 适配，端点圆点 + 渐变填充
- **毛玻璃效果** — `backdrop-filter: blur(80px)`, 多层玻璃系统
- **Squircle 圆角** — `figma-squircle` 算法，SVG clip-path
- **API** — Komari REST API (`/api/nodes`, `/api/recent/{uuid}`)

## 构建产出

```
next build → out/
  ├── index.html         (16KB — 首页)
  ├── detail.html        (9KB — 详情页)
  ├── _next/static/      (JS/CSS chunks, ~1MB)
  ├── 404.html           (自定义 404)
  └── favicon.ico + SVG 资源
```

**编译后共 46 个文件，合计 ~1.1MB**

## 相关项目

- [Komari](https://github.com/komari-monitor/komari) — 服务器监控面板后端

## 许可证

MIT © M78 星云
