import i18n from '@dhis2/d2-i18n'
import {
    Button,
    ButtonStrip,
    Modal,
    ModalActions,
    ModalContent,
    ModalTitle,
} from '@dhis2/ui'
import type { FC } from 'react'

/* Asked before a tour replaces a workspace the user changed */
export const TourResetConfirm: FC<{
    onStart: () => void
    onCancel: () => void
}> = ({ onStart, onCancel }) => (
    <Modal small onClose={onCancel} dataTest="tour-reset-confirm">
        <ModalTitle>{i18n.t('Start the tour?')}</ModalTitle>
        <ModalContent>
            {i18n.t(
                "The tour starts from the demo's layout. Your views and settings will be replaced."
            )}
        </ModalContent>
        <ModalActions>
            <ButtonStrip end>
                <Button secondary onClick={onCancel}>
                    {i18n.t('Cancel')}
                </Button>
                <Button primary onClick={onStart}>
                    {i18n.t('Start the tour')}
                </Button>
            </ButtonStrip>
        </ModalActions>
    </Modal>
)
