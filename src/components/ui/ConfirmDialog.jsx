// ConfirmDialog.jsx - Confirmation dialog using Vaul drawer
// Mobile-friendly bottom sheet for destructive actions

import { Drawer } from "vaul";
import { AlertTriangle } from "lucide-react";

export function ConfirmDialog({
  open,
  onClose,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "danger", // "danger" | "primary"
  onConfirm,
  icon,
}) {
  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  const confirmStyles = {
    danger: "bg-red-600 hover:bg-red-700 text-white",
    primary: "bg-[#ff6b2c] hover:bg-[#e55a1f] text-white",
  };

  return (
    <Drawer.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 outline-none">
          <div className="bg-[#1e1e1e] rounded-t-[20px] p-6 pb-8 border-t border-[#2a2a2a]">
            {/* Drag handle */}
            <div className="w-10 h-1 bg-[#444] rounded-full mx-auto mb-6" />

            {/* Icon */}
            <div className="flex justify-center mb-4">
              {icon || (
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle size={24} className="text-red-500" />
                </div>
              )}
            </div>

            {/* Title */}
            <Drawer.Title className="text-lg font-semibold text-white text-center mb-2">
              {title}
            </Drawer.Title>

            {/* Message */}
            {message && (
              <Drawer.Description className="text-sm text-[#888] text-center mb-6 max-w-[300px] mx-auto">
                {message}
              </Drawer.Description>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-transparent border border-[#444] hover:bg-[#252525] transition active:scale-[0.98]"
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition active:scale-[0.98] ${confirmStyles[confirmVariant]}`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

// Pre-configured confirm dialogs
export function DeleteConfirmDialog({ open, onClose, onConfirm, itemName }) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete this item?"
      message={itemName ? `This will permanently remove "${itemName}".` : "This action cannot be undone."}
      confirmText="Delete"
      confirmVariant="danger"
    />
  );
}

export function LogoutConfirmDialog({ open, onClose, onConfirm }) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Log out?"
      message="You'll need to sign in again to access the app."
      confirmText="Log Out"
      confirmVariant="primary"
    />
  );
}

export function ClearCacheConfirmDialog({ open, onClose, onConfirm }) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Clear local cache?"
      message="This will remove offline data. You'll need internet to reload."
      confirmText="Clear"
      confirmVariant="primary"
    />
  );
}

export function ClearAllConfirmDialog({ open, onClose, onConfirm, date }) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Clear all items?"
      message={`This will remove all schedule items, todos, and notes${date ? ` for ${date}` : ""}. This cannot be undone.`}
      confirmText="Clear All"
      confirmVariant="danger"
    />
  );
}

export default ConfirmDialog;
