import { api } from '@api/api'
import type { RootState, AppDispatch, AppStore } from '@store/store'
// eslint-disable-next-line no-restricted-imports
import { useDispatch, useSelector, useStore } from 'react-redux'

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
export const useAppStore = useStore.withTypes<AppStore>()

/* Note that useRtkQuery and useRtkLazyQuery accept both a complex query object
 * (as useDataQuery from @dhis2/app-runtime) which can be used to query multiple
 * resource at once, as well as a simple query object which can be used to query
 * one resource at a time. The advantage of adding this is that you avoid having
 * to work with nested objects in the query definition or the data. */
export * from './use-rtk-query'
export * from './use-rtk-lazy-query'

export const { useMutateMutation: useRtkMutation } = api

export type UseRtkMutationResult = ReturnType<typeof useRtkMutation>
