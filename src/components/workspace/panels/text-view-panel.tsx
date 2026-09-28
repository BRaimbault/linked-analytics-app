import type { ViewPanelParams } from '@components/workspace/controller/panels'
import { IconButton } from '@components/workspace/tabs/icon-button'
import { RichTextEditor, RichTextParser } from '@dhis2/analytics'
import i18n from '@dhis2/d2-i18n'
import { Button, ButtonStrip, IconEdit16 } from '@dhis2/ui'
import type { IDockviewPanelProps } from 'dockview-react'
import { useEffect, useRef, useState, type FC } from 'react'
import classes from './styles/text-view.module.css'

/* The body height the editor needs: its toolbar, four lines of text and
 * the buttons. Any column is wide enough (see the text-view CSS). */
const HEIGHT_TO_EDIT = 180

/* The editor's pop-ups (the "@" user list, the emoji picker) open in a DHIS2
 * layer and don't close on Escape: while one is open, Escape must not throw
 * the note away */
const isEditorPopupOpen = (doc: Document): boolean =>
    doc.querySelector('[data-test="dhis2-uicore-layer"]') !== null

/* A text view: a title or a note in DHIS2's Markdown-style text (bold,
 * italics, links), edited in place. The text is kept in the panel's
 * params, which dockview keeps with the layout. */
export const TextViewPanel: FC<IDockviewPanelProps<ViewPanelParams>> = ({
    params,
    api,
}) => {
    const text = params.text ?? ''
    /* The text being written; null while reading */
    const [draft, setDraft] = useState<string | null>(null)
    /* A view too small for the editor is maximized while editing, then
     * put back */
    const maximizedToEdit = useRef(false)
    /* Closing the editor would drop the focus to the page: it goes back to
     * the edit button, if it was in the editor */
    const editButtonRef = useRef<HTMLDivElement>(null)
    const editorRef = useRef<HTMLDivElement>(null)
    const refocusEditButton = useRef(false)
    useEffect(() => {
        if (draft === null && refocusEditButton.current) {
            refocusEditButton.current = false
            editButtonRef.current?.querySelector('button')?.focus()
        }
    }, [draft])

    const startEditing = () => {
        maximizedToEdit.current =
            api.height < HEIGHT_TO_EDIT && !api.isMaximized()
        if (maximizedToEdit.current) {
            api.maximize()
        }
        setDraft(text)
    }
    const stopEditing = () => {
        if (maximizedToEdit.current && api.isMaximized()) {
            api.exitMaximized()
        }
        refocusEditButton.current = Boolean(
            editorRef.current?.contains(document.activeElement)
        )
        setDraft(null)
    }
    const save = () => {
        if (draft !== null && draft !== text) {
            api.updateParameters({ ...params, text: draft })
        }
        stopEditing()
    }

    if (draft !== null) {
        return (
            <div
                ref={editorRef}
                className={`${classes.textView} ${classes.editing}`}
                data-test="text-view"
                data-view-id={api.id}
                /* Escape discards, Ctrl+Enter (Cmd+Enter on a Mac) saves */
                onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                        if (
                            !isEditorPopupOpen(
                                event.currentTarget.ownerDocument
                            )
                        ) {
                            stopEditing()
                        }
                    } else if (
                        event.key === 'Enter' &&
                        (event.ctrlKey || event.metaKey)
                    ) {
                        save()
                    }
                }}
            >
                <div className={classes.editor}>
                    <RichTextEditor
                        value={draft}
                        onChange={setDraft}
                        resizable={false}
                        inputPlaceholder={i18n.t('Write a title or a note')}
                    />
                </div>
                <div className={classes.editActions}>
                    <ButtonStrip end>
                        <Button
                            small
                            secondary
                            dataTest="text-view-cancel"
                            onClick={stopEditing}
                        >
                            {i18n.t('Cancel')}
                        </Button>
                        <Button
                            small
                            primary
                            dataTest="text-view-done"
                            onClick={save}
                        >
                            {i18n.t('Done')}
                        </Button>
                    </ButtonStrip>
                </div>
            </div>
        )
    }

    return (
        <div
            className={`${classes.textView} ${classes.reading}`}
            data-test="text-view"
            data-view-id={api.id}
            /* Anywhere in the view; a single click may follow a link */
            onDoubleClick={startEditing}
        >
            <div className={classes.content}>
                {text ? (
                    <RichTextParser>{text}</RichTextParser>
                ) : (
                    <p className={classes.empty}>{i18n.t('No text yet')}</p>
                )}
            </div>
            <div ref={editButtonRef} className={classes.editButton}>
                <IconButton
                    label={i18n.t('Edit text')}
                    icon={<IconEdit16 />}
                    dataTest="text-view-edit"
                    onClick={startEditing}
                />
            </div>
        </div>
    )
}
