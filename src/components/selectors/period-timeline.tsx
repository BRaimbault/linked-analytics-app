import i18n from '@dhis2/d2-i18n'
import {
    Button,
    IconChevronLeft16,
    IconChevronRight16,
    IconCross16,
} from '@dhis2/ui'
import type { LinkItem } from '@modules/interactions/apply-links'
import { getStepIndex, getTimelineIndex } from '@modules/selectors/timeline'
import type { FC } from 'react'
import { SelectorHeader } from './selector-header'
import classes from './styles/period-timeline.module.css'
import { useTimelinePlay } from './use-timeline-play'

/* @dhis2/ui has no play or pause icon: these follow its 16px icons */
const IconPlay16: FC = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M5 3l8 5-8 5z" fill="currentColor" />
    </svg>
)

const IconPause16: FC = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M4 3h3v10H4zM9 3h3v10H9z" fill="currentColor" />
    </svg>
)

/* A period selector as a track of periods, oldest first, with steps and
 * play. The marker shows the channel's period when it is on the track; a
 * period set elsewhere that isn't (a quarter) shows as text only. */
export const PeriodTimeline: FC<{
    label: string
    valueText: string
    periods: LinkItem[]
    value: LinkItem[]
    /* The views the channel drives, which play waits for */
    receiverIds: string[]
    onSelect: (period: LinkItem) => void
    /* Back to each view's own period */
    onClear: () => void
}> = ({ label, valueText, periods, value, receiverIds, onSelect, onClear }) => {
    const index = getTimelineIndex(periods, value)
    const { isPlaying, play, pause } = useTimelinePlay({
        periods,
        index,
        receiverIds,
        select: onSelect,
    })
    const last = periods.length - 1
    const selectAt = (at: number) => {
        pause()
        onSelect(periods[at])
    }

    return (
        <div className={classes.timeline} data-test="period-timeline">
            <SelectorHeader label={label} valueText={valueText} />
            <div className={classes.controls}>
                <Button
                    small
                    secondary
                    icon={<IconChevronLeft16 />}
                    aria-label={i18n.t('Previous period')}
                    title={i18n.t('Previous period')}
                    disabled={index === 0}
                    dataTest="timeline-previous"
                    onClick={() =>
                        selectAt(getStepIndex(index, -1, periods.length))
                    }
                />
                <Button
                    small
                    secondary
                    icon={isPlaying ? <IconPause16 /> : <IconPlay16 />}
                    aria-label={isPlaying ? i18n.t('Pause') : i18n.t('Play')}
                    title={isPlaying ? i18n.t('Pause') : i18n.t('Play')}
                    dataTest="timeline-play"
                    onClick={isPlaying ? pause : play}
                />
                <Button
                    small
                    secondary
                    icon={<IconChevronRight16 />}
                    aria-label={i18n.t('Next period')}
                    title={i18n.t('Next period')}
                    disabled={index === last}
                    dataTest="timeline-next"
                    onClick={() =>
                        selectAt(getStepIndex(index, 1, periods.length))
                    }
                />
                <input
                    type="range"
                    className={classes.track}
                    min={0}
                    max={last}
                    step={1}
                    value={index ?? 0}
                    data-off-track={index === null || undefined}
                    aria-label={label}
                    aria-valuetext={
                        index === null ? valueText : periods[index].name
                    }
                    data-test="timeline-track"
                    onChange={(event) => selectAt(Number(event.target.value))}
                />
                {value.length > 0 && (
                    <Button
                        small
                        secondary
                        icon={<IconCross16 />}
                        aria-label={i18n.t('Clear')}
                        title={i18n.t('Clear')}
                        dataTest="timeline-clear"
                        onClick={() => {
                            pause()
                            onClear()
                        }}
                    />
                )}
            </div>
        </div>
    )
}
