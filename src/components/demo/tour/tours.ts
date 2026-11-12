import { CLIMATE_PRESET, DEMO_PRESET } from '@components/demo/demo-preset'
import type { WorkspacePreset } from '@components/workspace/workspace-preset'
import { getClimateSteps } from './climate-steps'
import { getHowItWorksSteps } from './how-it-works-steps'
import { getStorySteps } from './story-steps'
import type { StepContext, TourKind, TourStep } from './tour-steps'

/* What each tour starts from, and how it picks the district: on the map,
 * or in the org unit tree, as the climate app's Explore does */
export type Tour = {
    preset: WorkspacePreset
    getSteps: (context: StepContext) => TourStep[]
    picksDistrictIn: 'map' | 'tree'
}

export const TOURS: Record<TourKind, Tour> = {
    malaria: {
        preset: DEMO_PRESET,
        getSteps: getStorySteps,
        picksDistrictIn: 'map',
    },
    'how-it-works': {
        preset: DEMO_PRESET,
        getSteps: getHowItWorksSteps,
        picksDistrictIn: 'map',
    },
    climate: {
        preset: CLIMATE_PRESET,
        getSteps: getClimateSteps,
        picksDistrictIn: 'tree',
    },
}
