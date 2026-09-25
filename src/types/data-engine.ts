import type { ResponseErrorReport } from '@api/parse-engine-error'
import type {
    ContextType,
    ExecuteOptions,
    Query,
} from '@dhis2/app-service-data'

export type DataEngine = Omit<ContextType['engine'], 'query'> & {
    query(
        query: Query,
        options?: ExecuteOptions
    ): Promise<Record<keyof typeof query, unknown>>
}
export type QueryResult = Awaited<ReturnType<DataEngine['query']>>
export type MutationResult = {
    httpStatus: string
    httpStatusCode: number
    status: string
    response: {
        uid: string
        klass: string
        errorReports: Array<ResponseErrorReport>
        responseType: string
    }
}
