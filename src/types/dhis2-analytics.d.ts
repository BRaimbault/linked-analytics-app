/* @dhis2/analytics ships no types: these cover what the app uses, from the
 * components' propTypes */
declare module '@dhis2/analytics' {
    import type { CSSProperties, FC, ReactNode, RefAttributes } from 'react'

    export const RichTextEditor: FC<
        {
            value: string
            onChange: (value: string) => void
            disabled?: boolean
            errorText?: string
            helpText?: string
            initialFocus?: boolean
            inputPlaceholder?: string
            resizable?: boolean
        } & RefAttributes<HTMLTextAreaElement>
    >

    export const RichTextParser: FC<{
        children?: ReactNode
        style?: CSSProperties
    }>
}
