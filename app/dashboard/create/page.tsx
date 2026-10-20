'use client';
import { useX } from '../../../lib/i18n/extra';

import TicketForm from '../../../components/ticketform';
import AITicketCreator from '../../../components/aiticketcreator';
import { PlusCircle, Sparkles } from 'lucide-react';
import { useState } from 'react';

export default function CreateTicketPage() {
  const [mode, setMode] = useState<'manual' | 'ai'>('manual');
  const x = useX();

  return (
    <div className="max-w-3xl mx-auto space-y-6 fade-in">
      <div>
        <h2 className="text-2xl font-bold text-ink">{x('newTicket')}</h2>
        <p className="text-gray-400 mt-1">{x('newTicketSub')}</p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('manual')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            mode === 'manual'
              ? 'bg-gold-500 text-navy-900'
              : 'bg-navy-800 text-gray-400 hover:text-ink'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          {x('manualMode')}
        </button>
        <button
          onClick={() => setMode('ai')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            mode === 'ai'
              ? 'bg-gold-500 text-navy-900'
              : 'bg-navy-800 text-gray-400 hover:text-ink'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          {x('aiMode')}
        </button>
      </div>

      {mode === 'manual' ? (
        <div className="card">
          <TicketForm />
        </div>
      ) : (
        <AITicketCreator />
      )}
    </div>
  );
}
