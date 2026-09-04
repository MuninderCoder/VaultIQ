import React, { useState } from 'react';
import { Search, Sparkles, Tag, Database } from 'lucide-react';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Card, CardContent } from '../components/Card';
import { EmptyState } from '../components/EmptyState';

export const SearchPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  const tags = [
    { id: 'all', label: 'All Knowledge' },
    { id: 'policies', label: 'Company Policies' },
    { id: 'engineering', label: 'Engineering Specs' },
    { id: 'compliance', label: 'Compliance & Legal' },
    { id: 'product', label: 'Product Roadmaps' }
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="pb-6 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Enterprise Search
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Unified lexical and semantic search across all indexed organizational knowledge.
        </p>
      </div>

      {/* 2. Main Search Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search across documents, technical specs, and policies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-5 h-5" />}
              className="text-base py-2.5"
            />
          </div>
          <Button
            variant="primary"
            onClick={() => {}}
            leftIcon={<Search className="w-4 h-4" />}
          >
            Search
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1 mr-1">
            <Tag className="w-3.5 h-3.5" /> Scope:
          </span>
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => setSelectedTag(tag.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedTag === tag.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Search Results Viewport & Architecture Placeholder */}
      <Card>
        <CardContent className="p-8">
          <EmptyState
            icon={<Sparkles className="w-7 h-7 text-brand-600" />}
            title="Semantic & Hybrid Search Ready"
            description="VaultIQ Phase 1 establishes the search layout and filter structures. Vector embeddings, BM25 indexing, and hybrid reciprocal rank fusion (RRF) will be integrated in Phase 4."
            badgeText="Phase 4 Vector Search"
            action={
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Database className="w-4 h-4 text-slate-500" />
                <span>Waiting for document ingestion (Phase 2) and vector database hook (Phase 4)</span>
              </div>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
};
