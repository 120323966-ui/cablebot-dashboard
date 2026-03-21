import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GripHorizontal } from 'lucide-react'
import type { PipeAlert, PipeSegment, CrossSectionSensor } from '@/types/spatial'

/* ═══════════════════════════════════════════════════
   Color utilities
   ═══════════════════════════════════════════════════ */

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v))
}
function lp(a: number, b: number, t: number) {
  return a + (b - a) * clamp01(t)
}
function nz(v: number, amp: number) {
  return v + (Math.random() - 0.5) * 2 * amp
}

/** Normalized temperature (0=20°C, 1=75°C) → RGB */
function tempRgb(t: number): [number, number, number] {
  t = clamp01(t)
  if (t < 0.33) {
    const p = t / 0.33
    return [lp(0.08, 0.12, p), lp(0.62, 0.72, p), lp(0.88, 0.5, p)]
  }
  if (t < 0.66) {
    const p = (t - 0.33) / 0.33
    return [lp(0.12, 0.95, p), lp(0.72, 0.78, p), lp(0.5, 0.1, p)]
  }
  const p = (t - 0.66) / 0.34
  return [lp(0.95, 1.0, p), lp(0.78, 0.18, p), lp(0.1, 0.05, p)]
}

function normT(c: number) {
  return clamp01((c - 20) / 55)
}

function sevStyle(s: string) {
  if (s === 'critical')
    return {
      border: 'rgba(244,63,94,0.45)',
      bg: 'rgba(15,23,42,0.92)',
      text: '#fda4af',
      dot: '#f43f5e',
    }
  if (s === 'warning')
    return {
      border: 'rgba(245,158,11,0.45)',
      bg: 'rgba(15,23,42,0.92)',
      text: '#fcd34d',
      dot: '#f59e0b',
    }
  return {
    border: 'rgba(56,189,248,0.45)',
    bg: 'rgba(15,23,42,0.92)',
    text: '#7dd3fc',
    dot: '#38bdf8',
  }
}

/* ═══════════════════════════════════════════════════
   Tunnel point cloud generation
   ═══════════════════════════════════════════════════ */

interface CloudResult {
  positions: Float32Array
  colors: Float32Array
  count: number
}

