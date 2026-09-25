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
    let engine: DataEngine

    beforeEach(() => {
        engine = {
            query: vi.fn().mockResolvedValue(mockQueryResult),
            mutate: vi.fn().mockResolvedValue(mockMutationResult),
        } as unknown as DataEngine
    })

    it('returns data for a successful query', async () => {
        const api = {
            extra: { engine },
            signal,
        } as unknown as BaseQueryApiWithExtraArg
        const result = await customBaseQuery(queryArgs, api, {})
        expect(engine.query).toHaveBeenCalledWith(queryArgs, { signal })
        expect(result).toEqual({ data: mockQueryResult })
    })

    it('returns data for a successful query with a non-nested query object', async () => {
        const singleQueryArgs = { resource: 'organisationUnits', id: 'abc123' }
        const singleQueryResult = { data: { orgUnit: 'abc123' } }
        // Mock engine.query to resolve with an object containing a data property
        const queryMock = engine.query as ReturnType<typeof vi.fn>
        queryMock.mockResolvedValueOnce(singleQueryResult)
        const api = {
            extra: { engine },
            signal,
        } as unknown as BaseQueryApiWithExtraArg
        const result = await customBaseQuery(singleQueryArgs, api, {})
        expect(engine.query).toHaveBeenCalledWith(
            { data: singleQueryArgs },
            { signal }
        )
        expect(result).toEqual({ data: singleQueryResult.data })
    })

    it('returns data for a successful mutation', async () => {
        const api = {
            extra: { engine },
            signal,
        } as unknown as BaseQueryApiWithExtraArg
        const result = await customBaseQuery(mutationArgs, api, {})
        expect(engine.mutate).toHaveBeenCalledWith(mutationArgs, { signal })
        expect(result).toEqual({ data: mockMutationResult })
    })

    it('returns empty object if result is nullish', async () => {
        const queryMock = engine.query as ReturnType<typeof vi.fn>
        queryMock.mockResolvedValueOnce(undefined)
        const api = {
            extra: { engine },
            signal,
        } as unknown as BaseQueryApiWithExtraArg
        const result = await customBaseQuery(queryArgs, api, {})
        expect(result).toEqual({ data: {} })
    })

    it('returns error if query throws', async () => {
        const errorMsg = 'Query failed'
        const queryMock = engine.query as ReturnType<typeof vi.fn>
        queryMock.mockRejectedValueOnce(new Error(errorMsg))
        const api = {
            extra: { engine },
            signal,
        } as unknown as BaseQueryApiWithExtraArg
        const result = await customBaseQuery(queryArgs, api, {})
        expect(result).toEqual({
            error: {
                type: 'runtime',
                message: errorMsg,
            },
        })
    })

    it('returns error if mutation throws non-Error', async () => {
        const mutateMock = engine.mutate as ReturnType<typeof vi.fn>
        mutateMock.mockRejectedValueOnce('fail')
        const api = {
            extra: { engine },
            signal,
        } as unknown as BaseQueryApiWithExtraArg
        const result = await customBaseQuery(mutationArgs, api, {})
        expect(result).toEqual({
            error: {
                type: 'runtime',
                message: 'An unexpected runtime error occurred',
            },
        })
    })
})
