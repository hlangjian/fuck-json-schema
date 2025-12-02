import * as Scalar from '@scalar/api-reference'
import '@scalar/api-reference/style.css'
import { BookRoute } from './specs/book'
import { createOpenapi } from '@huanglangjian/openapi-generator'
import { application } from '@huanglangjian/schema'

const app = application({
    routes: [BookRoute]
})

const openapi = createOpenapi({
    routes: app.routes,
    info: {
        title: 'Specs example',
        version: 'v1'
    }
})

Scalar.createApiReference('#app', {
    content: JSON.stringify(openapi),
    theme: 'bluePlanet',
    hideClientButton: true,
})