function generateTunnelCloud(
  seg: PipeSegment,
  alerts: PipeAlert[],
): CloudResult {
  const pts: number[] = []
  const cls: number[] = []

  const L = seg.length / 5 // 3D tunnel length (~50-62)
  const W = 4,
    H = 3
  const hw = W / 2,
    hh = H / 2
  const nt = normT(seg.temperatureC)
  const n = 0.055

  const push = (
    x: number,
    y: number,
    z: number,
    r: number,
    g: number,
    b: number,
  ) => {
    pts.push(x, y, z)
    cls.push(r, g, b)
  }

  /* ── Wall surface helper ── */
  const wallGrid = (
    fixedAxis: 'y' | 'z',
    fixedVal: number,
    uRange: [number, number],
    uCount: number,
    vRange: [number, number],
    vCount: number,
    dim: number,
  ) => {
    for (let i = 0; i < uCount; i++) {
      for (let j = 0; j < vCount; j++) {
        if (Math.random() < 0.06) continue // 6% dropout
        const u = nz(
          uRange[0] + (i / uCount) * (uRange[1] - uRange[0]),
          n,
        )
        const v = nz(
          vRange[0] + (j / vCount) * (vRange[1] - vRange[0]),
          n,
        )
        const f = nz(fixedVal, n * 0.6)
        const c = tempRgb(nz(nt, 0.04))
        if (fixedAxis === 'y') push(u, f, v, c[0] * dim, c[1] * dim, c[2] * dim)
        else push(u, v, f, c[0] * dim, c[1] * dim, c[2] * dim)
      }
    }
  }

  const pL = Math.ceil(L * 4)
  const pW = Math.ceil(W * 3)
  const pH = Math.ceil(H * 3)

  // Four walls — much darker to let cables stand out
  wallGrid('y', hh, [-L / 2, L / 2], pL, [-hw, hw], pW, 0.3)  // ceiling
  wallGrid('y', -hh, [-L / 2, L / 2], pL, [-hw, hw], pW, 0.35) // floor
  wallGrid('z', -hw, [-L / 2, L / 2], pL, [-hh, hh], pH, 0.4)  // left
  wallGrid('z', hw, [-L / 2, L / 2], pL, [-hh, hh], pH, 0.4)   // right

  /* ── Cable trays (3 levels × 2 sides) — brighter, more saturated ── */
  const trayYs = [-0.65, 0.1, 0.85]
  const cableRgb: [number, number, number][] = [
    [0.9, 0.18, 0.18],   // red cable — brighter
    [0.35, 0.35, 0.35],  // dark grey cable — lifted
    [0.95, 0.62, 0.1],   // orange cable — brighter
    [0.15, 0.45, 0.72],  // blue cable — more saturated
    [0.18, 0.7, 0.38],   // green cable — brighter
  ]
  for (const ty of trayYs) {
    for (let side = -1; side <= 1; side += 2) {
      const wz = side * hw
      for (let i = 0; i < pL * 1.4; i++) {
        const x = nz((i / (pL * 1.4)) * L - L / 2, n * 0.4)
        // Tray bracket — lighter metallic grey to stand out from dark walls
        push(x, nz(ty, n * 0.3), nz(wz - side * 0.3, n * 0.3), 0.42, 0.46, 0.52)
        for (let c = 0; c < 3; c++) {
          const cc =
            cableRgb[
              (Math.floor(ty * 3 + 10) + c + (side > 0 ? 2 : 0)) % 5
            ]
          push(
            x,
            nz(ty + 0.06 + c * 0.055, n * 0.2),
            nz(wz - side * (0.15 + c * 0.07), n * 0.2),
            cc[0],
            cc[1],
            cc[2],
          )
        }
      }
    }
  }

  /* ── Floor rails ── */
  for (let i = 0; i < pL * 2; i++) {
    const x = nz((i / (pL * 2)) * L - L / 2, n * 0.3)
    push(x, nz(-hh + 0.04, n * 0.15), nz(-0.55, n * 0.15), 0.22, 0.28, 0.32)
    push(x, nz(-hh + 0.04, n * 0.15), nz(0.55, n * 0.15), 0.22, 0.28, 0.32)
  }

  /* ── Ceiling light strip — brighter for spatial reference ── */
  for (let i = 0; i < pL; i++) {
    const x = nz((i / pL) * L - L / 2, n * 0.3)
    push(x, nz(hh - 0.04, n * 0.1), nz(0, n * 0.08), 0.65, 0.7, 0.78)
  }

  /* ── Segment-specific features ── */
  applyFeatures(seg, alerts, pts, cls, L, W, H, n, nt)

  return {
    positions: new Float32Array(pts),
    colors: new Float32Array(cls),
    count: pts.length / 3,
  }
}

/* ═══════════════════════════════════════════════════
   Per-segment features
   ═══════════════════════════════════════════════════ */

