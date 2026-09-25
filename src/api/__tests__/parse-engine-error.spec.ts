import { FetchError } from '@dhis2/app-runtime'
import { describe, it, expect } from 'vitest'
import { parseEngineError } from '../parse-engine-error'

describe('parseEngineError', () => {
    it('parses network FetchError', () => {
        const err = new FetchError({ type: 'network', message: 'Network down' })
        expect(parseEngineError(err)).toEqual({
            type: 'network',
            message: 'Network down',
        })
    })

    it('parses access FetchError with details', () => {
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

    it('parses unknown FetchError', () => {
        const err = new FetchError({
            type: 'unknown',
            message: 'Unknown error',
            details: {
                httpStatusCode: 500,
                httpStatus: 'ERROR',
                errorCode: 'E500',
            },
        })
        expect(parseEngineError(err)).toEqual({
            type: 'unknown',
            message: 'Unknown error',
            httpStatusCode: 500,
            httpStatus: 'ERROR',
            errorCode: 'E500',
        })
    })

    it('parses FetchError with unknown type', () => {
        const err = new FetchError({
            type: 'somethingElse',
            message: 'Oops',
        } as unknown as FetchError)
        expect(parseEngineError(err)).toEqual({
            type: 'unknown',
            message: 'Oops',
        })
    })

    it('parses Error as runtime', () => {
        const err = new Error('Some runtime error')
        expect(parseEngineError(err)).toEqual({
            type: 'runtime',
            message: 'Some runtime error',
        })
    })

    it('parses non-Error as runtime', () => {
        expect(parseEngineError('fail')).toEqual({
            type: 'runtime',
            message: 'An unexpected runtime error occurred',
        })
    })

    it('should extract uid and errorReports from details', () => {
        const err = new FetchError({
            type: 'access',
            message: 'Access denied',
            details: {
                httpStatusCode: 403,
                httpStatus: 'FORBIDDEN',
                response: {
                    uid: 'abc123',
                    errorReports: [
                        {
                            errorCode: 'E123',
                            errorKlass: 'klass',
                            errorProperty: 'prop',
                            errorProperties: ['prop'],
                            mainKlass: 'main',
                            message: 'Some error',
                            args: [],
                        },
                    ],
                },
            },
        })
        const result = parseEngineError(err)
        expect(result.uid).toBe('abc123')
        expect(result.errorReports).toHaveLength(1)
        expect(result.errorReports?.[0].errorCode).toBe('E123')
    })

    it('should set errorCode from a single errorReport if errorCode is missing', () => {
        const err = new FetchError({
            type: 'access',
            message: 'Access denied',
            details: {
                httpStatusCode: 403,
                httpStatus: 'FORBIDDEN',
                response: {
                    errorReports: [
                        {
                            errorCode: 'E456',
                            errorKlass: 'klass',
                            errorProperty: 'prop',
                            errorProperties: ['prop'],
                            mainKlass: 'main',
                            message: 'Another error',
                            args: [],
                        },
                    ],
                },
            },
        })
        const result = parseEngineError(err)
        expect(result.errorCode).toBe('E456')
        expect(result.errorCodes).toBeUndefined()
    })

    it('should set errorCodes from multiple errorReports if errorCode is missing', () => {
        const err = new FetchError({
            type: 'access',
            message: 'Access denied',
            details: {
                httpStatusCode: 403,
                httpStatus: 'FORBIDDEN',
                response: {
                    errorReports: [
                        {
                            errorCode: 'E789',
                            errorKlass: 'klass',
                            errorProperty: 'prop',
                            errorProperties: ['prop'],
                            mainKlass: 'main',
                            message: 'Error 1',
                            args: [],
                        },
                        {
                            errorCode: 'E101',
                            errorKlass: 'klass',
                            errorProperty: 'prop',
                            errorProperties: ['prop'],
                            mainKlass: 'main',
                            message: 'Error 2',
                            args: [],
                        },
                    ],
                },
            },
        })
        const result = parseEngineError(err)
        expect(result.errorCode).toBeUndefined()
        expect(result.errorCodes).toEqual(['E789', 'E101'])
    })
})
