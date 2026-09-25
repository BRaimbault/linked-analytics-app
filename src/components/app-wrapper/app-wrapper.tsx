import type { FC, ReactNode } from 'react'
import { StoreProvider } from './store-provider'
import '@locales/index.js'

export const AppWrapper: FC<{ children: ReactNode }> = ({ children }) => (
    <StoreProvider>{children}</StoreProvider>
)
