import { describeNotice, PeriodNotices } from '@components/demo/period-notices'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

const notice = {
    dataItem: 'ANC 1st visit',
    collectedIn: 'YEARLY' as const,
    askedIn: 'QUARTERLY' as const,
    places: [],
}

describe('PeriodNotices', () => {
    it('says what is missing, and where when only some places are', () => {
        expect(describeNotice(notice)).toBe(
            'No quarterly values for ANC 1st visit, which is collected yearly.'
        )
        expect(describeNotice({ ...notice, places: ['East', 'South'] })).toBe(
            'ANC 1st visit is collected yearly in East, South, which have no quarterly values.'
        )
    })

    it('shows each notice on its own line, and nothing without any', () => {
        const { rerender } = render(<PeriodNotices notices={[notice]} />)

        expect(screen.getByRole('note')).toHaveTextContent('collected yearly')

        rerender(<PeriodNotices notices={[]} />)
        expect(screen.queryByRole('note')).toBeNull()
    })
})
