import { AppWrapper } from '@components/app-wrapper'
import i18n from '@dhis2/d2-i18n'
import { Center, CircularLoader, CssVariables, NoticeBox } from '@dhis2/ui'
import { useRtkQuery } from '@hooks'
import type { MeDto } from '@types'
import type { FC } from 'react'
import classes from './styles/app.module.css'

const LinkedAnalytics: FC = () => {
    const { data, error, isLoading } = useRtkQuery<Pick<MeDto, 'name'>>({
        resource: 'me',
        params: { fields: 'name' },
    })

    if (isLoading) {
        return (
            <Center>
                <CircularLoader />
            </Center>
        )
    }

    if (error) {
        return (
            <NoticeBox error title={i18n.t('Could not load the app')}>
                {error.message}
            </NoticeBox>
        )
    }

    return (
        <div className={classes.container} data-test="app-container">
            <h1 className={classes.title}>
                {i18n.t('Welcome, {{name}}!', {
                    name: data.name,
                    // React escapes text itself; i18next escaping would show entities literally
                    interpolation: { escapeValue: false },
                })}
            </h1>
            <p className={classes.subtitle}>
                {i18n.t(
                    'Your maps and charts are warming up. Soon they will sit side by side and finish each other’s sentences.'
                )}
            </p>
        </div>
    )
}

export const App: FC = () => (
    <AppWrapper>
        <LinkedAnalytics />
        <CssVariables colors spacers theme elevations />
    </AppWrapper>
)
