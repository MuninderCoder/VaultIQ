import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Plus,
  Bot,
  Sparkles,
  BookOpen,
  ExternalLink,
  Info,
  ShieldAlert
} from 'lucide-react';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';

export const ChatPage: React.FC = () => {
  const [prompt, setPrompt] = useState('');

  return (
    <div className="flex h-[calc(100vh-8.5rem)] rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
      {/* 1. Conversations Sidebar */}
      <div className="w-72 border-r border-slate-200 bg-slate-50/50 flex flex-col justify-between hidden md:flex">
        <div className="p-4 border-b border-slate-200/80">
          <Button
            variant="secondary"
            size="sm"
            className="w-full justify-start gap-2 shadow-xs"
            leftIcon={<Plus className="w-4 h-4 text-brand-600" />}
            disabled
          >
            New Thread (Phase 5)
          </Button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Threads
          </p>
          <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center">
            <MessageSquare className="w-5 h-5 text-slate-400 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">No saved conversations</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Thread persistence will activate in Phase 5
            </p>
          </div>
        </div>

        <div className="p-3 border-t border-slate-200 bg-white text-[11px] text-slate-500 flex items-center gap-2">
          <Info className="w-4 h-4 text-brand-600 flex-shrink-0" />
          <span>LLM inference pipeline active in Phase 5</span>
        </div>
      </div>

      {/* 2. Main Chat Area */}
      <div className="flex-1 flex flex-col justify-between bg-white">
        {/* Chat Header */}
        <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-brand-50 text-brand-600">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">
                  VaultIQ Knowledge Assistant
                </span>
                <Badge variant="default" size="sm">
                  Phase 1 Preview
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Grounded conversational intelligence with source citations
              </p>
            </div>
          </div>
        </div>

        {/* Messages Viewport / Empty State & Citation Preview */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          <div className="max-w-2xl mx-auto text-center py-6">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4 border border-brand-100 shadow-xs">
              <Sparkles className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Conversational Knowledge Assistant
            </h2>
            <p className="text-sm text-slate-500 mt-1.5 leading-relaxed max-w-md mx-auto">
              Ask natural-language questions across your company's documents and receive synthesized answers backed by verified source citations.
            </p>

            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                <strong>Strict Phase 1 Mode:</strong> No LLM models or mock answers are executed in this phase.
              </span>
            </div>
          </div>

          {/* Citation Card UI Component Specification Preview */}
          <div className="max-w-xl mx-auto">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-brand-600" />
                  Citation Component Architecture Preview
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  &lt;SourceCitation /&gt;
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-snug">
                When RAG is connected in Phase 5, assistant answers will provide direct, interactive citations formatted like this:
              </p>

              {/* Sample Citation Component */}
              <div className="p-3 rounded-lg border border-slate-200 bg-white shadow-xs hover:border-brand-400 transition-colors cursor-default">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded">
                      [1] Page 14 • Section 3.2
                    </span>
                    <h4 className="text-xs font-semibold text-slate-900 mt-1">
                      Enterprise_Data_Governance_Standard_2026.pdf
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 italic line-clamp-2">
                      "All corporate knowledge assets must maintain cryptographic verification and audit logging upon each query..."
                    </p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-1" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Input Prompt Box (Disabled in Phase 1 with explanation) */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/40">
          <form
            onSubmit={(e) => {
              e.preventDefault();
            }}
            className="relative flex items-center"
          >
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Knowledge Assistant will activate in Phase 5 after RAG pipeline implementation..."
              disabled
              className="w-full rounded-xl border border-slate-300 bg-slate-100 py-3 pl-4 pr-12 text-sm text-slate-500 cursor-not-allowed placeholder:text-slate-400 focus:outline-none"
            />
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled
              className="absolute right-2 px-3 py-1.5 rounded-lg"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
          <p className="text-[11px] text-slate-400 text-center mt-2">
            Phase 1 Foundation: Input disabled until document ingestion and vector retrieval are complete.
          </p>
        </div>
      </div>
    </div>
  );
};
