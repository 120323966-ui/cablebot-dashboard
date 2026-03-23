/**
 * voiceIntents — 语音指令意图匹配 v5
 *
 * 覆盖首页 + Command 页所有指令。
 * 中文数字变体（B三）已内置。
 */

/* ── Types ── */

export interface VoiceIntent {
  action: string
  label: string
  param?: string
}

/* ── 意图规则表 ── */

interface IntentRule {
  keywords: string[]
  action: string
  label: string
  param?: string
}

const INTENT_RULES: IntentRule[] = [
  // ══════════════════════════════════════
  // ── 区段聚焦（阿拉伯+中文+全角） ──
  // ══════════════════════════════════════
  { keywords: ['a1', 'a一', 'a１'], action: 'FOCUS_SEGMENT', label: '已聚焦 A1 区段', param: 'A1' },
  { keywords: ['a2', 'a二', 'a２'], action: 'FOCUS_SEGMENT', label: '已聚焦 A2 区段', param: 'A2' },
  { keywords: ['b1', 'b一', 'b１'], action: 'FOCUS_SEGMENT', label: '已聚焦 B1 区段', param: 'B1' },
  { keywords: ['b2', 'b二', 'b２'], action: 'FOCUS_SEGMENT', label: '已聚焦 B2 区段', param: 'B2' },
  { keywords: ['b3', 'b三', 'b３'], action: 'FOCUS_SEGMENT', label: '已聚焦 B3 区段', param: 'B3' },
  { keywords: ['c1', 'c一', 'c１'], action: 'FOCUS_SEGMENT', label: '已聚焦 C1 区段', param: 'C1' },
  { keywords: ['c2', 'c二', 'c２'], action: 'FOCUS_SEGMENT', label: '已聚焦 C2 区段', param: 'C2' },
  { keywords: ['c3', 'c三', 'c３'], action: 'FOCUS_SEGMENT', label: '已聚焦 C3 区段', param: 'C3' },

  // ══════════════════════════════════
  // ── 任务控制 ──
  // ══════════════════════════════════
  {
    keywords: ['暂停', '停止任务', '暂停任务', '暂停巡检', '停一下', '先停'],
    action: 'PAUSE_MISSION',
    label: '已暂停巡检',
  },
  {
    keywords: ['继续', '恢复', '恢复任务', '继续巡检', '继续任务'],
    action: 'RESUME_MISSION',
    label: '已恢复巡检',
  },
  {
    keywords: ['急停', '紧急停止', '紧急', 'emergency'],
    action: 'EMERGENCY_STOP',
    label: '已触发急停',
  },

  // ══════════════════════════════════
  // ── 驾驶模式 ──
  // ══════════════════════════════════
  {
    keywords: ['切换自动', '自动模式', '自动驾驶', '自动巡检'],
    action: 'MODE_AUTO',
    label: '已切换自动模式',
  },
  {
    keywords: ['切换手动', '手动模式', '手动接管', '人工接管', '接管'],
    action: 'MODE_MANUAL',
    label: '已切换手动模式',
  },
  {
    keywords: ['半自动', '半自动模式'],
    action: 'MODE_SEMI',
    label: '已切换半自动模式',
  },

  // ══════════════════════════════════
  // ── 设备控制 ──
  // ══════════════════════════════════
  {
    keywords: ['开灯', '打开灯光', '灯光开', '开照明'],
    action: 'LIGHT_ON',
    label: '已开启灯光',
  },
  {
    keywords: ['关灯', '关闭灯光', '灯光关', '关照明'],
    action: 'LIGHT_OFF',
    label: '已关闭灯光',
  },
  {
    keywords: ['开始录制', '开始录像', '录制', '开录'],
    action: 'RECORDING_ON',
    label: '已开始录制',
  },
  {
    keywords: ['停止录制', '停止录像', '停录'],
    action: 'RECORDING_OFF',
    label: '已停止录制',
  },
  {
    keywords: ['稳定', '开启稳定', '打开稳定', '防抖'],
    action: 'STABILIZATION_ON',
    label: '已开启画面稳定',
  },
  {
    keywords: ['关闭稳定', '关防抖'],
    action: 'STABILIZATION_OFF',
    label: '已关闭画面稳定',
  },

  // ══════════════════════════════════
  // ── 辅助视角 ──
  // ══════════════════════════════════
  {
    keywords: ['打开后视', '后视镜', '后方', '后视视角'],
    action: 'AUX_REAR_ON',
    label: '已打开后视视角',
  },
  {
    keywords: ['关闭后视', '关后视'],
    action: 'AUX_REAR_OFF',
    label: '已关闭后视视角',
  },
  {
    keywords: ['打开放大', '局部放大', '放大视角', '放大'],
    action: 'AUX_ZOOM_ON',
    label: '已打开局部放大',
  },
  {
    keywords: ['关闭放大', '关放大'],
    action: 'AUX_ZOOM_OFF',
    label: '已关闭局部放大',
  },

  // ══════════════════════════════════
  // ── 视觉模式 ──
  // ══════════════════════════════════
  {
    keywords: ['切换热成像', '热像', '红外', '热成像'],
    action: 'TOGGLE_THERMAL',
    label: '已切换热成像模式',
  },
  {
    keywords: ['截图', '截图保存', '保存截图', '抓拍'],
    action: 'CAPTURE_SCREENSHOT',
    label: '已截图保存',
  },
  {
    keywords: ['标记异常', '标记', '标注'],
    action: 'MARK_ANOMALY',
    label: '已标记异常',
  },

  // ══════════════════════════════════
  // ── 页面导航 ──
  // ══════════════════════════════════
  {
    keywords: ['打开告警', '查看告警', '告警详情', '告警列表', '告警页'],
    action: 'NAV_ALERTS',
    label: '→ 跳转至告警页',
  },
  {
    keywords: ['进入巡检', '实时巡检', '进入指挥', '打开指挥', '指挥页'],
    action: 'NAV_COMMAND',
    label: '→ 跳转至实时巡检',
  },
  {
    keywords: ['查看空间', '空间定位', '三维', '3d', '打开空间'],
    action: 'NAV_SPATIAL',
    label: '→ 跳转至空间定位',
  },
  {
    keywords: ['导出报告', '生成报告', '报告页', '打开报告', '导出日报'],
    action: 'NAV_REPORTS',
    label: '→ 跳转至报告生成',
  },
  {
    keywords: ['历史分析', '历史数据', '查看历史', '打开历史'],
    action: 'NAV_HISTORY',
    label: '→ 跳转至历史分析',
  },
  {
    keywords: ['返回首页', '回首页', '回到首页', '主页'],
    action: 'NAV_HOME',
    label: '→ 返回首页',
  },
]

/* ── 匹配函数 ── */

export function matchIntent(transcript: string): VoiceIntent | null {
  const text = transcript.trim().toLowerCase()
  if (!text) return null

  for (const rule of INTENT_RULES) {
    const matched = rule.keywords.some((kw) => text.includes(kw.toLowerCase()))
    if (!matched) continue

    return {
      action: rule.action,
      label: rule.label,
      param: rule.param,
    }
  }

  return null
}

/* ── 首页快捷指令 ── */

export const HOME_QUICK_COMMANDS = [
  '暂停任务',
  '聚焦 B3 区段',
  '打开告警详情',
  '进入实时巡检',
  '导出报告',
  '查看空间',
]

/* ── Command 页快捷指令 ── */

export const COMMAND_QUICK_COMMANDS = [
  '暂停巡检',
  '打开灯光',
  '切换热成像',
  '截图保存',
  '切换手动',
  '打开后视',
]
