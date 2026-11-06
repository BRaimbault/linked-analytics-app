import { CustomDataProvider } from '@dhis2/app-runtime'
import { answerOrgUnitRequest } from '@modules/demo/org-unit-requests'
import type { ComponentProps, FC, ReactNode } from 'react'

/* What the DHIS2 components in the demo ask the data engine for, answered
 * from the demo's data. Anything else fails, rather than reach a server. */
const DEMO_DATA: ComponentProps<typeof CustomDataProvider>['data'] = {
    organisationUnits: async (_type, { id, params }) =>
        answerOrgUnitRequest(id, params?.fields),
}

export const DemoDataProvider: FC<{ children: ReactNode }> = ({ children }) => (
    <CustomDataProvider data={DEMO_DATA}>{children}</CustomDataProvider>
)
