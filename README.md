# Cablebot Dashboard

电缆排管巡检机器人监控调度系统的 Web 前端。

本系统是配合发明专利《一种电缆排管巡检机器人监控调度方法》落地的具体实施载体。专利方法围绕"管线拓扑模型 + 机器人运动模型"两层基础模型展开，从传感器告警接入、重复抑制、分级研判，到行进策略协同与自动急停，构成一条端到端的人机协同闭环。本前端把这条闭环以可视化、可交互、可演示的形态完整呈现出来。

## 系统功能

整个系统覆盖六个页面，按操作员的工作流串联：

- **首页总览**：机器人车队总览、KPI 看板、热力图、当前任务条、实时告警流。
- **实时巡检（命令中心）**：主视频窗口、机器人姿态/速度/电量遥测、底部控制面板（巡检模式切换、急停、调速）、行进策略协同卡、语音控制台、自动急停红色横幅。
- **告警处置**：告警列表与筛选、单条告警详情、三维度分级依据展示（本体阈值 / 邻段同类 / 持续恶化趋势）、多源研判卡、区段微缩图。
- **空间定位**：管线拓扑视图、机器人位置实时图标、传播链可视化、剖面视图、点云视图、机器人调度面板。
- **历史分析**：跨日/跨段事件时间线。
- **报告生成**：基于历史数据自动生成日报。

下面的"核心机制"一节会把上述页面背后的几条关键算法和数据通道讲清楚。

## 系统架构

```
                        ┌─────────────────────────────────────┐
                        │   DashboardContext（全局状态层）     │
                        │  ─────────────────────────────────  │
                        │  · alerts 全量告警列表               │
                        │  · robots 机器人运动模型快照         │
                        │  · controlAuthority 控制权状态       │
                        │  · autoEstopEvent 自动急停事件       │
                        │  · 重复抑制映射（双重判据）          │
                        │  · dispatchCommand 控制指令通道       │
                        └─────────────────────────────────────┘
                          ▲                ▲                ▲
            读 alerts/topo │   读 robots /  │  读 events    │
            写 dispatch    │   write robots │  + dispatch   │
                          │                │                │
              ┌───────────┴──┐   ┌────────┴────────┐   ┌───┴────────┐
              │  告警相关页面 │   │  实时巡检页面    │   │  空间页面   │
              │  Alerts /    │   │  Command Page   │   │  Spatial   │
              │  AlertGrade  │   │                 │   │            │
              └──────────────┘   └─────────────────┘   └────────────┘
                          ▲
                          │  推送 ALERT_NEW / ROBOT_PULSE
                          │
                ┌─────────┴────────────┐
                │  useRealtimeDashboard │   ← 浏览器内定时器，
                │   （MSW + 模拟实时）  │      模拟监测设备/移动巡检数据接入
                └──────────────────────┘
```

数据从底层（mocks/data + utils/topology）流向顶层（DashboardContext），再分发到各页面消费。所有"修改全局状态"的操作（确认告警、下发指令、清除自动急停事件）都回流到 context，保证多页面间的状态一致。

## 核心机制

### 一、管线拓扑模型（utils/topology.ts）

整个系统唯一的拓扑数据源。区段以 `fromNode → toNode` 节点对方式描述，支持分支拓扑。`getNeighbors(segmentId)` 返回上下游邻接段，`hasConsecutiveNeighborsWithAlert` 提供"沿拓扑路径连续 N 段存在某条件"的检索能力。

凡是涉及"邻段"判定的代码都从这里查：

- 告警分级第二维度（`pages/Alerts/AlertGradingBasis.tsx`）按邻接表查询邻段同类告警，分支拓扑下能正确覆盖多条路径。
- AI 综合研判（`utils/aiJudgment.ts`）按邻接表判定上下游扩散模式。
- 行进策略派生（`utils/movementStrategy.ts`）"前方一个 critical → 减速""前方连续两段高等级 → 停止"两档规则均走拓扑路径。
- 空间页传播链 BFS（`utils/propagation.ts`）按异常类型走对应方向（thermal/gas 双向、water/moisture 仅下游）。

