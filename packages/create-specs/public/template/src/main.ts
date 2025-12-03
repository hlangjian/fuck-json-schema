import * as Scalar from '@scalar/api-reference'
import '@scalar/api-reference/style.css'
import { createOpenapi } from '@huanglangjian/openapi-generator'
import { models } from './models.gen'

const openapi = createOpenapi({
    models,
    info: {
        title: 'Example',
        version: 'v1'
    }
})

Scalar.createApiReference('#app', {
    content: JSON.stringify(openapi),
    theme: 'bluePlanet',
    hideClientButton: true,
})