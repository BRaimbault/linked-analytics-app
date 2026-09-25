/* ONLY PLACE GENERAL TYPES HERE WHICH ARE USED THROUGHOUT THE APP
 * Types exported from here can be imported as follows:
 * `import type { MyType } from '@types'` */
/* We have an ESLint rule in place to only allows imports from
 * `src/types/dhis2-openapi-schemas` from the `src/types` dir.
 * The reason for this is so that we can apply manual overrides
 * for generated types here. Anything that is needed from the generated
 * types should be explicitly exported here. */
export type { DataEngine, QueryResult, MutationResult } from './data-engine'
export type { MeDto } from './dhis2-openapi-schemas'

/* The SingleQuery type is a simpler, but for our use-case functionally
 * equivalent, representation of the ResourceQuery internal to
 * @dhis2/app-service-data. The Query and Mutation types in that lib have
 * support for dynamic variables (functions), which we do not need because
 * RTK Query allows query object to be produced during runtime. */
export type SingleQuery = {
    resource: string
    id?: string
    data?: object | string
    params?: Record<
        string,
        number | string | boolean | Array<number | string | boolean>
    >
}
export type { AppStore, AppDispatch, RootState } from '@store/store'
