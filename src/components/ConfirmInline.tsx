import { useI18n } from '../i18n';
import { Button } from './ui/Button';

interface ConfirmInlineProps {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** An inline "are you sure?" row, used instead of blocking browser dialogs. */
export function ConfirmInline({ message, confirmLabel, onConfirm, onCancel }: ConfirmInlineProps) {
  const { t } = useI18n();
  return (
    <div
      role="alertdialog"
      aria-label={message}
      className="flex animate-fade-up flex-col gap-3 rounded-2xl border border-alert/40 bg-alert/5 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-bone">{message}</p>
      <div className="flex shrink-0 gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} autoFocus>
          {t.common.cancel}
        </Button>
        <Button variant="danger" size="sm" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
