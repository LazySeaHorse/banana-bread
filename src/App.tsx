import { useEffect, useState } from "react";
import { Loader2, X, MessageCircle } from "lucide-react";
import { useChatStore } from "@/store/useChatStore";
import { ChatListSidebar } from "@/components/ChatListSidebar";
import { ChatView } from "@/components/ChatView";
import { AboutChatModal } from "@/components/AboutChatModal";
import { SettingsModal } from "@/components/SettingsModal";

export default function App() {
  const init = useChatStore((s) => s.init);
  const index = useChatStore((s) => s.index);
  const chats = useChatStore((s) => s.chats);
  const activeChatId = useChatStore((s) => s.activeChatId);
  const setActiveChat = useChatStore((s) => s.setActiveChat);
  const ensureLoaded = useChatStore((s) => s.ensureLoaded);
  const importFile = useChatStore((s) => s.importFile);
  const importProgress = useChatStore((s) => s.importProgress);
  const toast = useChatStore((s) => s.toast);
  const setToast = useChatStore((s) => s.setToast);

  const [aboutOpen, setAboutOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (activeChatId) ensureLoaded(activeChatId);
  }, [activeChatId, ensureLoaded]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast, setToast]);

  const activeChat = activeChatId ? chats[activeChatId] : null;

  const openChat = (id: string) => {
    setActiveChat(id);
    ensureLoaded(id);
  };

  return (
    <div className="h-dvh w-full overflow-hidden bg-white font-[system-ui] text-neutral-900 antialiased">
      <div className="flex h-full w-full overflow-hidden bg-white">
        {/* sidebar: always visible on desktop, only when no chat open on mobile */}
        <div
          className={`h-full w-full shrink-0 border-r border-neutral-100 md:block md:w-[360px] ${
            activeChat ? "hidden md:block" : "block"
          }`}
        >
          <ChatListSidebar
            chats={index}
            activeChatId={activeChatId}
            onOpenChat={openChat}
            onImport={importFile}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </div>

        {/* main pane */}
        <div
          className={`h-full min-w-0 flex-1 ${activeChat ? "block" : "hidden md:block"}`}
        >
          {activeChat ? (
            <ChatView
              key={activeChat.id}
              chat={activeChat}
              onBack={() => setActiveChat(null)}
              onOpenAbout={() => setAboutOpen(true)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-neutral-50 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#FCD34D] to-[#D97706]">
                <MessageCircle size={34} className="text-white" />
              </div>
              <h2 className="text-lg font-semibold text-neutral-700">
                Your Messages
              </h2>
              <p className="max-w-xs text-sm text-neutral-400">
                Select a chat, or import a new WhatsApp export to get started.
              </p>
            </div>
          )}
        </div>

        {/* third panel: About panel inline on desktop (lg breakpoint) */}
        {aboutOpen && activeChat && (
          <div className="hidden h-full w-[360px] shrink-0 border-l border-neutral-100 lg:block">
            <AboutChatModal
              chat={activeChat}
              onClose={() => setAboutOpen(false)}
              inline={true}
            />
          </div>
        )}
      </div>

      {aboutOpen && activeChat && (
        <div className="lg:hidden">
          <AboutChatModal
            chat={activeChat}
            onClose={() => setAboutOpen(false)}
            inline={false}
          />
        </div>
      )}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}

      {importProgress && (
        <div className="fixed bottom-4 left-1/2 z-50 flex w-[92%] max-w-sm -translate-x-1/2 items-center gap-3 rounded-2xl bg-neutral-900 px-4 py-3 text-white shadow-xl">
          <Loader2 size={18} className="shrink-0 animate-spin" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              Importing {importProgress.fileName}
            </p>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{
                  width: `${importProgress.total ? (importProgress.processed / importProgress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {toast && !importProgress && (
        <div className="fixed bottom-4 left-1/2 z-50 flex w-[92%] max-w-sm -translate-x-1/2 items-center justify-between gap-3 rounded-2xl bg-neutral-900 px-4 py-3 text-white shadow-xl">
          <p className="text-sm">{toast}</p>
          <button onClick={() => setToast(null)}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
