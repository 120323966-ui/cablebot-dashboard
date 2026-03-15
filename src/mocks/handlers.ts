import { delay, http, HttpResponse } from 'msw'
import { createHomeOverviewMock } from './data/dashboardHome'

export const handlers = [
  http.get('/api/dashboard/home', async () => {
    await delay(180)
    return HttpResponse.json(createHomeOverviewMock())
  }),
]
