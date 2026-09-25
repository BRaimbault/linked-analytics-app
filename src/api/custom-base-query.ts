import type { Query, Mutation } from '@dhis2/app-service-data'
import type { BaseQueryFn, BaseQueryApi } from '@reduxjs/toolkit/query'
import type {
    DataEngine,
    MutationResult,
    QueryResult,
    SingleQuery,
} from '@types'
import type { EngineError } from './parse-engine-error'
import { parseEngineError } from './parse-engine-error'

// cater for both queries and mutations
export type EngineArgs = Query | Mutation | SingleQuery
type EngineResult = QueryResult | MutationResult | unknown
export type ThunkExtraArg = {
    engine: DataEngine
}
// Inform TS that an instance of the DataEngine is available on api.extra.engine
export type BaseQueryApiWithExtraArg = BaseQueryApi & { extra: ThunkExtraArg }
export type CustomBaseQueryFn = BaseQueryFn<
    EngineArgs,
    EngineResult,
    EngineError,
    object, // base query options
    BaseQueryApiWithExtraArg
>

const isMutation = (args: EngineArgs): args is Mutation =>
    typeof (args as Mutation).type === 'string'

const isSingleQuery = (args: EngineArgs): args is SingleQuery =>
    !isMutation(args) && typeof (args as SingleQuery).resource === 'string'

export const customBaseQuery: CustomBaseQueryFn = async (args, api) => {
    const { engine } = api.extra as ThunkExtraArg
    const options = { signal: api.signal }

    try {
        if (isMutation(args)) {
            const mutationResult = await engine.mutate(args, options)
            return { data: mutationResult ?? {} }
        } else if (isSingleQuery(args)) {
            const singleQueryResult = await engine.query(
                { data: args },
                options
            )
            return { data: singleQueryResult.data ?? {} }
        } else {
            const queryResult = await engine.query(args, options)
            return { data: queryResult ?? {} }
        }
    } catch (error: unknown) {
        return { error: parseEngineError(error) }
    }
}
