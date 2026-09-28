import { ViewTypeIcon } from '@components/workspace/view-type-icon'
import { VIEW_TYPES } from '@modules/workspace/view-types'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('ViewTypeIcon', () => {
    it.each(VIEW_TYPES)(
        'draws the %s icon at 24px, or 16px in tabs',
        (type) => {
            const { container, rerender } = render(<ViewTypeIcon type={type} />)
            const large = container.innerHTML
            expect(large).toContain('width="24"')

            rerender(<ViewTypeIcon type={type} size={16} />)

            expect(container.innerHTML).toContain('width="16"')
        }
    )
})
