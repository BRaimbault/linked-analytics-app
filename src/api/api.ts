import type { Query, Mutation } from '@dhis2/app-service-data'
import { createApi } from '@reduxjs/toolkit/query/react'
import type { MutationResult, QueryResult, SingleQuery } from '@types'
import { customBaseQuery } from './custom-base-query'

export const api = createApi({
    reducerPath: 'api',
    baseQuery: customBaseQuery,
    endpoints: (builder) => ({
        query: builder.query<QueryResult | unknown, Query | SingleQuery>({
            query: (q) => q,
        }),
        mutate: builder.mutation<MutationResult, Mutation>({
            query: (m) => m,
        }),
    }),
})
