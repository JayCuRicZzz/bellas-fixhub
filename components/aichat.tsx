'use client';
import { useX } from '../lib/i18n/extra';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from './authprovider';
import { ChatMessage } from '../types';
import { Send, Bot, User, Sparkles, Loader2, Ticket, AlertCircle, CheckCircle2 } from 'lucide-react';
import { BRANCHES } from '../types';

const QUICK_SUGGESTIONS = [
  'ห้อง 301 แอร์ไม่เย็น',
  'ห้อง 508 น้ำรั่วในห้องน้ำ',
  'ล็อบบี้ WiFi ใช้ไม่ได้',
  'ห้อง 1202 ไฟกระพริบ',
];

function welcomeText(user: any, tr: (k: string) => string) {
  const branch = user?.branch_code ? (BRANCHES.find(b => b.branch_code === user.branch_code)?.branch_name || user.branch_code) : '';
  return `${tr('ai_hello')}${user?.full_name ? ` ${user.full_name}` : ''}! 👋\n\n${tr('ai_intro')}${branch ? `\n\n${tr('ai_branchNow')}: ${branch}` : ''}`;
}

export default function AIChat() {
  const { user, token } = useAuth();
  const tr = useX();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: welcomeText(user, tr),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingTicket, setPendingTicket] = useState<any>(null);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  // ข้อมูลผู้ใช้โหลดทีหลัง → อัปเดตข้อความต้อนรับเมื่อได้ user (เดิมขึ้น "สาขาปัจจุบัน: undefined")
  useEffect(() => {
    setMessages(m => m.map(x => x.id === 'welcome' ? { ...x, content: welcomeText(user, tr) } : x));
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingTicket]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setPendingTicket(null);

    try {
      const history = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMsg.content,
          branch_code: user?.branch_code,
          history,
        }),
      });

      const data = await res.json();

      if (data.action === 'create_ticket' && data.ticket) {
        setPendingTicket(data.ticket);
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
          ticketPreview: data.ticket,
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
        };
        setMessages(prev => [...prev, aiMsg]);
      }

      // Add suggestions
      if (data.suggestions && data.suggestions.length > 0) {
        const suggestionsMsg: ChatMessage = {
          id: `suggestions-${Date.now()}`,
          role: 'assistant',
          content: data.suggestions.map((s: string) => s).join('\n'),
        };
        // Don't add as separate message, just append to last
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: tr('ai_connErr'),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTicket = async () => {
    if (!pendingTicket) return;
    setCreatingTicket(true);

    try {
      // First get category ID
      const catRes = await fetch(
        `/api/categories?dept_type=${encodeURIComponent(pendingTicket.department)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const cats = await catRes.json();

      let categoryId = 1;
      if (cats.length > 0) {
        const matchCat = cats.find(
          (c: any) =>
            c.main_th === pendingTicket.category ||
            c.sub_th === pendingTicket.category
        );
        categoryId = matchCat?.category_id || cats[0].category_id;
      }

      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          branch_code: pendingTicket.branch_code || user?.branch_code,
          category_id: categoryId,
          location_detail: pendingTicket.room_number,
          description: pendingTicket.description,
          priority: pendingTicket.priority || 'medium',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ticket_number) throw new Error(data.error || 'create failed');

      setPendingTicket(null);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `${tr('ai_done')}\n${tr('ai_ticketNo')}: ${data.ticket_number}\n${tr('ai_doneTail')}`,
        },
      ]);
    } catch (e: any) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `${tr('ai_fail')}${e?.message && e.message !== 'create failed' ? ` (${e.message})` : ''}`,
        },
      ]);
    } finally {
      setCreatingTicket(false);
    }
  };

  const handleCancelTicket = () => {
    setPendingTicket(null);
    setMessages(prev => [
      ...prev,
      {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: tr('ai_cancelled'),
      },
    ]);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-h-[800px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-gold-500" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-gold-500 text-navy-900 rounded-br-md'
                  : 'bg-navy-700 text-gray-200 rounded-bl-md'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-navy-600 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-gray-400" />
              </div>
            )}
          </div>
        ))}

        {/* Pending ticket confirmation */}
        {pendingTicket && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-gold-500" />
            </div>
            <div className="max-w-[80%] bg-navy-700 border border-gold-500/30 rounded-2xl rounded-bl-md p-4 space-y-3">
              <h4 className="text-sm font-semibold text-gold-500 flex items-center gap-2">
                <Ticket className="w-4 h-4" />
                {tr('ai_confirmTitle')}
              </h4>
              <div className="space-y-1.5 text-sm text-gray-300">
                <p>🏨 {tr('branch')}: {BRANCHES.find(b => b.branch_code === (pendingTicket.branch_code || user?.branch_code))?.branch_name}</p>
                <p>🚪 {tr('ai_room')}: {pendingTicket.room_number}</p>
                <p>🔧 {tr('d_dept')}: {pendingTicket.department}</p>
                <p>📋 {tr('d_category')}: {pendingTicket.category}</p>
                <p>⚡ {tr('d_priority')}: {pendingTicket.priority?.toUpperCase()}</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleConfirmTicket}
                  disabled={creatingTicket}
                  className="btn-primary text-sm py-1.5 px-4 flex items-center gap-1.5"
                >
                  {creatingTicket ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  {tr('ai_confirm')}
                </button>
                <button
                  onClick={handleCancelTicket}
                  disabled={creatingTicket}
                  className="btn-secondary text-sm py-1.5 px-4"
                >
                  {tr('b_cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-gold-500" />
            </div>
            <div className="bg-navy-700 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Quick suggestions */}
      {messages.length <= 1 && !loading && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-500 mb-2">{tr('ai_try')}</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => handleSuggestionClick(s)}
                className="text-xs px-3 py-1.5 bg-navy-700 hover:bg-navy-600 text-gray-400 hover:text-ink rounded-full transition-all duration-200"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-navy-700 p-4">
        <form
          onSubmit={e => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={tr('ai_ph')}
            className="input-field flex-1"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="btn-primary px-4"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <p className="text-xs text-gray-600 mt-2 text-center">
          {tr('ai_foot')}
        </p>
      </div>
    </div>
  );
}
