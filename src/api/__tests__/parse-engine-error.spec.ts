import { FetchError } from '@dhis2/app-runtime'
import { describe, it, expect } from 'vitest'
import { parseEngineError } from '../parse-engine-error'
import type { ResponseErrorReport } from '../parse-engine-error'

const createErrorReport = (
    errorCode: string,
    message: string
): ResponseErrorReport => ({
    errorCode,
    errorKlass: 'org.hisp.dhis.dashboard.Dashboard',
    errorProperty: 'name',
    errorProperties: ['name'],
    mainKlass: 'org.hisp.dhis.dashboard.Dashboard',
    message,
    args: ['name'],
})

describe('parseEngineError', () => {
    it('parses a network FetchError', () => {
        const err = new FetchError({ type: 'network', message: 'Network down' })
        expect(parseEngineError(err)).toEqual({
            type: 'network',
            message: 'Network down',
        })
    })

    it('parses an access FetchError with details', () => {
        const err = new FetchError({
            type: 'access',
            message: 'Access denied',
            details: {
                httpStatusCode: 403,
                httpStatus: 'FORBIDDEN',
                errorCode: 'E403',
            },
        })
        expect(parseEngineError(err)).toEqual({
            type: 'access',
            message: 'Access denied',
            httpStatusCode: 403,
            httpStatus: 'FORBIDDEN',
            errorCode: 'E403',
        })
    })

    it('parses an unknown FetchError', () => {
        const err = new FetchError({
            type: 'unknown',
            message: 'Internal server error',
            details: {
                httpStatusCode: 500,
                httpStatus: 'ERROR',
                errorCode: 'E500',
            },
        })
        expect(parseEngineError(err)).toEqual({
            type: 'unknown',
            message: 'Internal server error',
            httpStatusCode: 500,
            httpStatus: 'ERROR',
            errorCode: 'E500',
        })
    })

    it('parses a FetchError with an unrecognised type as unknown', () => {
        const err = new FetchError({
            type: 'somethingElse',
            message: 'Oops',
        } as unknown as FetchError)
        expect(parseEngineError(err)).toEqual({
            type: 'unknown',
            message: 'Oops',
        })
    })

    it('falls back to a generic message for a FetchError without one', () => {
        const err = new FetchError({ type: 'network', message: '' })
        expect(parseEngineError(err)).toEqual({
            type: 'network',
            message: 'Unknown error',
        })
    })

    it('parses an Error as runtime', () => {
        const err = new Error('Some runtime error')
        expect(parseEngineError(err)).toEqual({
            type: 'runtime',
            message: 'Some runtime error',
        })
    })

    it('parses a non-Error as runtime', () => {
        expect(parseEngineError('fail')).toEqual({
            type: 'runtime',
            message: 'An unexpected runtime error occurred',
        })
    })

    it('keeps the uid and only the relevant error report fields', () => {
        const err = new FetchError({
            type: 'access',
            message: 'Access denied',
            details: {
                httpStatusCode: 403,
                httpStatus: 'FORBIDDEN',
                errorCode: 'E4000',
                response: {
                    uid: 'abc123',
                    errorReports: [
                        createErrorReport('E4000', 'Missing required name'),
                    ],
                },
            },
        })
        expect(parseEngineError(err)).toEqual({
            type: 'access',
            message: 'Access denied',
            httpStatusCode: 403,
            httpStatus: 'FORBIDDEN',
            errorCode: 'E4000',
            uid: 'abc123',
            errorReports: [
                {
                    errorCode: 'E4000',
                    errorProperty: 'name',
                    errorProperties: ['name'],
                    message: 'Missing required name',
                },
            ],
        })
    })

    it('takes the errorCode from a single error report when it is missing', () => {
        const err = new FetchError({
            type: 'access',
            message: 'Access denied',
            details: {
                response: {
                    errorReports: [createErrorReport('E456', 'Another error')],
                },
            },
        })
        const result = parseEngineError(err)
        expect(result.errorCode).toBe('E456')
        expect(result.errorCodes).toBeUndefined()
    })

    it('collects errorCodes from multiple error reports when errorCode is missing', () => {
        const err = new FetchError({
            type: 'access',
            message: 'Access denied',
            details: {
                response: {
                    errorReports: [
                        createErrorReport('E789', 'Error 1'),
                        createErrorReport('E101', 'Error 2'),
                    ],
                },
            },
        })
        const result = parseEngineError(err)
        expect(result.errorCode).toBeUndefined()
        expect(result.errorCodes).toEqual(['E789', 'E101'])
    })
})
