# GalaxyGlass

> 银河玻璃 — Komari 监控面板主题

![Preview](preview.png)

## 特性

- **深色毛玻璃 UI** — 银河星空背景 + 高斯模糊卡片
- **动态视频壁纸** — 移动端/桌面端分别适配海报图
- **10 列节点表格** — 名称 / CPU / 内存 / 磁盘 / 下行 / 上行 / 运行时间 / 价格 / 总流量 / 剩余天数
- **实时 Stats 栏** — 总流量 | 网络速率 / 总价值 | 剩余价值，双列 delta 速率计算
- **纯前端单文件** — 无需构建，直接部署

## 主题包结构

```
theme.zip
├── komari-theme.json    # 主题配置
├── preview.png          # 预览图
└── dist/
    └── index.html       # 主页面模板
```

## 部署

1. 下载 release 中的 `theme.zip`
2. 在 Komari 管理面板上传主题包

或者手动部署：

```bash
scp dist/index.html root@<server>:/opt/komari/data/theme/GalaxyGlass/dist/index.html
```

## 数据字段参考

| 列名 | 字段 | 说明 |
|------|------|------|
| CPU | `cpu` | 百分比 |
| 内存 | `memory_used / memory_total` | 已用量 / 总量 |
| 磁盘 | `disk_used / disk_total` | 已用量 / 总量 |
| 下行 | `network_in` | 瞬时速率 (B/s) |
| 上行 | `network_out` | 瞬时速率 (B/s) |
| 运行 | `uptime` | 秒数 → XX天XX小时 |
| 价格 | `price / billing_cycle` | ¥价格/月或年 |
| 总流量 | `network_total_transmitted / network_total_received` | 累计上下行总量 |
| 剩余天数 | `expired_at` | 距离到期天数 |

## 相关项目

- [Komari](https://github.com/komari-monitor/komari) — 服务器监控面板后端

## 许可证

MIT
