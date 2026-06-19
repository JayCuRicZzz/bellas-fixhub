'use client';

import { AuthProvider } from '@/components/authprovider';
import AIChat from '@/components/aichat';
import { Bot, Sparkles } from 'lucide-react';

export default function AIPage() {
  return (
    <AuthProvider>
      <div className="h-screen flex flex-col bg-navy-950">
        {/* Header */}
        <header className="bg-navy-800 border-b border-navy-700 px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center">
            <Bot className="w-6 h-6 text-navy-900" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              AI Maintenance Assistant
              <Sparkles className="w-4 h-4 text-gold-500" />
            </h1>
            <p className="text-xs text-gray-500">แจ้งซ่อมด้วยภาษาธรรมชาติ - AI ช่วยจัดการให้</p>
          </div>
        </header>

        {/* Chat area */}
        <div className="flex-1 overflow-hidden">
          <AIChat />
        </div>
      </div>
    </AuthProvider>
  );
}
