import { usePluginSources } from '@components/plugins/plugin-sources'
import type { MenuAction } from '@components/workspace/tabs/actions-menu'
import i18n from '@dhis2/d2-i18n'
import { useAppDispatch, useAppSelector } from '@hooks'
import type { LinkItem } from '@modules/interactions/apply-links'
import {
    canDrillInto,
    getMenuDrillTargets,
    getParentOf,
} from '@modules/interactions/drills'
import {
    selectLinksState,
    viewDrilledDown,
    viewDrilledUpTo,
    viewDrillReset,
} from '@store/interactions-slice'
import { useMemo } from 'react'

type DrillTargets = {
    down: LinkItem | null
    up: LinkItem | null
    isDrilled: boolean
}

/* A view's entries to drill it: down into an org unit, up to one's level,
 * and back to the saved item. From a right-click, they start from the unit
 * clicked (`clicked`); from the ⋯ menu, from what the view shows. */
export const useDrillActions = (
    viewId: string,
    clicked?: LinkItem
): MenuAction[] => {
    const dispatch = useAppDispatch()
    const { orgUnitLevelCount, getOrgUnitName } = usePluginSources()
    const targetsText = useAppSelector((state) => {
        const links = selectLinksState(state)
        const targets: DrillTargets = clicked
            ? {
                  down: canDrillInto(links.drills, viewId, {
                      item: clicked,
                      orgUnitLevelCount,
                  })
                      ? clicked
                      : null,
                  up: getParentOf(clicked),
                  isDrilled: viewId in links.drills,
              }
            : {
                  ...getMenuDrillTargets(links, viewId, orgUnitLevelCount),
                  isDrilled: viewId in links.drills,
              }
        return JSON.stringify(targets)
    })

    return useMemo(() => {
        const { down, up, isDrilled } = JSON.parse(targetsText) as DrillTargets
        const actions: MenuAction[] = []
        if (down) {
            actions.push({
                key: 'drill-down',
                label: i18n.t('Drill down into {{name}}', {
                    name: down.name ?? down.id,
                    interpolation: { escapeValue: false },
                }),
                dataTest: 'drill-down',
                onClick: () =>
                    dispatch(viewDrilledDown({ viewId, item: down })),
            })
        }
        if (up) {
            const name = up.name ?? getOrgUnitName(up.id)
            actions.push({
                key: 'drill-up',
                label: name
                    ? i18n.t('Drill up to {{name}}', {
                          name,
                          interpolation: { escapeValue: false },
                      })
                    : i18n.t('Drill up a level'),
                dataTest: 'drill-up',
                onClick: () =>
                    dispatch(
                        viewDrilledUpTo({ viewId, item: { ...up, name } })
                    ),
            })
        }
        if (isDrilled) {
            actions.push({
                key: 'drill-reset',
                label: i18n.t('Back to the saved item'),
                dataTest: 'drill-reset',
                onClick: () => dispatch(viewDrillReset(viewId)),
            })
        }
        return actions
    }, [dispatch, getOrgUnitName, targetsText, viewId])
}
