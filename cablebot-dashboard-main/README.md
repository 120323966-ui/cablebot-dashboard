# Cablebot Dashboard

面向"电缆排管巡检机器人"毕业设计的 PC 监控端前端工程。

## 当前进度

六个核心页面已全部完成高保真实现，不再是"首页 + 占位壳"的阶段：

- **首页总览（/overview）**：KPI 条、机队面板、告警流、热力图、任务条、状态栏
- **指挥中心（/command）**：前视相机模拟画面、运动策略、底部控制台、右侧指令栏、语音指令面板
- **告警处置（/alerts）**：告警列表、详情、多源研判卡、分级依据、所在管段缩略图
- **空间定位 / 3D（/spatial）**：管网拓扑图、点云三维视图、横截面视图、机器人控制面板、空间信息面板
- **历史分析（/history）**：事件时间线、按区间统计的趋势图
- **报告生成（/reports）**：日报 / 周报 / 月报视图，含图表与可导出结构

## 技术栈

- **Vite 7 + React 19 + TypeScript 5.9**
- **Tailwind CSS v4**（通过 `@tailwindcss/vite` 插件）
- **React Router v7** 做路由
- **MSW** 模拟全部六个页面的 REST 接口（`/api/dashboard/*`）
- **ECharts**（`echarts-for-react`）用于首页、历史、报告页的图表
- **Three.js**（含 `OrbitControls`）用于 3D 点云可视化
- **Web Speech API**（识别 + TTS）用于指挥中心的语音指令与播报
- 浏览器内定时器模拟实时数据推送（传感器 patch、新告警等）
- 跨页面状态走 React Context（`DashboardContext`）

## 环境要求

建议 Node.js 20.19+。

## 启动方式

```bash
npm install
npm run msw:init
npm run dev
```

`msw:init` 会把 `mockServiceWorker.js` 释放到 `public/`，dev 模式下 `main.tsx` 会自动启动 MSW，所有 `/api/dashboard/*` 请求都被 mock 接管。

打开终端提示的本地地址，通常为：

```
http://localhost:5173
```

## 构建与预览

```bash
npm run build
npm run preview
```

`build` 会先跑 `tsc -b` 做类型检查再出包。生产构建下不启用 MSW，因此预览或部署前需要把接口换成真实后端，否则页面会拿不到数据。

## 目录结构

```text
src/
  components/
    layout/             # ShellLayout、SideNav、TopBar
    ui/                 # Card / Badge / Button / ConfirmDialog / AlertToast
  context/              # DashboardContext，跨页面共享的机器人 / 告警 / 任务状态
  hooks/
    useDashboardHome.ts # 首页数据请求
    useCommandCenter.ts # 指挥中心数据请求
    useAlerts.ts        # 告警页数据请求
    useSpatial.ts       # 空间页数据请求
    useHistory.ts       # 历史页数据请求
    useReports.ts       # 报告页数据请求
    useRealtimeDashboard.ts      # 首页实时推送模拟
    useRealtimeCommandCenter.ts  # 指挥中心实时推送模拟
    useVoiceEngine.ts            # Web Speech 语音识别 + TTS 播报
    useRegisterVoiceKeys.ts      # 语音指令快捷键注册
    useKeyboardShortcuts.ts      # 全局键盘快捷键
    useFreshness.ts              # 数据新鲜度计时
  mocks/
    browser.ts          # MSW worker 入口
    handlers.ts         # 六个页面的 REST handlers
    data/               # 各页面 mock 数据生成器及 sharedSeed 共享种子
  pages/
    HomeOverview/       # 首页总览
    Command/            # 指挥中心
    Alerts/             # 告警处置
    Spatial/            # 空间定位 / 3D
    History/            # 历史分析
    Reports/            # 报告生成
    Placeholder/        # 早期占位组件，目前路由已不再使用
  router/               # 路由配置
  styles/               # Tailwind + 全局主题样式
  types/                # 各页面的数据类型定义
  utils/
    aiJudgment.ts       # 多源 AI 研判逻辑
    propagation.ts      # 故障传播链推演
    topology.ts         # 管网拓扑计算
    movementStrategy.ts # 机器人运动策略
    voiceIntents.ts     # 语音意图匹配
    voiceAudio.ts       # TTS 播报与提示音
    alertParams.ts      # 告警参数处理
```

## 模拟接口

MSW 当前暴露的接口（全部 GET）：

```
/api/dashboard/home
/api/dashboard/command?robotId=R1
/api/dashboard/alerts
/api/dashboard/spatial
/api/dashboard/history?days=30
/api/dashboard/reports?days=30
```

各页面的 mock 数据生成器在 `src/mocks/data/` 下，跨页面一致的机器人 / 管段 / 告警来自 `sharedSeed.ts`，避免不同页面之间数据相互打架。

## 还没接入的部分

这是一个可运行的前端工程，要进生产仍需要：

- 真实后端 API 替换 MSW
- 实时通道升级为 WebSocket / SSE，目前是浏览器定时器模拟
- 真实视频流接入，目前指挥中心是 Canvas 绘制的模拟前视画面
- 真实点云 / 管网 GIS 数据，目前是程序生成的几何
- 更强的 ASR / LLM 指令解析，目前用的是浏览器自带 Web Speech API + 关键词意图匹配
- 报告导出落地（PDF / Word），目前只到结构化预览

## Windows 安装注意事项

如果之前下载过旧包并看到 npm 尝试访问内部 `packages.applied-caas...` 源，那是被污染的 `package-lock.json` 造成的。当前包已删除该 lockfile，并通过 `.npmrc` 把 npm 锁到公开 registry。
