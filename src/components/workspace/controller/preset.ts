import type { WorkspacePreset } from '@components/workspace/workspace-preset'
import type { AppDispatch, RootState } from '@store/store'
import type { DockviewApi } from 'dockview-react'
import { getViewPanels } from './panels'
import { closeView } from './views'

type PresetLoad = WorkspacePreset['load']

/* A preset fills the grid only while it has no views: under StrictMode
 * the workspace is set up twice, and it must load once */
export const loadPreset = (
    api: DockviewApi,
    load: PresetLoad,
    dispatch: AppDispatch
): void => {
    if (!getViewPanels(api).length) {
        load(api, dispatch)
    }
}

/* What a reset to the preset would replace: the views with their params
 * (saved item, control, text), their links and values, and the workspace
 * settings. Sizes and the open tool tab are left out, and so are the
 * points a view clicked, which count only while its channels hold them. */
const describeWorkspace = (api: DockviewApi, state: RootState): string => {
    const { channels, linkableViews, detached, drills } = state.interactions
    return JSON.stringify({
        views: getViewPanels(api).map(({ id, params }) => ({ id, params })),
        links: { channels, linkableViews, detached, drills },
        settings: state.workspaceSettings,
    })
}

const presetStates = new WeakMap<DockviewApi, string>()

/* Remembers the workspace as the preset left it, once it has loaded */
export const markPresetLoaded = (api: DockviewApi, state: RootState): void => {
    presetStates.set(api, describeWorkspace(api, state))
}

/* Whether the user changed anything a reset would undo */
export const hasChangedSincePreset = (
    api: DockviewApi,
    state: RootState
): boolean => {
    const presetState = presetStates.get(api)
    return (
        presetState !== undefined &&
        presetState !== describeWorkspace(api, state)
    )
}

/* Closes every view, which takes it out of its channels too, and loads the
 * preset again. A maximized view would keep the new views out of sight. */
export const resetToPreset = (
    api: DockviewApi,
    load: PresetLoad,
    dispatch: AppDispatch
): void => {
    if (api.hasMaximizedGroup()) {
        api.exitMaximizedGroup()
    }
    for (const view of getViewPanels(api)) {
        closeView(api, view.id)
    }
    load(api, dispatch)
}
