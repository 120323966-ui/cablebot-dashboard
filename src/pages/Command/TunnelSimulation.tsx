/**
 * TunnelSimulation — 模拟电缆排管巡检机器人前视摄像头画面
 * 可见光为主 + 局部红外热像叠加 + 扫描线/闪烁动态效果
 *
 * Props:
 *  - lightOn:          灯光开关 → 控制画面亮度
 *  - stabilizationOn:  稳定开关 → 控制画面抖动
 */

import { useEffect, useRef } from 'react'

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface TunnelSimulationProps {
  lightOn: boolean
  stabilizationOn: boolean
}

/* ------------------------------------------------------------------ */
/*  CSS keyframes — injected once                                      */
/* ------------------------------------------------------------------ */
const STYLE_ID = '__tunnel-sim-styles'

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    @keyframes tun-scanline {
      0%   { transform: translateY(-100%); }
      100% { transform: translateY(calc(100vh + 100%)); }
    }
    @keyframes tun-flicker {
      0%, 100% { opacity: 1; }
      4%       { opacity: 0.97; }
      8%       { opacity: 1; }
      42%      { opacity: 0.98; }
      44%      { opacity: 0.95; }
      46%      { opacity: 1; }
      72%      { opacity: 0.97; }
      78%      { opacity: 1; }
    }
    @keyframes tun-ceilinglight {
      0%, 100% { opacity: 0.7; }
      50%      { opacity: 0.85; }
    }
    @keyframes tun-thermal-pulse {
      0%, 100% { opacity: 0.35; }
      50%      { opacity: 0.55; }
    }
    @keyframes tun-cam-shake {
      0%   { transform: translate(0, 0) rotate(0deg); }
      10%  { transform: translate(-1.5px, 1px) rotate(-0.15deg); }
      20%  { transform: translate(2px, -0.5px) rotate(0.1deg); }
      30%  { transform: translate(-0.5px, 1.5px) rotate(0.2deg); }
      40%  { transform: translate(1px, -1px) rotate(-0.1deg); }
      50%  { transform: translate(-1px, 0.5px) rotate(0.15deg); }
      60%  { transform: translate(1.5px, 1px) rotate(-0.2deg); }
      70%  { transform: translate(-2px, -0.5px) rotate(0.1deg); }
      80%  { transform: translate(0.5px, 1.5px) rotate(-0.15deg); }
      90%  { transform: translate(-1px, -1px) rotate(0.2deg); }
      100% { transform: translate(0, 0) rotate(0deg); }
    }
  `
  document.head.appendChild(style)
}

/* ------------------------------------------------------------------ */
/*  Noise Canvas — lightweight static noise overlay                    */
/* ------------------------------------------------------------------ */
function NoiseCanvas({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = 200
    canvas.height = 120

    let frameId = 0
    let lastDraw = 0
    const FPS = 8

    function draw(now: number) {
      frameId = requestAnimationFrame(draw)
      if (now - lastDraw < 1000 / FPS) return
      lastDraw = now

      const img = ctx!.createImageData(200, 120)
      const d = img.data
      for (let i = 0; i < d.length; i += 4) {
        const v = Math.random() * 255
        d[i] = v
        d[i + 1] = v
        d[i + 2] = v
        d[i + 3] = 14
      }
      ctx!.putImageData(img, 0, 0)
    }

    frameId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frameId)
  }, [])

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  Geometry helpers                                                   */
/* ------------------------------------------------------------------ */
const VP = { x: 800, y: 310 }
const W = 1600, H = 900
const NL = -20, NR = W + 20, NT = -20, NB = H + 20
const FW = 240, FH = 150
const FL = VP.x - FW, FR = VP.x + FW
const FT = VP.y - FH, FB = VP.y + FH

const trayLevels = [0.25, 0.50, 0.75]
const depthSteps = [0.15, 0.30, 0.45, 0.60, 0.75, 0.88]

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

function perspLine(nearX: number, nearY: number, farX: number, farY: number) {
  return `M${nearX},${nearY} L${farX},${farY}`
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export function TunnelSimulation({ lightOn, stabilizationOn }: TunnelSimulationProps) {
  useEffect(() => { ensureStyles() }, [])

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        animation: 'tun-flicker 6s ease-in-out infinite',
      }}
    >
      {/* ========== BASE: dark tunnel background ========== */}
      <div className="absolute inset-0 bg-[#0a1118]" />

      {/* ========== SVG: Tunnel structure ========== */}
      {/* lightOn → controls brightness; stabilizationOn → controls shake */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        style={{
          filter: lightOn
            ? 'contrast(1.05) brightness(0.95)'
            : 'contrast(1.1) brightness(0.2) saturate(0.5)',
          transition: 'filter 0.6s ease',
          animation: stabilizationOn ? 'none' : 'tun-cam-shake 0.3s linear infinite',
        }}
      >
        <defs>
          {/* Headlight cone gradient */}
          <radialGradient id="tun-headlight" cx="50%" cy="95%" r="70%" fx="50%" fy="85%">
            <stop offset="0%" stopColor="rgba(180,210,230,0.18)" />
            <stop offset="35%" stopColor="rgba(130,170,200,0.08)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>

          {/* Floor wetness */}
          <linearGradient id="tun-floor-wet" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(40,70,90,0.0)" />
            <stop offset="60%" stopColor="rgba(30,55,75,0.15)" />
            <stop offset="100%" stopColor="rgba(20,45,65,0.3)" />
          </linearGradient>

          {/* Thermal hotspot gradient */}
          <radialGradient id="tun-thermal-hot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,60,30,0.5)" />
            <stop offset="30%" stopColor="rgba(255,140,0,0.35)" />
            <stop offset="60%" stopColor="rgba(255,200,0,0.15)" />
            <stop offset="100%" stopColor="rgba(255,200,0,0)" />
          </radialGradient>

          <radialGradient id="tun-thermal-warm" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,180,0,0.3)" />
            <stop offset="50%" stopColor="rgba(200,140,30,0.12)" />
            <stop offset="100%" stopColor="rgba(150,100,20,0)" />
          </radialGradient>
        </defs>

        {/* ---- Tunnel walls ---- */}
        <polygon points={`${NL},${NT} ${FL},${FT} ${FL},${FB} ${NL},${NB}`} fill="#141e28" />
        <polygon points={`${NR},${NT} ${FR},${FT} ${FR},${FB} ${NR},${NB}`} fill="#121c26" />
        <polygon points={`${NL},${NT} ${NR},${NT} ${FR},${FT} ${FL},${FT}`} fill="#0e1820" />
        <polygon points={`${NL},${NB} ${NR},${NB} ${FR},${FB} ${FL},${FB}`} fill="#101a22" />
        <rect x={FL} y={FT} width={FW * 2} height={FH * 2} fill="#0d161e" />

        {/* ---- Perspective edge lines ---- */}
        <path d={perspLine(NL, NT, FL, FT)} stroke="rgba(100,130,155,0.25)" strokeWidth="1.5" fill="none" />
        <path d={perspLine(NR, NT, FR, FT)} stroke="rgba(100,130,155,0.25)" strokeWidth="1.5" fill="none" />
        <path d={perspLine(NL, NB, FL, FB)} stroke="rgba(80,110,135,0.3)" strokeWidth="2" fill="none" />
        <path d={perspLine(NR, NB, FR, FB)} stroke="rgba(80,110,135,0.3)" strokeWidth="2" fill="none" />

        {/* ---- Wall joint / seam lines ---- */}
        {depthSteps.map((t, i) => {
          const lx = lerp(NL, FL, t), rx = lerp(NR, FR, t)
          const ty = lerp(NT, FT, t), by = lerp(NB, FB, t)
          const alpha = 0.12 + (1 - t) * 0.08
          return (
            <g key={`seam-${i}`}>
              <line x1={lx} y1={ty} x2={lx} y2={by} stroke={`rgba(90,120,145,${alpha})`} strokeWidth={1.2 - t * 0.6} />
              <line x1={rx} y1={ty} x2={rx} y2={by} stroke={`rgba(90,120,145,${alpha})`} strokeWidth={1.2 - t * 0.6} />
              <line x1={lx} y1={by} x2={rx} y2={by} stroke={`rgba(70,100,125,${alpha * 0.7})`} strokeWidth={1 - t * 0.5} />
              <line x1={lx} y1={ty} x2={rx} y2={ty} stroke={`rgba(70,100,125,${alpha * 0.5})`} strokeWidth={0.8 - t * 0.4} />
            </g>
          )
        })}

        {/* ---- Cable trays — LEFT wall ---- */}
        {trayLevels.map((ratio, ti) => {
          const nearY = lerp(NT, NB, ratio), farY = lerp(FT, FB, ratio)
          const cableColors = ['#2a3a48', '#1e2e3c', '#3a2828']
          return (
            <g key={`ltray-${ti}`}>
              <path d={perspLine(NL, nearY, FL, farY)} stroke="rgba(120,145,165,0.35)" strokeWidth={2.5 - ti * 0.4} fill="none" />
              {[-8, 0, 8].map((offset, ci) => (
                <path key={ci} d={perspLine(NL, nearY + offset, FL, farY + offset * 0.3)} stroke={cableColors[ci]} strokeWidth={5 - ti * 1.2} strokeLinecap="round" fill="none" opacity={0.7} />
              ))}
              {depthSteps.filter((_, si) => si % 2 === 0).map((t, bi) => {
                const bx = lerp(NL, FL, t), by = lerp(nearY, farY, t), size = 12 * (1 - t * 0.6)
                return <rect key={bi} x={bx - 1} y={by - size / 2} width={size} height={size} fill="none" stroke="rgba(100,130,150,0.2)" strokeWidth={1} rx={1} />
              })}
            </g>
          )
        })}

        {/* ---- Cable trays — RIGHT wall ---- */}
        {trayLevels.map((ratio, ti) => {
          const nearY = lerp(NT, NB, ratio), farY = lerp(FT, FB, ratio)
          const cableColors = ['#2a3848', '#322a28', '#283238']
          return (
            <g key={`rtray-${ti}`}>
              <path d={perspLine(NR, nearY, FR, farY)} stroke="rgba(120,145,165,0.35)" strokeWidth={2.5 - ti * 0.4} fill="none" />
              {[-8, 0, 8].map((offset, ci) => (
                <path key={ci} d={perspLine(NR, nearY + offset, FR, farY + offset * 0.3)} stroke={cableColors[ci]} strokeWidth={5 - ti * 1.2} strokeLinecap="round" fill="none" opacity={0.7} />
              ))}
              {depthSteps.filter((_, si) => si % 2 === 0).map((t, bi) => {
                const bx = lerp(NR, FR, t), by = lerp(nearY, farY, t), size = 12 * (1 - t * 0.6)
                return <rect key={bi} x={bx - size + 1} y={by - size / 2} width={size} height={size} fill="none" stroke="rgba(100,130,150,0.2)" strokeWidth={1} rx={1} />
              })}
            </g>
          )
        })}

        {/* ---- Floor rail / robot track ---- */}
        <path d={perspLine(650, NB, VP.x - 60, FB)} stroke="rgba(90,115,140,0.3)" strokeWidth="3" fill="none" />
        <path d={perspLine(950, NB, VP.x + 60, FB)} stroke="rgba(90,115,140,0.3)" strokeWidth="3" fill="none" />
        {[0.2, 0.4, 0.55, 0.68, 0.78, 0.86].map((t, i) => {
          const lx = lerp(650, VP.x - 60, t), rx = lerp(950, VP.x + 60, t), y = lerp(NB, FB, t)
          return <line key={`tie-${i}`} x1={lx} y1={y} x2={rx} y2={y} stroke="rgba(80,105,130,0.2)" strokeWidth={2 - t} />
        })}

        {/* ---- Ceiling lights ---- */}
        {[0.15, 0.35, 0.55, 0.75].map((t, i) => {
          const cy = lerp(NT + 40, FT, t)
          const lx = lerp(NL + 200, FL + 40, t), rx = lerp(NR - 200, FR - 40, t)
          const w = (rx - lx) * 0.15, midX = (lx + rx) / 2
          return (
            <g key={`clight-${i}`} style={{ animation: `tun-ceilinglight ${2.5 + i * 0.7}s ease-in-out infinite`, animationDelay: `${i * 0.4}s` }}>
              <rect x={midX - w / 2} y={cy - 2} width={w} height={4 * (1 - t * 0.5)} fill="rgba(190,215,235,0.5)" rx={2} />
              <ellipse cx={midX} cy={cy + 8} rx={w * 1.5} ry={20 * (1 - t * 0.5)} fill="rgba(170,200,225,0.06)" />
            </g>
          )
        })}

        {/* ---- Moisture stains ---- */}
        <ellipse cx={lerp(NL, FL, 0.3)} cy={lerp(NB - 80, FB, 0.3)} rx={40} ry={25} fill="rgba(40,80,100,0.15)" />
        <ellipse cx={lerp(NL, FL, 0.5)} cy={lerp(NB - 50, FB, 0.5)} rx={25} ry={15} fill="rgba(35,70,90,0.12)" />
        <ellipse cx={lerp(NR, FR, 0.25)} cy={lerp(NB - 100, FB, 0.25)} rx={35} ry={20} fill="rgba(45,75,95,0.13)" />

        {/* ---- Floor puddles ---- */}
        <ellipse cx={VP.x + 40} cy={lerp(NB, FB, 0.35)} rx={80} ry={12} fill="rgba(60,120,160,0.08)" />
        <ellipse cx={VP.x - 80} cy={lerp(NB, FB, 0.55)} rx={50} ry={8} fill="rgba(50,100,140,0.06)" />

        {/* ---- Ceiling pipes ---- */}
        <path d={perspLine(lerp(NL, NR, 0.3), NT + 10, lerp(FL, FR, 0.3), FT + 3)} stroke="rgba(100,125,145,0.3)" strokeWidth="4" fill="none" />
        <path d={perspLine(lerp(NL, NR, 0.7), NT + 10, lerp(FL, FR, 0.7), FT + 3)} stroke="rgba(95,120,140,0.25)" strokeWidth="3" fill="none" />

        {/* ---- Headlight ---- */}
        <rect x="0" y="0" width={W} height={H} fill="url(#tun-headlight)" />

        {/* ---- Floor wetness overlay ---- */}
        <polygon points={`${NL},${NB} ${NR},${NB} ${FR},${FB} ${FL},${FB}`} fill="url(#tun-floor-wet)" opacity={0.6} />

        {/* ======== THERMAL OVERLAYS ======== */}
        <g style={{ animation: 'tun-thermal-pulse 3s ease-in-out infinite' }}>
          <ellipse cx={lerp(NR, FR, 0.28) - 80} cy={lerp(NT + 100, FT + 40, 0.28)} rx={100} ry={70} fill="url(#tun-thermal-hot)" />
          {[0, 1, 2, 3].map(i => (
            <line key={`therm-${i}`}
              x1={lerp(NR, FR, 0.28) - 140 + i * 30} y1={lerp(NT + 80, FT + 30, 0.28) + i * 10}
              x2={lerp(NR, FR, 0.28) - 40 + i * 20} y2={lerp(NT + 120, FT + 50, 0.28) + i * 8}
              stroke={`rgba(255,${100 + i * 40},0,0.15)`} strokeWidth={8 - i * 1.5} strokeLinecap="round" />
          ))}
        </g>
        <g style={{ animation: 'tun-thermal-pulse 4s ease-in-out infinite', animationDelay: '1s' }}>
          <ellipse cx={lerp(NL, FL, 0.35) + 120} cy={lerp(NB - 120, FB, 0.35)} rx={120} ry={55} fill="url(#tun-thermal-warm)" />
        </g>

        {/* ---- Vignette ---- */}
        <rect x="0" y="0" width={W} height={H} fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="180" />
      </svg>

      {/* ========== Scan Line ========== */}
      <div
        className="pointer-events-none absolute left-0 right-0 z-10 h-[2px]"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(100,200,255,0.12) 20%, rgba(100,200,255,0.18) 50%, rgba(100,200,255,0.12) 80%, transparent 100%)',
          animation: 'tun-scanline 4.5s linear infinite',
          boxShadow: '0 0 12px 4px rgba(100,200,255,0.05)',
        }}
      />

      {/* ========== CRT scanline texture ========== */}
      <div
        className="pointer-events-none absolute inset-0 z-10 opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.4) 2px, rgba(0,0,0,0.4) 4px)',
          backgroundSize: '100% 4px',
        }}
      />

      {/* ========== Noise overlay ========== */}
      <NoiseCanvas className="pointer-events-none absolute inset-0 z-10 h-full w-full opacity-40" />

      {/* ========== Vignette (CSS) ========== */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)' }}
      />

      {/* ========== Light-off overlay ========== */}
      {/* 关灯时在最上层叠加一个深色蒙层，增强"灯灭"的真实感 */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: 'radial-gradient(ellipse 50% 50% at 50% 85%, rgba(20,40,60,0.3) 0%, rgba(0,0,0,0.85) 100%)',
          opacity: lightOn ? 0 : 1,
          transition: 'opacity 0.6s ease',
        }}
      />
    </div>
  )
}
