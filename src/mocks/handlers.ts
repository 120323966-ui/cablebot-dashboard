import { delay, http, HttpResponse } from 'msw'
import { createAlertsPageMock } from './data/alerts'
import { createCommandCenterMock } from './data/commandCenter'
import { createHomeOverviewMock } from './data/dashboardHome'
import { createHistoryPageMock } from './data/history'
import { createSpatialPageMock } from './data/spatial'

export const handlers = [
  http.get('/api/dashboard/home', async () => {
    await delay(180)
    return HttpResponse.json(createHomeOverviewMock())
  }),

  http.get('/api/dashboard/command', async () => {
    await delay(180)
    return HttpResponse.json(createCommandCenterMock())
  }),

  http.get('/api/dashboard/alerts', async () => {
    await delay(200)
    return HttpResponse.json(createAlertsPageMock())
  }),

  http.get('/api/dashboard/spatial', async () => {
    await delay(220)
    return HttpResponse.json(createSpatialPageMock())
  }),

  http.get('/api/dashboard/history', async ({ request }) => {
    const url = new URL(request.url)
    const days = Number(url.searchParams.get('days') ?? '30')
    await delay(250)
    return HttpResponse.json(createHistoryPageMock(days))
  }),
]
