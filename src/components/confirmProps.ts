type DestructivePopconfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

export function getDestructivePopconfirmProps({
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
}: DestructivePopconfirmOptions) {
  return {
    title,
    description,
    okText: confirmLabel,
    cancelText: cancelLabel,
    okButtonProps: { danger: true },
  };
}
