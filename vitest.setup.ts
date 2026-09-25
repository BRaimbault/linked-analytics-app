import { configure } from '@testing-library/dom'
import * as matchers from '@testing-library/jest-dom/matchers'
import { cleanup } from '@testing-library/react'
import ResizeObserver from 'resize-observer-polyfill'
import { expect, afterEach, beforeEach } from 'vitest'

expect.extend(matchers)
configure({
    testIdAttribute: 'data-test',
})

global.ResizeObserver = ResizeObserver

beforeEach(() => {
    globalThis.localStorage.clear()
})

afterEach(() => {
    cleanup()
})
