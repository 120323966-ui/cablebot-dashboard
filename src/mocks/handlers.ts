import { delay, http, HttpResponse } from 'msw'
import { createCommandCenterMock } from './data/commandCenter'
import { createHomeOverviewMock } from './data/dashboardHome'

export const handlers = [
  http.get('/api/dashboard/home', async () => {
    await delay(180)
    return HttpResponse.json(createHomeOverviewMock())
  }),

  http.get('/api/dashboard/command', async () => {
    await delay(180)
    return HttpResponse.json(createCommandCenterMock())
  }),
]