### 二、机器人运动模型（context/DashboardContext.tsx）

机器人状态作为 context 全局共享，包含：当前所在区段、区段内里程比例、行进方向、行进速度、运行状态（moving/idle/emergency）。状态变更通过"控制指令对象"对应：

```
操作员/系统 → dispatchCommand(RobotControlCommand) → applyRobotCommand → setRobots
                                                                          │
                                          context 1.5s 推进 advanceRobot ──┘
                                                                          │
                                              ROBOT_PULSE 推送 ──────────┘
```

控制指令分为五种 `action`：`continue / slow / stop / emergency-stop / move-to`。所有 UI 控件（底部急停按钮、空间页机器人调度面板、行进策略确认按钮、自动急停判定）都走同一通道，不直接修改 robot state。

### 三、重复告警抑制双重判据

`DashboardContext.tsx` 中告警接入时按 groupKey（区段 + 类型）查抑制表，**只有同时满足以下三个条件才抑制**：

1. 距上次通知时间小于 `SUPPRESSION_WINDOW_MS`（60 秒）
2. 采集源空间位移小于当前区段长度的 30%（按区段实际长度自适应，跨段必不抑制）
3. 严重程度未升级

任一条件不满足即重新通知。位移基准取自机器人运动模型的实时位置（移动巡检数据），或固定传感器的部署位置。这是专利权利要求 1、3 的核心算法。

### 四、告警三维度分级

`pages/Alerts/AlertGradingBasis.tsx` 展示每条告警的分级依据：

- **本体阈值**：监测值与异常类型阈值表（`utils/alertParams.ts`）的关系。
- **邻段同类**：通过拓扑查询上下游邻段是否存在同类未关闭告警，并标记是否触发"拓扑连续 → 直升高等级"。
- **持续恶化趋势**：序列长度 N、连续恶化次数 M、恶化比例阈值，按异常类型独立配置。

异常类型阈值表（thermal/water/gas/moisture/structural/vibration/comm/lighting）集中在 `utils/alertParams.ts`，对应专利说明书表 1。

### 五、行进策略协同

`utils/movementStrategy.ts` 派生策略，`pages/Command/MovementStrategyCard.tsx` 呈现交互。优先级表（对应专利说明书第 0190 段）：

```
当前段 critical → stop
当前段 warning → slow
前方拓扑路径连续两段及以上高等级 → stop
前方一个 critical → slow
前方一个 warning → slow（低速观察）
```

卡片有完整的执行反馈三态：

- **pending**：待操作员确认。
- **executing**：已确认下发指令，监听机器人状态。
- **done**：达到目标状态（speedKmh、status、controlAuthority），显示"已生效"绿色徽章后自动消失。
- **timeout**：5 秒未达成目标，显示红色警示，操作员手动关闭。

忽略复现机制：忽略后的策略并非永久屏蔽，超过 3 分钟自动复现；关联告警严重程度变化（升级或降级）即时复现；关联告警全部 closed 自动失效。

### 六、自动急停（专利权利要求 9）

监测值越过异常类型紧急阈值时，系统**不等待操作员确认**自动下发急停指令，对应专利权利要求 9。触发链路：

```
监测值 ≥ params.thresholds.emergency
    ↓
DashboardContext 写入 autoEstopEvent
    ↓
红色横幅出现在视频顶部（AutoEstopBanner）
    ↓
语音播报"系统已自动急停"（announceAutoEstop）
    ↓
焦点机器人 → emergency 状态，controlAuthority → 'emergency'
    ↓
行进策略卡片自动隐藏（操作员注意力应在恢复急停上）
    ↓
急停期间新到来的紧急告警走守卫，不再重复触发
```

