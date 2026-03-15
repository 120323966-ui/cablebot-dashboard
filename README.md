# Cablebot Dashboard

面向“电缆排管巡检机器人”毕业设计的 PC 监控端工程化前端脚手架。

当前交付重点：
- 已完成 **PC 首页总览** 的高保真工程化实现
- 已预留另外五个页面的路由与布局壳层：实时巡检、告警处置、空间定位 / 3D、历史分析、报告生成
- 使用 **Vite + React + TypeScript + Tailwind CSS v4**
- 使用 **MSW** 模拟首页 REST 接口
- 使用浏览器内定时推送模拟实时数据刷新
- 使用 **ECharts** 展示首页趋势图

## 环境要求

建议 Node.js 20.19+。

## 启动方式

```bash
npm install
npm run msw:init
npm run dev
```

浏览器打开终端提示的本地地址，通常为：

```bash
http://localhost:5173
```

## 构建

```bash
npm run build
npm run preview
```

## 目录说明

```text
src/
  components/
    layout/           # 侧边导航、顶部栏、布局壳层
    ui/               # 通用 Card / Badge / Button / ConfirmDialog
  hooks/              # 首页数据请求与实时推送模拟
  mocks/              # MSW mock 接口与首页 mock 数据
  pages/
    HomeOverview/     # 首页总览高保真页面
    Placeholder/      # 其余页面占位页
  router/             # 路由配置
  styles/             # Tailwind + 全局主题样式
  types/              # 数据类型定义
```

## 说明

这个工程是“可运行的前端脚手架”，不是完整生产系统。要继续落地，需要后续接入：
- 真实后端 API
- 实时消息通道（WebSocket / SSE）
- 视频流服务
- 3D 管网数据与 GIS 地图能力
- 语音识别或 LLM 指令解析服务


## Windows install note

If you downloaded a previous package and saw install attempts going to an internal `packages.applied-caas...` URL, that came from a contaminated `package-lock.json`. This fixed package removes the lockfile and pins npm to the public registry via `.npmrc`.
