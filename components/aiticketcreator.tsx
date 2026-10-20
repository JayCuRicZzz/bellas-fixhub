'use client';
import { useX } from '../lib/i18n/extra';

import { useState } from 'react';
import { useAuth } from './authprovider';
import { BRANCHES } from '../types';
import { Sparkles, Send, Loader2, CheckCircle2, AlertCircle, Ticket } from 'lucide-react';

export default function AITicketCreator() {
  const { user, token } = useAuth();
  const x = useX();
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');

  const handleAnalyze = async () => {
    if (!description.trim() || loading) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/ai/classify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: description }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Classification failed');
      }
    } catch {
      setError(x('connError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!result) return;
    setCreating(true);

    try {
      // Get category ID
      const catRes = await fetch(
        `/api/categories?dept_type=${encodeURIComponent(result.department)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const cats = await catRes.json();
      let categoryId = cats.length > 0 ? cats[0].category_id : 1;

      const ticketRes = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          branch_code: user?.branch_code || 'BV',
          category_id: categoryId,
          location_detail: result.room_number || result.location || 'ไม่ระบุ',
          description: description,
          priority: result.priority || 'MEDIUM',
        }),
      });

      const ticketData = await ticketRes.json();
      if (ticketRes.ok) {
        setTicketNumber(ticketData.ticket_number);
        setResult(null);
        setDescription('');
      } else {
        setError(ticketData.error || x('ai_createFail'));
      }
    } catch {
      setError(x('ai_createFail'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-gold-500" />
        {x('ai_title')}
      </h3>

      {ticketNumber ? (
        <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-4 rounded-lg">
          <p className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            {x('ai_done')}
          </p>
          <p className="mt-1 text-sm">{x('ai_ticketNo')}: <strong>{ticketNumber}</strong></p>
          <button
            onClick={() => setTicketNumber('')}
            className="mt-3 text-sm text-green-400 hover:text-green-300 underline"
          >
            {x('newTicket')}
          </button>
        </div>
      ) : result ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-navy-700 rounded-lg p-3">
              <p className="text-gray-500 text-xs">{x('d_dept')}</p>
              <p className="text-ink font-medium">{result.department}</p>
            </div>
            <div className="bg-navy-700 rounded-lg p-3">
              <p className="text-gray-500 text-xs">{x('d_category')}</p>
              <p className="text-ink font-medium">{result.category}</p>
            </div>
            <div className="bg-navy-700 rounded-lg p-3">
              <p className="text-gray-500 text-xs">{x('d_priority')}</p>
              <p className="text-ink font-medium">{result.priority?.toUpperCase()}</p>
            </div>
            <div className="bg-navy-700 rounded-lg p-3">
              <p className="text-gray-500 text-xs">{x('ai_room')}</p>
              <p className="text-ink font-medium">{result.room_number || x('d_unknown')}</p>
            </div>
          </div>
          <p className="text-sm text-gray-400">📝 {result.summary}</p>

          <div className="flex gap-2">
            <button
              onClick={handleCreateTicket}
              disabled={creating}
              className="btn-primary text-sm flex items-center gap-2"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
              {x('ai_create')}
            </button>
            <button
              onClick={() => setResult(null)}
              className="btn-secondary text-sm"
            >
              {x('ai_reanalyse')}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={x('ai_inputPh')}
            className="input-field min-h-[100px] resize-y"
          />
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          <button
            onClick={handleAnalyze}
            disabled={!description.trim() || loading}
            className="btn-primary flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {x('ai_analysing')}
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                {x('ai_analyse')}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