function applyFeatures(
  seg: PipeSegment,
  alerts: PipeAlert[],
  pts: number[],
  cls: number[],
  L: number,
  W: number,
  H: number,
  n: number,
  _nt: number,
) {
  const hw = W / 2,
    hh = H / 2
  const push = (
    x: number,
    y: number,
    z: number,
    r: number,
    g: number,
    b: number,
  ) => {
    pts.push(x, y, z)
    cls.push(r, g, b)
  }

  switch (seg.id) {
    /* A1: 标准段，无特殊特征 */

    case 'A2': {
      /* 积水区域 — 底部蓝色密集点 */
      for (let i = 0; i < 900; i++) {
        push(
          nz(L * (0.25 + Math.random() * 0.45) - L / 2, 0.25),
          -hh + Math.random() * 0.12,
          nz(0, hw * 0.65),
          0.04,
          0.18 + Math.random() * 0.12,
          0.65 + Math.random() * 0.25,
        )
      }
      break
    }

    case 'B1': {
      /* 温升段 — 壁面暖色 */
      for (let i = 0; i < 500; i++) {
        const x = (Math.random() - 0.5) * L
        const y = (Math.random() - 0.5) * H
        const z = (Math.random() - 0.5) * W
        if (Math.abs(z) > hw * 0.75 || Math.abs(y) > hh * 0.75) {
          push(x, y, z, 0.65 + Math.random() * 0.2, 0.48, 0.12)
        }
      }
      break
    }

    case 'B2': {
      /* 结构异常 — 30%处螺栓松动散落碎片点 */
      for (let i = 0; i < 350; i++) {
        push(
          nz(L * 0.3 - L / 2, 0.4),
          nz(-hh + 0.25, 0.25),
          nz(hw - 0.4, 0.35),
          0.38,
          0.32,
          0.28,
        )
      }
      break
    }

    case 'B3': {
      /* 高温重灾区 — 大面积红橙色热点 */
      for (let i = 0; i < 2500; i++) {
        const progress = Math.random()
        const x = progress * L - L / 2
        const y = (Math.random() - 0.5) * H
        const z = (Math.random() - 0.5) * W
        let heat = 0.4
        for (const a of alerts) {
          const d = Math.abs(progress - a.progress)
          if (d < 0.15) heat = Math.max(heat, 1 - d / 0.15)
        }
        if (Math.abs(z) > hw * 0.45 || Math.abs(y) > hh * 0.45) {
          push(
            x,
            y,
            z,
            0.55 + heat * 0.45,
            0.12 + (1 - heat) * 0.25,
            0.04 + (1 - heat) * 0.08,
          )
        }
      }
      break
    }

    case 'C1': {
      /* 气体浓度偏高 — 黄绿色弥散云 */
      for (let i = 0; i < 1100; i++) {
        const a = 0.25 + Math.random() * 0.45
        push(
          nz(L * 0.6 - L / 2, 1.0),
          nz(0, hh * 0.55),
          nz(0, hw * 0.55),
          0.55 * a,
          0.82 * a,
          0.12 * a,
        )
      }
      break
    }

    case 'C2': {
      /* 渗漏段 — 侧壁蓝色水渍流痕 */
      for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < 700; i++) {
          push(
            nz(L * (0.15 + Math.random() * 0.55) - L / 2, 0.15),
            hh * (0.4 - Math.random() * 1.3),
            nz(side * hw, n * 0.4),
            0.06,
            0.22 + Math.random() * 0.18,
            0.6 + Math.random() * 0.3,
          )
        }
      }
      break
    }

    case 'C3': {
      /* 振动超标 — 壁面点抖动 */
      for (let i = 0; i < 700; i++) {
        const x = (Math.random() - 0.5) * L
        const y = (Math.random() - 0.5) * H
        const z = (Math.random() - 0.5) * W
        if (Math.abs(z) > hw * 0.7 || Math.abs(y) > hh * 0.7) {
          const j = 0.14
          push(
            x + nz(0, j),
            y + nz(0, j),
            z + nz(0, j),
            0.45 + Math.random() * 0.3,
            0.42,
            0.18,
          )
        }
      }
      break
    }
  }
}

/* ═══════════════════════════════════════════════════
   Alert markers + label 3D positions
   ═══════════════════════════════════════════════════ */

function generateAlertMarkers(alerts: PipeAlert[], L: number, segId?: string) {
  const pts: number[] = []
  const cls: number[] = []
  const labelPos: THREE.Vector3[] = []

  const hw = 2, hh = 1.5  // tunnel half-dimensions match generateTunnelCloud

  for (let ai = 0; ai < alerts.length; ai++) {
    const alert = alerts[ai]
    const cx = alert.progress * L - L / 2
    const sc =
      alert.severity === 'critical'
        ? [1.0, 0.15, 0.08]
        : alert.severity === 'warning'
          ? [1.0, 0.65, 0.05]
          : [0.2, 0.7, 0.95]

    // Determine wall position based on alert index (alternate sides)
    // and vertical position on the wall (cable tray height)
    const onRight = ai % 2 === 0
    const wallZ = onRight ? hw - 0.15 : -(hw - 0.15)  // just inside wall surface
    const wallY = ai % 3 === 0 ? 0.3 : ai % 3 === 1 ? -0.4 : 0.8  // cable tray heights

    // Scatter marker particles around the wall position
    for (let i = 0; i < 65; i++) {
      pts.push(
        nz(cx, 0.22),
        nz(wallY, 0.25),
        nz(wallZ, 0.15),
      )
      cls.push(sc[0], sc[1], sc[2])
    }

    // Label floats slightly outward from wall so it's visible
    const labelZ = onRight ? hw + 0.3 : -(hw + 0.3)
    labelPos.push(new THREE.Vector3(cx, wallY + 0.6, labelZ))
  }

  return {
    positions: new Float32Array(pts),
    colors: new Float32Array(cls),
    count: pts.length / 3,
    labelPos,
  }
}

/* ═══════════════════════════════════════════════════
   Smooth camera fly-to helper
   ═══════════════════════════════════════════════════ */

interface FlyState {
  startPos: THREE.Vector3
  startTarget: THREE.Vector3
  endPos: THREE.Vector3
  endTarget: THREE.Vector3
  startTime: number
  duration: number
}

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/* ═══════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════ */

interface Props {
  segment: PipeSegment
  sensors: CrossSectionSensor[]
  alerts: PipeAlert[]
  focusAlertId?: string | null
}

