import { AppWrapper } from '@components/app-wrapper/app-wrapper'
import { Workspace } from '@components/workspace/workspace'
import i18n from '@dhis2/d2-i18n'
import { Center, CircularLoader, CssVariables, NoticeBox } from '@dhis2/ui'
import { useRtkQuery } from '@hooks'
import { isDemoMode } from '@modules/demo/demo-flag'
import type { MeDto } from '@types'
import { lazy, Suspense, type FC } from 'react'
import classes from './styles/app.module.css'

/* Loaded only with ?demo, so the app itself never downloads the demo */
const DemoWorkspace = lazy(() =>
    import('@components/demo/demo-workspace').then((module) => ({
        default: module.DemoWorkspace,
    }))
)

const Loader: FC = () => (
    <Center>
        <CircularLoader />
    </Center>
)

const LinkedAnalytics: FC = () => {
    const { error, isLoading } = useRtkQuery<Pick<MeDto, 'id'>>({
        resource: 'me',
        params: { fields: 'id' },
    })

    if (isLoading) {
        return <Loader />
    }

    if (error) {
        return (
            <NoticeBox error title={i18n.t('Could not load the app')}>
                {error.message}
            </NoticeBox>
        )
    }

    return (
        <div className={classes.app} data-test="app-container">
            {isDemoMode(window.location.search) ? (
                <Suspense fallback={<Loader />}>
                    <DemoWorkspace />
                </Suspense>
            ) : (
                <Workspace />
            )}
        </div>
    )
}

export const App: FC = () => (
    <AppWrapper>
        <LinkedAnalytics />
        <CssVariables colors spacers theme elevations />
    </AppWrapper>
)
