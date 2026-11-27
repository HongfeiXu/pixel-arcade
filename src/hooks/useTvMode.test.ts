import { expect, test } from 'vitest'
import { useTvMode } from './useTvMode'

test('web TV mode is disabled independently of viewport or URL', () => {
  expect(useTvMode()).toBe(false)
})