恢复路径：操作员点横幅"恢复行进"或底部急停按钮，一次点击即清除事件、机器人恢复运行。

### 七、传播链可视化

空间页选中告警后，BFS 遍历拓扑生成传播链。BFS 起点是告警所在区段，方向由异常类型决定（thermal/gas 双向、water/moisture 仅下游、结构/振动/通信/照明仅本段），跳数与同类告警过滤共同决定链长。这是专利权利要求 5 的具体实施方式。

## 技术栈

- **Vite 7 + React 19 + TypeScript**：构建与运行时。
- **Tailwind CSS 4**：原子化样式。
- **MSW**：浏览器内 mock 后端 REST 接口。
- **ECharts + recharts**：图表（首页趋势、告警热力图）。
- **Three.js**：空间页点云视图。
- **lucide-react**：图标。
- **React Router 7**：页面路由。

实时通道目前使用浏览器内 setInterval 模拟"定时推送"。生产部署时可替换为 WebSocket / SSE，无需改动业务层——`useRealtimeDashboard.ts` 是唯一的接入点。

## 环境与启动

环境要求：Node.js 20 或更高。

```bash
npm install
npm run dev
```

打开浏览器到 `http://localhost:5173/` 即可。如果国内网络拉依赖慢，可切镜像：

```bash
npm config set registry https://registry.npmmirror.com
npm install
```

构建生产版本：

```bash
npm run build
npm run preview
```

## 演示参数

为了方便答辩演示和功能验证，几个关键常量集中列出，可直接修改：

| 文件 | 常量 | 默认值 | 含义 |
|------|------|--------|------|
| `mocks/data/sharedSeed.ts` | `EMERGENCY_PROBABILITY` | `0.05` | 紧急阈值告警出现概率，调到 `0.3` 演示自动急停时更频繁 |
| `hooks/useRealtimeDashboard.ts` | 第 184 行 setInterval | `10_000` | 实时告警生成间隔，单位毫秒 |
| `context/DashboardContext.tsx` | `SUPPRESSION_WINDOW_MS` | `60_000` | 重复抑制时间窗 |
| `context/DashboardContext.tsx` | `DISPLACEMENT_RATIO` | `0.30` | 位移阈值占区段长度的比例 |
| `pages/Command/CommandPage.tsx` | `DISMISS_TTL_MS` | `3 * 60 * 1000` | 行进策略忽略后多久自动复现 |
| `pages/Command/MovementStrategyCard.tsx` | `EXEC_TIMEOUT_MS` | `5000` | 策略执行超时时间 |

## 目录结构

