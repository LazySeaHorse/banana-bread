import { useState } from "react";
import { X, Trash2, HardDrive, AlertTriangle } from "lucide-react";
import { useChatStore } from "@/store/useChatStore";
import { estimateStorageUsage } from "@/lib/storage";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const clearAllStorage = useChatStore((s) => s.clearAllStorage);
  const index = useChatStore((s) => s.index);
  const [confirming, setConfirming] = useState(false);
  const usage = estimateStorageUsage();

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end bg-black/30 md:items-center md:justify-center">
      <div className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl md:h-auto md:max-h-[85vh] md:rounded-2xl">
        <div className="sticky top-0 flex items-center gap-3 border-b border-neutral-100 bg-white px-4 py-3">
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-900">
            <X size={20} />
          </button>
          <h2 className="text-[15px] font-semibold">Settings</h2>
        </div>

        <section className="border-b border-neutral-100 px-4 py-4">
          <h3 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            <HardDrive size={13} /> Storage
          </h3>
          <p className="text-sm text-neutral-600">
            {index.length} chat{index.length === 1 ? "" : "s"} saved locally, using approximately{" "}
            <b>{formatBytes(usage.bytes)}</b> of browser storage (gzip compressed).
          </p>
        </section>

        <section className="px-4 py-4">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Danger zone</h3>
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100"
            >
              <Trash2 size={16} /> Clear all local storage
            </button>
          ) : (
            <div className="rounded-xl bg-red-50 p-3">
              <p className="mb-3 flex items-start gap-2 text-sm text-red-700">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                This deletes every imported chat, edit, and reaction from this browser. This can't be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirming(false)}
                  className="flex-1 rounded-lg bg-white px-3 py-2 text-sm font-medium text-neutral-600 ring-1 ring-neutral-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    clearAllStorage();
                    setConfirming(false);
                    onClose();
                  }}
                  className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Yes, clear everything
                </button>
              </div>
            </div>
          )}
        </section>

        <p className="px-4 pb-4 text-center text-[11px] text-neutral-300">
          Chats never leave your browser — everything is parsed and stored locally.
        </p>
      </div>
    </div>
  );
}
