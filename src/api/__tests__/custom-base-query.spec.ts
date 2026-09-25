import type { Query, Mutation } from '@dhis2/app-service-data'
import type { DataEngine } from '@types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { customBaseQuery } from '../custom-base-query'
import type { BaseQueryApiWithExtraArg } from '../custom-base-query'

describe('customBaseQuery', () => {
    const mockQueryResult = { foo: 'bar' }
    const mockMutationResult = { baz: 'qux' }

    const queryArgs: Query = { me: { resource: 'users', params: { id: 1 } } }
    const mutationArgs: Mutation = {
        type: 'create',
        resource: 'users',
        data: { name: 'Alice' },
    }

    const { signal } = new AbortController()
    const query = vi.fn()
    const mutate = vi.fn()
    let api: BaseQueryApiWithExtraArg

    beforeEach(() => {
        query.mockResolvedValue(mockQueryResult)
        mutate.mockResolvedValue(mockMutationResult)
        const engine = { query, mutate } as unknown as DataEngine
        api = { extra: { engine }, signal } as BaseQueryApiWithExtraArg
    })

    it('returns data for a successful query', async () => {
        const result = await customBaseQuery(queryArgs, api, {})
        expect(query).toHaveBeenCalledWith(queryArgs, { signal })
        expect(result).toEqual({ data: mockQueryResult })
    })

    it('returns data for a successful query with a non-nested query object', async () => {
        const singleQueryArgs = { resource: 'organisationUnits', id: 'abc123' }
        const singleQueryResult = { data: { orgUnit: 'abc123' } }
        query.mockResolvedValueOnce(singleQueryResult)
        const result = await customBaseQuery(singleQueryArgs, api, {})
        expect(query).toHaveBeenCalledWith(
            { data: singleQueryArgs },
            { signal }
        )
        expect(result).toEqual({ data: singleQueryResult.data })
    })

    it('returns data for a successful mutation', async () => {
        const result = await customBaseQuery(mutationArgs, api, {})
        expect(mutate).toHaveBeenCalledWith(mutationArgs, { signal })
        expect(result).toEqual({ data: mockMutationResult })
    })

    it('returns empty object if result is nullish', async () => {
        query.mockResolvedValueOnce(undefined)
        const result = await customBaseQuery(queryArgs, api, {})
        expect(result).toEqual({ data: {} })
    })

    it('returns empty object if a single query has no data', async () => {
        query.mockResolvedValueOnce({})
        const result = await customBaseQuery(
            { resource: 'organisationUnits' },
            api,
            {}
        )
        expect(result).toEqual({ data: {} })
    })

    it('returns empty object if mutation result is nullish', async () => {
        mutate.mockResolvedValueOnce(undefined)
        const result = await customBaseQuery(mutationArgs, api, {})
        expect(result).toEqual({ data: {} })
    })

    it('returns error if query throws', async () => {
        query.mockRejectedValueOnce(new Error('Query failed'))
        const result = await customBaseQuery(queryArgs, api, {})
        expect(result).toEqual({
            error: {
                type: 'runtime',
                message: 'Query failed',
            },
        })
    })

    it('returns error if mutation throws non-Error', async () => {
        mutate.mockRejectedValueOnce('fail')
        const result = await customBaseQuery(mutationArgs, api, {})
        expect(result).toEqual({
            error: {
                type: 'runtime',
                message: 'An unexpected runtime error occurred',
            },
        })
    })
})
