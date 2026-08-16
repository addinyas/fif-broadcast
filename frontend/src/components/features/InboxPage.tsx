'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, MessageSquare, Send, Phone, ChevronLeft, Search, Save, Sparkles, History } from 'lucide-react';
import html2canvas from 'html2canvas';
import { aiService } from '@/services/aiService';
import { inboxService, type InboxConversation, type InboxMessage } from '@/services/inboxService';
import { getSocket } from '@/services/socketService';
import { useToast } from '@/components/ui/Toast';

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const hm = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return hm;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ` ${hm}`;
}

function formatPreviewDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  }
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function InboxPage() {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [active, setActive] = useState<InboxConversation | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [openLoading, setOpenLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [isMobileView, setIsMobileView] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);

  const handleSaveToDrive = useCallback(async () => {
    if (!active || !chatAreaRef.current) return;
    setSaving(true);
    try {
      const canvas = await html2canvas(chatAreaRef.current, { backgroundColor: '#ffffff', scale: 2 });
      const image = canvas.toDataURL('image/png');
      const url = await inboxService.saveToDrive(active.id, image);
      setActive((prev) => (prev ? { ...prev, drive_url: url } : prev));
      toast('success', 'Screenshot chat disimpan ke Google Drive');
    } catch {
      toast('error', 'Gagal menyimpan screenshot');
    } finally {
      setSaving(false);
    }
  }, [active, toast]);

  const loadConversations = useCallback(async () => {
    try {
      const data = await inboxService.getConversations();
      setConversations(data);
      if (data.length > 0 && !active) {
        setActive(data[0]);
      }
    } catch {
      toast('error', 'Gagal memuat inbox');
    } finally {
      setLoading(false);
    }
  }, [active, toast]);

  const handleBackfill = useCallback(async () => {
    setBackfilling(true);
    try {
      const { chats, messages } = await inboxService.backfill();
      await loadConversations();
      toast('success', `Muat ${chats} chat lama selesai (${messages} pesan)`);
    } catch {
      toast('error', 'Gagal memuat chat lama (pastikan WhatsApp terhubung)');
    } finally {
      setBackfilling(false);
    }
  }, [loadConversations, toast]);

  const handleSuggestReply = useCallback(async () => {
    const lastInbound = [...messages].reverse().find((m) => m.direction === 'inbound');
    if (!lastInbound) return;
    setSuggesting(true);
    try {
      const reply = await aiService.suggestReply(lastInbound.body, active?.contact_name ?? undefined);
      if (reply) setDraft(reply);
    } catch {
      toast('error', 'Gagal generate saran (cek pengaturan AI)');
    } finally {
      setSuggesting(false);
    }
  }, [messages, active, toast]);

  useEffect(() => {
    setIsMobileView(window.innerWidth < 768);
    const onResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const openConversation = useCallback(async (c: InboxConversation) => {
    setActive(c);
    setOpenLoading(true);
    try {
      const res = await inboxService.getConversation(c.id);
      setMessages(res.messages);
      setActive((prev) => (prev && prev.id === c.id ? { ...prev, drive_url: res.data.drive_url } : prev));
    } catch {
      toast('error', 'Gagal memuat percakapan');
    } finally {
      setOpenLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (active) openConversation(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  useEffect(() => {
    const socket = getSocket();
    const handler = (msg: InboxMessage) => {
      setMessages((prev) => {
        if (active && msg.conversation_id !== active.id) return prev;
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setConversations((prev) => {
        const target = prev.find((c) => c.id === msg.conversation_id);
        if (target) {
          const updated = { ...target, last_message: msg.body, last_message_at: msg.created_at, unread_count: target.unread_count + (msg.direction === 'inbound' ? 1 : 0) };
          return [updated, ...prev.filter((c) => c.id !== msg.conversation_id)];
        }
        return prev;
      });
    };
    socket.on('inbox:new', handler);
    return () => { socket.off('inbox:new', handler); };
  }, [active]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !active) return;
    setSending(true);
    try {
      await inboxService.reply(active.id, text);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          conversation_id: active.id,
          direction: 'outbound',
          body: text,
          wa_message_id: null,
          is_read: true,
          status: 'pending',
          created_at: new Date().toISOString(),
        } as InboxMessage,
      ]);
      setDraft('');
    } catch {
      toast('error', 'Gagal mengirim balasan');
    } finally {
      setSending(false);
    }
  };

  const filtered = conversations.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (c.contact_name || '').toLowerCase().includes(q) || (c.contact_phone || '').toLowerCase().includes(q);
  });

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-fif-600" /></div>;
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4 md:h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Inbox</h1>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            Balasan customer dari WhatsApp{totalUnread > 0 ? ` — ${totalUnread} belum dibaca` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={handleBackfill}
          disabled={backfilling}
          title="Muat chat lama dari aplikasi WhatsApp"
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
        >
          {backfilling ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />}
          Muat Chat Lama
        </button>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-slate-700/80 dark:bg-slate-800/90">
        {/* Conversation list */}
        <div className={`w-full flex-col border-r border-slate-100 dark:border-slate-700/50 md:flex md:w-80 md:shrink-0 ${active && isMobileView ? 'hidden' : 'flex'}`}>
          <div className="p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama / nomor..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition-all focus:border-fif-500 focus:bg-white focus:ring-2 focus:ring-fif-500/20 dark:border-slate-600 dark:bg-slate-700 dark:focus:border-fif-400 dark:focus:bg-slate-600"
              />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-6 text-center">
                <MessageSquare className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="mt-2 text-xs text-slate-400">Belum ada percakapan</p>
              </div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => openConversation(c)}
                  className={`flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition-colors ${
                    active?.id === c.id
                      ? 'border-fif-600 bg-fif-50/60 dark:bg-fif-500/10'
                      : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/30'
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fif-100 font-bold text-fif-600 dark:bg-fif-500/20 dark:text-fif-400">
                    {(c.contact_name || c.contact_phone || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {c.contact_name || c.contact_phone || 'Unknown'}
                      </p>
                      <span className="shrink-0 text-[10px] text-slate-400">{formatPreviewDate(c.last_message_at)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-slate-400 dark:text-slate-500">{c.last_message}</p>
                      {(c.unread_count || 0) > 0 && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-fif-600 px-1.5 text-[10px] font-bold text-white">
                          {c.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat panel */}
        <div className={`flex-1 flex-col md:flex ${active && isMobileView ? 'flex' : 'hidden'}`}>
          {!active ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <MessageSquare className="mx-auto h-10 w-10 text-slate-200 dark:text-slate-700" />
                <p className="mt-2 text-sm text-slate-400">Pilih percakapan untuk mulai membalas</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-700/50">
                {isMobileView && (
                  <button type="button" onClick={() => setActive(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fif-100 font-bold text-fif-600 dark:bg-fif-500/20 dark:text-fif-400">
                  {(active.contact_name || active.contact_phone || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {active.contact_name || 'Unknown'}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-slate-400">
                    <Phone className="h-3 w-3" />
                    {active.contact_phone || active.remote_jid}
                  </p>
                </div>
                {active.drive_url ? (
                  <a
                    href={active.drive_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400"
                  >
                    Lihat di Drive
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveToDrive}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-lg bg-fif-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-fif-700 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Simpan ke Drive
                  </button>
                )}
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/50 p-4 dark:bg-slate-900/30" ref={chatAreaRef}>
                {openLoading ? (
                  <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-fif-600" /></div>
                ) : messages.length === 0 ? (
                  <p className="pt-10 text-center text-xs text-slate-400">Belum ada pesan</p>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                        m.direction === 'outbound'
                          ? 'rounded-br-sm bg-fif-600 text-white'
                          : 'rounded-bl-sm border border-slate-200/60 bg-white dark:border-slate-700 dark:bg-slate-700'
                      }`}>
                        <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
                        <p className={`mt-1 text-right text-[10px] ${m.direction === 'outbound' ? 'text-fif-200/70' : 'text-slate-400'}`}>
                          {formatTime(m.created_at)}
                          {m.direction === 'outbound' && (
                            m.status === 'failed' ? <span className="ml-1 text-red-300">Gagal</span>
                            : m.status === 'pending' ? <span className="ml-1 opacity-70">...</span>
                            : <span className="ml-1">✓</span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              <div className="flex items-end gap-2 border-t border-slate-100 p-3 dark:border-slate-700/50">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={1}
                  placeholder="Ketik balasan..."
                  className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-fif-500 focus:bg-white focus:ring-2 focus:ring-fif-500/20 dark:border-slate-600 dark:bg-slate-700 dark:focus:border-fif-400 dark:focus:bg-slate-600"
                />
                <button
                  type="button"
                  onClick={handleSuggestReply}
                  disabled={suggesting}
                  title="Saran balasan AI"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-fif-600 transition hover:bg-fif-50 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-700 dark:text-fif-400"
                >
                  {suggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending || !draft.trim()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fif-600 text-white shadow-md shadow-fif-600/20 transition-all hover:bg-fif-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
