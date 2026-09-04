import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Send,
  Plus,
  Bot,
  User as UserIcon,
  Sparkles,
  BookOpen,
  ExternalLink,
  Trash2,
  AlertCircle,
  Layers
} from 'lucide-react';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { chatService } from '../services/chatService';
import { IConversationItem, IMessageItem } from '../types/chat';

export const ChatPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [conversations, setConversations] = useState<IConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<IMessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [statusPhase, setStatusPhase] = useState<'searching' | 'generating' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending, statusPhase]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // When active conversation changes, load messages
  useEffect(() => {
    if (activeConversationId) {
      loadConversationMessages(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  const loadConversations = async () => {
    setIsLoadingConversations(true);
    setErrorMessage(null);
    try {
      const res = await chatService.listConversations();
      if (res.success && res.data) {
        setConversations(res.data.conversations);
        if (res.data.conversations.length > 0 && !activeConversationId) {
          setActiveConversationId(res.data.conversations[0]._id);
        }
      }
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to load conversation history'
      );
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadConversationMessages = async (convId: string) => {
    setIsLoadingMessages(true);
    setErrorMessage(null);
    try {
      const res = await chatService.getConversation(convId);
      if (res.success && res.data) {
        setMessages(res.data.messages);
      }
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to load thread messages'
      );
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleCreateNewConversation = async () => {
    setErrorMessage(null);
    try {
      const res = await chatService.createConversation();
      if (res.success && res.data) {
        const newConv = res.data.conversation;
        setConversations((prev) => [newConv, ...prev]);
        setActiveConversationId(newConv._id);
        setMessages([]);
      }
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to create new conversation'
      );
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    try {
      await chatService.deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c._id !== convId));
      if (activeConversationId === convId) {
        const remaining = conversations.filter((c) => c._id !== convId);
        setActiveConversationId(remaining.length > 0 ? remaining[0]._id : null);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete conversation');
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || isSending) return;

    // Ensure we have an active conversation
    let targetConvId = activeConversationId;
    if (!targetConvId) {
      try {
        const res = await chatService.createConversation(
          text.length > 30 ? text.substring(0, 27) + '...' : text
        );
        if (res.success && res.data) {
          targetConvId = res.data.conversation._id;
          setActiveConversationId(targetConvId);
          setConversations((prev) => [res.data!.conversation, ...prev]);
        }
      } catch (err: any) {
        setErrorMessage(
          err.response?.data?.message || 'Failed to initialize conversation'
        );
        return;
      }
    }

    if (!targetConvId) return;

    // Optimistic user message append
    const tempUserMsg: IMessageItem = {
      _id: 'temp-' + Date.now(),
      conversation: targetConvId,
      owner: '',
      role: 'user',
      content: text,
      sources: [],
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setInputText('');
    setIsSending(true);
    setStatusPhase('searching');
    setErrorMessage(null);

    // Transition status message after 1.5s to "generating"
    const phaseTimer = setTimeout(() => {
      setStatusPhase('generating');
    }, 1200);

    try {
      const res = await chatService.sendMessage(targetConvId, text);
      clearTimeout(phaseTimer);

      if (res.success && res.data) {
        // Replace temp message with server confirmed messages
        setMessages((prev) => {
          const filtered = prev.filter((m) => m._id !== tempUserMsg._id);
          return [...filtered, res.data!.userMessage, res.data!.assistantMessage];
        });

        // Update thread title in sidebar if it was New Conversation
        setConversations((prev) =>
          prev.map((c) =>
            c._id === targetConvId && c.title === 'New Conversation'
              ? { ...c, title: text.length > 35 ? text.substring(0, 32) + '...' : text }
              : c
          )
        );
      }
    } catch (err: any) {
      clearTimeout(phaseTimer);
      setErrorMessage(
        err.response?.data?.message || err.message || 'Unable to generate an answer. Please try again.'
      );
    } finally {
      setIsSending(false);
      setStatusPhase(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const activeConv = conversations.find((c) => c._id === activeConversationId);

  return (
    <div className="flex h-[calc(100vh-8.5rem)] rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
      {/* 1. Conversations Sidebar */}
      <div className="w-72 border-r border-slate-200 bg-slate-50/50 flex flex-col justify-between hidden md:flex">
        <div className="p-3 border-b border-slate-200/80">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCreateNewConversation}
            className="w-full justify-start gap-2 shadow-xs bg-white hover:bg-slate-100"
            leftIcon={<Plus className="w-4 h-4 text-brand-600" />}
          >
            New Thread
          </Button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 p-3 overflow-y-auto space-y-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
            Conversations
          </p>

          {isLoadingConversations ? (
            <div className="py-8 flex flex-col items-center justify-center">
              <LoadingSpinner size="sm" color="brand" />
              <p className="text-xs text-slate-400 mt-2">Loading threads...</p>
            </div>
          ) : conversations.length > 0 ? (
            conversations.map((conv) => (
              <div
                key={conv._id}
                onClick={() => setActiveConversationId(conv._id)}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-xs ${
                  activeConversationId === conv._id
                    ? 'bg-brand-50/80 text-brand-900 font-semibold border border-brand-200'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <MessageSquare
                    className={`w-3.5 h-3.5 flex-shrink-0 ${
                      activeConversationId === conv._id ? 'text-brand-600' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{conv.title}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(e, conv._id)}
                  title="Delete Thread"
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1 rounded transition-all"
                  aria-label="Delete thread"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center">
              <MessageSquare className="w-5 h-5 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">No threads yet</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Click "New Thread" to start asking questions
              </p>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-200 bg-white text-[11px] text-slate-500 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-600 flex-shrink-0" />
          <span>Grounded RAG Pipeline Active</span>
        </div>
      </div>

      {/* 2. Main Chat Area */}
      <div className="flex-1 flex flex-col justify-between bg-white min-w-0">
        {/* Chat Header */}
        <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-brand-50 text-brand-600 flex-shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900 truncate">
                  {activeConv?.title || 'VaultIQ Knowledge Assistant'}
                </span>
                <Badge variant="success" size="sm">
                  Phase 5 RAG Active
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Grounded conversational intelligence with verified source citations
              </p>
            </div>
          </div>

          <div className="md:hidden">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCreateNewConversation}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              New Thread
            </Button>
          </div>
        </div>

        {/* Messages Viewport */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {isLoadingMessages ? (
            <div className="h-full flex flex-col items-center justify-center">
              <LoadingSpinner size="lg" color="brand" />
              <p className="text-xs text-slate-400 mt-3 font-medium">Loading thread messages...</p>
            </div>
          ) : messages.length === 0 ? (
            /* Empty State */
            <div className="max-w-xl mx-auto text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4 border border-brand-100 shadow-xs">
                <Sparkles className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Ask a question about your documents
              </h2>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed max-w-md mx-auto">
                VaultIQ retrieves semantic passages from your processed knowledge base and synthesizes concise, factual answers with source citations.
              </p>

              {/* Sample Prompts */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {[
                  'What is the company leave and vacation policy?',
                  'Explain the database and storage architecture.',
                  'Summarize the key compliance requirements.',
                  'What are the security and encryption procedures?'
                ].map((samplePrompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputText(samplePrompt);
                      textareaRef.current?.focus();
                    }}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-brand-50 hover:border-brand-200 text-xs text-slate-700 hover:text-brand-900 text-left transition-colors"
                  >
                    "{samplePrompt}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages List */
            <div className="space-y-6 max-w-3xl mx-auto">
              {messages.map((msg) => (
                <div
                  key={msg._id}
                  className={`flex gap-3.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Assistant Avatar */}
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`space-y-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    {/* Message Bubble */}
                    <div
                      className={`p-4 rounded-2xl text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-slate-900 text-white rounded-tr-xs'
                          : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-xs shadow-xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>

                    {/* Source Citations for Assistant Message */}
                    {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                      <div className="pt-2 space-y-2">
                        <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          <BookOpen className="w-3.5 h-3.5 text-brand-600" />
                          <span>Verified Sources ({msg.sources.length})</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.sources.map((src, srcIdx) => (
                            <div
                              key={srcIdx}
                              onClick={() => navigate('/documents')}
                              className="p-2.5 rounded-lg border border-slate-200 bg-white hover:border-brand-300 hover:shadow-xs transition-all cursor-pointer group"
                            >
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-[10px] font-semibold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded">
                                  Source [{srcIdx + 1}]
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  {(src.similarityScore * 100).toFixed(1)}% match
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-slate-900 truncate group-hover:text-brand-600 transition-colors">
                                {src.documentName}
                              </p>
                              <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Layers className="w-3 h-3" /> Chunk #{src.chunkIndex + 1}
                                </span>
                                <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-brand-600" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* User Avatar */}
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {/* In-Flight Status Indicator */}
              {isSending && (
                <div className="flex gap-3.5 justify-start">
                  <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 animate-pulse">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-3.5 rounded-2xl rounded-tl-xs bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2.5 shadow-xs">
                    <LoadingSpinner size="sm" color="brand" />
                    <span className="font-medium">
                      {statusPhase === 'searching'
                        ? 'Searching your indexed documents...'
                        : 'Synthesizing grounded answer...'}
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mx-6 mb-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Input Prompt Box */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/40">
          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto relative flex flex-col">
            <div className="relative">
              <textarea
                ref={textareaRef}
                rows={2}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your documents (e.g. policies, architecture, specs)..."
                disabled={isSending}
                className="w-full resize-none rounded-xl border border-slate-300 bg-white py-3 pl-4 pr-14 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-100 disabled:cursor-not-allowed shadow-xs"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!inputText.trim() || isSending}
                className="absolute right-2.5 bottom-3.5 px-3 py-1.5 rounded-lg"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 mt-1.5">
              <span>Press <kbd className="font-mono bg-slate-200 text-slate-700 px-1 rounded">Enter</kbd> to send, <kbd className="font-mono bg-slate-200 text-slate-700 px-1 rounded">Shift+Enter</kbd> for newline</span>
              <span>{inputText.length}/2000 chars</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