export function PointCloudView({ segment, sensors: _sensors, alerts, focusAlertId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  /* Expose camera + controls via ref so focusAlertId effect can reach them */
  const sceneCtx = useRef<{
    camera: THREE.PerspectiveCamera
    controls: OrbitControls
    alertPositions: Map<string, THREE.Vector3>
    fly: FlyState | null
  } | null>(null)

  const [viewHeight, setViewHeight] = useState(380)
  const dragRef = useRef<{ startY: number; startH: number } | null>(null)

  /* ── Three.js lifecycle ── */
  useEffect(() => {
    const container = containerRef.current!
    const canvas = canvasRef.current!
    const overlay = overlayRef.current!

    const rect = container.getBoundingClientRect()
    const L = segment.length / 5

    /* — Scene — */
    const scene = new THREE.Scene()

    /* — Camera — */
    const camera = new THREE.PerspectiveCamera(
      50,
      rect.width / rect.height,
      0.1,
      500,
    )
    camera.position.set(0, 3.5, L * 0.7)

    /* — Renderer — */
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    })
    renderer.setSize(rect.width, rect.height)
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
    renderer.setClearColor(0x060e18, 1)

    /* — Controls — */
    const controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.target.set(0, -0.3, 0)
    controls.minDistance = 2
    controls.maxDistance = 80
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: THREE.MOUSE.PAN,
    }
    controls.update()

    /* — Tunnel point cloud — */
    const cloud = generateTunnelCloud(segment, alerts)
    const geom = new THREE.BufferGeometry()
    geom.setAttribute(
      'position',
      new THREE.BufferAttribute(cloud.positions, 3),
    )
    geom.setAttribute('color', new THREE.BufferAttribute(cloud.colors, 3))
    const mat = new THREE.PointsMaterial({
      size: 0.09,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.82,
    })
    scene.add(new THREE.Points(geom, mat))

    /* — Alert marker cloud — */
    const alertData = generateAlertMarkers(alerts, L, segment.id)
    const aGeom = new THREE.BufferGeometry()
    aGeom.setAttribute(
      'position',
      new THREE.BufferAttribute(alertData.positions, 3),
    )
    aGeom.setAttribute('color', new THREE.BufferAttribute(alertData.colors, 3))
    const aMat = new THREE.PointsMaterial({
      size: 0.14,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
    })
    scene.add(new THREE.Points(aGeom, aMat))

    /* — Build alert position map — */
    const alertPositions = new Map<string, THREE.Vector3>()
    alerts.forEach((a, i) => {
      alertPositions.set(a.id, alertData.labelPos[i].clone())
    })

    /* — Subtle floor grid — */
    const grid = new THREE.GridHelper(
      L,
      Math.floor(L * 2),
      0x1a2535,
      0x0f1a28,
    )
    grid.position.set(0, -1.52, 0)
    scene.add(grid)

    /* — Axis reference lines (very subtle) — */
    const axMat = new THREE.LineBasicMaterial({
      color: 0x1a2535,
      transparent: true,
      opacity: 0.4,
    })
    const axGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-L / 2, -1.5, 0),
      new THREE.Vector3(L / 2, -1.5, 0),
    ])
    scene.add(new THREE.Line(axGeom, axMat))

    /* — HTML labels (imperatively managed) — */
    const labelEls: HTMLDivElement[] = []
    overlay.innerHTML = ''

    for (let i = 0; i < alerts.length; i++) {
      const alert = alerts[i]
      const sc = sevStyle(alert.severity)

      const el = document.createElement('div')
      el.style.cssText =
        'position:absolute;left:0;top:0;pointer-events:none;transition:opacity 0.15s;'
      el.innerHTML = `
        <div style="
          border:1px solid ${sc.border};
          background:${sc.bg};
          backdrop-filter:blur(8px);
          border-radius:8px;
          padding:5px 10px;
          font-size:11px;
          white-space:nowrap;
          transform:translateX(-50%);
          box-shadow:0 4px 12px rgba(0,0,0,0.4);
        ">
          <div style="display:flex;align-items:center;gap:5px;">
            <span style="width:6px;height:6px;border-radius:50%;background:${sc.dot};display:inline-block;box-shadow:0 0 6px ${sc.dot};"></span>
            <span style="color:${sc.text};font-weight:600;">${alert.label}</span>
          </div>
          <div style="color:rgb(148,163,184);font-size:10px;margin-top:2px;">
            ${segment.id} · ${(alert.progress * 100).toFixed(0)}%处
          </div>
        </div>
        <div style="width:1px;height:14px;background:${sc.border};margin:0 auto;"></div>
      `
      overlay.appendChild(el)
      labelEls.push(el)
    }

    /* — Store context ref — */
    sceneCtx.current = { camera, controls, alertPositions, fly: null }

    /* — Animation loop — */
    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      /* Handle fly-to animation */
      const ctx = sceneCtx.current
      if (ctx?.fly) {
        const elapsed = Date.now() - ctx.fly.startTime
        const progress = Math.min(1, elapsed / ctx.fly.duration)
        const e = easeInOut(progress)

        camera.position.lerpVectors(ctx.fly.startPos, ctx.fly.endPos, e)
        controls.target.lerpVectors(ctx.fly.startTarget, ctx.fly.endTarget, e)

        if (progress >= 1) {
          ctx.fly = null
        }
      }

      controls.update()

      // Pulse alert markers
      const t = Date.now() * 0.003
      aMat.size = 0.12 + Math.sin(t) * 0.06
      aMat.opacity = 0.55 + Math.sin(t * 0.8) * 0.35

      // Project labels to screen
      const cr = container.getBoundingClientRect()
      for (let i = 0; i < labelEls.length; i++) {
        const pos = alertData.labelPos[i].clone().project(camera)
        const sx = (pos.x * 0.5 + 0.5) * cr.width
        const sy = (-pos.y * 0.5 + 0.5) * cr.height
        labelEls[i].style.transform = `translate(${sx}px, ${sy}px)`
        labelEls[i].style.opacity = pos.z > 1 ? '0' : '1'
      }

      renderer.render(scene, camera)
    }
    animate()

    /* — ResizeObserver — */
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width < 10 || height < 10) return
      renderer.setSize(width, height)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    })
    observer.observe(container)

    /* — Cleanup — */
    return () => {
      cancelAnimationFrame(animId)
      observer.disconnect()
      controls.dispose()
      geom.dispose()
      mat.dispose()
      aGeom.dispose()
      aMat.dispose()
      axGeom.dispose()
      axMat.dispose()
      renderer.dispose()
      labelEls.forEach((el) => el.remove())
      sceneCtx.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment.id])

  /* ── Focus alert: fly camera when focusAlertId changes ── */
  useEffect(() => {
    if (!focusAlertId || !sceneCtx.current) return
    const ctx = sceneCtx.current
    /* focusAlertId 可能带 __key 后缀用于触发重复点击 */
    const realId = focusAlertId.split('__')[0]
    const targetPos = ctx.alertPositions.get(realId)
    if (!targetPos) return

    const lookAt = new THREE.Vector3(targetPos.x, 0, 0)
    const cameraEnd = new THREE.Vector3(targetPos.x + 3, 2.5, 8)

    ctx.fly = {
      startPos: ctx.camera.position.clone(),
      startTarget: ctx.controls.target.clone(),
      endPos: cameraEnd,
      endTarget: lookAt,
      startTime: Date.now(),
      duration: 800,
    }
  }, [focusAlertId])

  /* ── Resize drag ── */
  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragRef.current = { startY: e.clientY, startH: viewHeight }

      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current) return
        const delta = dragRef.current.startY - ev.clientY
        setViewHeight(
          Math.min(650, Math.max(200, dragRef.current.startH + delta)),
        )
      }

      const onUp = () => {
        dragRef.current = null
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }

      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    [viewHeight],
  )

  return (
    <div className="overflow-hidden rounded-xl border border-white/8 bg-[#060e18]">
      {/* ── Resize handle ── */}
      <div
        onMouseDown={onDragStart}
        className="flex h-5 cursor-ns-resize items-center justify-center border-b border-white/6 transition hover:bg-white/[0.04]"
      >
        <GripHorizontal className="h-3.5 w-3.5 text-slate-600" />
      </div>

      {/* ── 3D viewport ── */}
      <div ref={containerRef} className="relative" style={{ height: viewHeight }}>
        <canvas ref={canvasRef} className="block h-full w-full" />
        <div
          ref={overlayRef}
          className="pointer-events-none absolute inset-0 overflow-hidden"
        />

        {/* Info bar */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gradient-to-t from-[#060e18] to-transparent px-4 pb-2.5 pt-6">
          <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
            {segment.id} 区段 · 三维点云
          </span>
          <span className="text-[10px] text-slate-600">
            {segment.length}m · {segment.temperatureC}°C ·{' '}
            {segment.humidityPct}% · 左键旋转 · 滚轮缩放 · 中键/右键平移
          </span>
        </div>
      </div>
    </div>
  )
}
