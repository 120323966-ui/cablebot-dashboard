import { BatteryCharging, Radio, Thermometer, Timer } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import type { RobotOverview } from '@/types/dashboard'

function toneOf(health: RobotOverview['health']) {
  if (health === 'good') return 'good' as const
  if (health === 'warning') return 'warning' as const
  if (health === 'danger') return 'danger' as const
  return 'neutral' as const
}

export function RobotStatusPanel({ robots }: { robots: RobotOverview[] }) {
  return (
    <Card eyebrow="Fleet" title="机器人状态">
      <div className="space-y-4">
        {robots.map((robot) => (
          <div key={robot.id} className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-base font-medium text-white">{robot.name}</div>
                <div className="mt-1 text-sm text-slate-400">{robot.location}</div>
              </div>
              <Badge tone={toneOf(robot.health)}>{robot.health}</Badge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="robot-stat"><BatteryCharging className="robot-stat-icon" />{Math.round(robot.batteryPct)}%</div>
              <div className="robot-stat"><Radio className="robot-stat-icon" />{robot.signalRssi} dBm</div>
              <div className="robot-stat"><Thermometer className="robot-stat-icon" />{robot.temperatureC}°C</div>
              <div className="robot-stat"><Timer className="robot-stat-icon" />{robot.speedKmh} km/h</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
