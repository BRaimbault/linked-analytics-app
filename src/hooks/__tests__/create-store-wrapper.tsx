import { StoreProvider } from '@components/app-wrapper/store-provider'
import { CustomDataProvider } from '@dhis2/app-runtime'
import type { ComponentProps, FC, ReactNode } from 'react'

type CustomData = ComponentProps<typeof CustomDataProvider>['data']

export const createStoreWrapper = (data: CustomData) => {
    const StoreWrapper: FC<{ children: ReactNode }> = ({ children }) => (
        <CustomDataProvider data={data}>
            <StoreProvider>{children}</StoreProvider>
        </CustomDataProvider>
    )
    return StoreWrapper
}
