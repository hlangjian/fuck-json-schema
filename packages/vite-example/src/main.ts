import * as Scalar from '@scalar/api-reference'
import openapi from '../openapi.json'
import '@scalar/api-reference/style.css'

Scalar.createApiReference('#app', {
  content: JSON.stringify(openapi),
  theme: 'bluePlanet',
  hideClientButton: true,
})