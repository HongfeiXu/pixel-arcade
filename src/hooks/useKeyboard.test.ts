import { describe, expect, test } from 'vitest'
import { getDasKey } from './useKeyboard'

describe('keyboard DAS identity', () => {
  test('treats Unidentified as invalid and keeps legacy directions distinct', () => {
    expect(getDasKey({ code: 'Unidentified', keyCode: 37 }, 'left')).toBe('keyCode:37')
    expect(getDasKey({ code: 'Unidentified', keyCode: 39 }, 'right')).toBe('keyCode:39')
  })

  test('falls back to normalized action when no usable code or keyCode exists', () => {
    expect(getDasKey({ code: 'Unidentified', keyCode: 0 }, 'left')).toBe('action:left')
    expect(getDasKey({ code: '', keyCode: 0 }, 'right')).toBe('action:right')
  })

  test('keeps a valid code as the stable desktop identity', () => {
    expect(getDasKey({ code: 'ArrowLeft', keyCode: 37 }, 'left')).toBe('code:ArrowLeft')
  })
})
