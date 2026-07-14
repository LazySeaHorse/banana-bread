import { useEffect, useState } from "react";
import { Loader2, X, MessageCircle } from "lucide-react";
import { useChatStore } from "@/store/useChatStore";
import { ChatListSidebar } from "@/components/ChatListSidebar";
import { ChatView } from "@/components/ChatView";
import { AboutChatModal } from "@/components/AboutChatModal";
import { SettingsModal } from "@/components/SettingsModal";
import { cn } from "@/utils/cn";

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

  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [rightPanelWidth, setRightPanelWidth] = useState(360);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingRightPanel, setIsResizingRightPanel] = useState(false);

  const startResizeSidebar = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);
  };

  const startResizeRightPanel = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingRightPanel(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar) {
        const newWidth = Math.max(240, Math.min(500, e.clientX));
        setSidebarWidth(newWidth);
      }
      if (isResizingRightPanel) {
        const newWidth = Math.max(280, Math.min(600, window.innerWidth - e.clientX));
        setRightPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      setIsResizingRightPanel(false);
    };

    if (isResizingSidebar || isResizingRightPanel) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingSidebar, isResizingRightPanel]);

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
    <div className={cn(
      "h-dvh w-full overflow-hidden bg-white font-[system-ui] text-neutral-900 antialiased",
      (isResizingSidebar || isResizingRightPanel) && "cursor-col-resize select-none"
    )}>
      <div className="flex h-full w-full overflow-hidden bg-white">
        {/* sidebar: always visible on desktop, only when no chat open on mobile */}
        <div
          className={cn(
            "h-full shrink-0 md:block",
            activeChat ? "hidden md:block" : "w-full md:w-[360px]"
          )}
          style={activeChat ? { width: `${sidebarWidth}px` } : undefined}
        >
          <ChatListSidebar
            chats={index}
            activeChatId={activeChatId}
            onOpenChat={openChat}
            onImport={importFile}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </div>

        {/* Sidebar Resizer Gutter */}
        {activeChat && (
          <div
            onMouseDown={startResizeSidebar}
            className={cn(
              "hidden md:block w-1 hover:w-1.5 cursor-col-resize transition-all shrink-0 h-full border-r border-neutral-100 hover:bg-neutral-300 active:bg-neutral-400 z-30",
              isResizingSidebar && "bg-neutral-400 w-1.5"
            )}
          />
        )}

        {/* main pane */}
        <div
          className={cn(
            "h-full min-w-0 flex-1",
            activeChat ? "block" : "hidden md:block"
          )}
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

        {/* Right Panel Resizer Gutter */}
        {aboutOpen && activeChat && (
          <div
            onMouseDown={startResizeRightPanel}
            className={cn(
              "hidden lg:block w-1 hover:w-1.5 cursor-col-resize transition-all shrink-0 h-full border-l border-neutral-100 hover:bg-neutral-300 active:bg-neutral-400 z-30",
              isResizingRightPanel && "bg-neutral-400 w-1.5"
            )}
          />
        )}

        {/* third panel: About panel inline on desktop (lg breakpoint) */}
        {aboutOpen && activeChat && (
          <div
            className="hidden h-full shrink-0 lg:block"
            style={{ width: `${rightPanelWidth}px` }}
          >
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
