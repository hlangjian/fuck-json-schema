import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { useOpenapi } from './openapi.js'

const app = new Hono()

useOpenapi(app)

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
  console.log(`Open Scalar UI on http://localhost:${info.port}/d/scalar`)
})