```
src/
├─ components/
│   ├─ layout/         # 侧边导航、顶部栏、 Shell 布局
│   └─ ui/             # 通用 Card / Badge / Button / Dialog
├─ context/
│   ├─ DashboardContext.tsx     # 全局状态 Provider（告警/机器人/急停事件/抑制表）
│   ├─ dashboardContextCore.ts  # context 类型定义与常量
│   └─ useDashboardContext.ts   # 消费 hook
├─ hooks/
│   ├─ useRealtimeDashboard.ts  # 实时通道，唯一的告警生成定时器
│   ├─ useRealtimeCommandCenter.ts  # Command 页 ROBOT_PULSE 通道
│   ├─ useSpatial.ts            # 空间页数据 + 调度操作（走 dispatchCommand）
│   ├─ useAlerts.ts             # 告警处置页数据
│   ├─ useDashboardHome.ts      # 首页数据
│   ├─ useHistory.ts useReports.ts useFreshness.ts
│   ├─ useVoiceEngine.ts        # 浏览器原生语音识别封装
│   └─ useKeyboardShortcuts.ts  # 全局快捷键
├─ mocks/
│   ├─ browser.ts handlers.ts   # MSW 拦截器
│   └─ data/
│       ├─ sharedSeed.ts        # 共享种子（机器人初始状态、模板告警池、紧急告警池）
│       ├─ spatial.ts           # 空间页数据（节点、区段、传感器）
│       ├─ alerts.ts dashboardHome.ts commandCenter.ts history.ts reports.ts
│       └─ constants.ts         # 区段标签、机器人 ID 等常量
├─ pages/
│   ├─ HomeOverview/  # 首页总览
│   ├─ Command/       # 实时巡检（命令中心）
│   │   ├─ CommandPage.tsx              主控
│   │   ├─ CenterVideoStage.tsx         主视频
│   │   ├─ MovementStrategyCard.tsx     行进策略协同卡（执行三态）
│   │   ├─ AutoEstopBanner.tsx          自动急停红色横幅
│   │   ├─ BottomControlDock.tsx        底部控制面板
│   │   ├─ RightCommandRail.tsx         右侧任务/事件栏
│   │   ├─ CommandVoiceDock.tsx         语音控制台
│   │   └─ TunnelSimulation.tsx         隧道实景
│   ├─ Alerts/        # 告警处置
│   │   ├─ AlertList.tsx AlertDetail.tsx
│   │   ├─ AlertGradingBasis.tsx        三维度分级依据
│   │   └─ MultiSourceJudgmentCard.tsx  多源研判
│   ├─ Spatial/       # 空间定位
│   │   ├─ PipelineMap.tsx              管线拓扑 + 传播链
│   │   ├─ RobotControlPanel.tsx        机器人调度
│   │   ├─ PointCloudView.tsx CrossSectionView.tsx
│   │   └─ SpatialInfoPanel.tsx
│   ├─ History/       # 历史分析
│   └─ Reports/       # 报告生成
├─ router/            # React Router 配置
├─ styles/            # Tailwind 全局
├─ types/             # 数据类型定义
└─ utils/
    ├─ topology.ts            # 管线拓扑模型 SSOT
    ├─ alertParams.ts         # 异常类型参数表（说明书表 1）
    ├─ propagation.ts         # 传播链 BFS
    ├─ movementStrategy.ts    # 行进策略派生
    ├─ aiJudgment.ts          # AI 综合研判
    ├─ voiceAudio.ts          # 语音播报（含告警通报与急停播报）
    └─ voiceIntents.ts        # 语音指令意图解析
```

## 与专利权利要求的对应关系

| 权利要求 | 实现位置 |
|---------|---------|
| 1：双重判据重复抑制 + 三维度分级 | `DashboardContext` 抑制表、`AlertGradingBasis` |
| 3：抑制条件细化 | `DashboardContext` `isDisplacementWithinThreshold` |
| 4：拓扑路径连续判定（覆盖分支） | `utils/topology` `hasConsecutiveNeighborsWithAlert`，应用于分级与策略 |
| 5：传播链可视化 | `utils/propagation` + `pages/Spatial/PipelineMap` |
| 7：全局共享状态 | `DashboardContext` 提升至 ShellLayout 层 |
| 9：自动急停 | `DashboardContext` ALERT_NEW 分支 + `AutoEstopBanner` + `announceAutoEstop` |

## 后续工程化方向

本前端是专利方法的可演示载体，距离生产系统还有以下工作：

- 后端 API：当前 MSW 拦截的 REST 路由替换为真实服务。
- 实时通道：`useRealtimeDashboard` 内的 setInterval 替换为 WebSocket / SSE。
- 视频流：当前 `CenterVideoStage` 使用占位画面，生产环境需接入 RTSP/WebRTC 网关。
- 3D / GIS：空间页点云视图当前是 Three.js mock，需接入真实激光雷达数据或 GIS 系统。
- LLM 研判：`utils/aiJudgment.ts` 当前是规则引擎，可接入大模型 API 增强语义理解（专利权利要求 8 的延伸）。
- 数据持久化：当前所有状态在内存中，刷新即丢失，需接入数据库与事件存储。
