import React, { useState } from 'react';
import { Search, Sparkles, AlertCircle, FileText, Layers, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Card, CardContent } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { searchService } from '../services/searchService';
import { SearchResultItem } from '../types/document';

export const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [limit, setLimit] = useState<number>(10);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      setErrorMessage('Please enter a search query.');
      return;
    }

    setIsSearching(true);
    setErrorMessage(null);
    setHasSearched(true);

    try {
      const response = await searchService.searchSemantic(query, limit);
      if (response.success && response.data) {
        setSearchResults(response.data.results);
      } else {
        setSearchResults([]);
      }
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to execute semantic search.'
      );
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (score >= 0.6) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (score >= 0.4) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="pb-6 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Semantic Vector Search
          </h1>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
            <Sparkles className="w-3 h-3" /> Phase 4 Vector Engine
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Perform natural language similarity search across indexed document vector embeddings.
        </p>
      </div>

      {/* 2. Main Search Bar */}
      <form onSubmit={handleSearch} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Enter natural language query, topic, or question..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              leftIcon={<Search className="w-5 h-5 text-slate-400" />}
              className="text-base py-2.5"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              aria-label="Result limit"
              className="h-10 px-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-brand-500"
            >
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
              <option value={50}>Top 50</option>
            </select>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSearching}
              leftIcon={<Search className="w-4 h-4" />}
            >
              Semantic Search
            </Button>
          </div>
        </div>
      </form>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 3. Search Results */}
      {isSearching ? (
        <Card>
          <CardContent className="p-16 flex flex-col items-center justify-center">
            <LoadingSpinner size="lg" color="brand" />
            <p className="text-xs text-slate-500 font-medium mt-3">
              Calculating embedding & matching vector similarities...
            </p>
          </CardContent>
        </Card>
      ) : hasSearched && searchResults ? (
        searchResults.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span className="font-semibold uppercase tracking-wider">
                {searchResults.length} {searchResults.length === 1 ? 'Matching Chunk' : 'Matching Chunks'}
              </span>
              <span>Sorted by cosine similarity</span>
            </div>

            <div className="space-y-3">
              {searchResults.map((result) => (
                <div
                  key={result.chunkId}
                  className="p-5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-xs transition-colors space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 rounded-md bg-blue-50 text-blue-600 flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {result.documentName}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        <Layers className="w-3 h-3" /> Chunk #{result.chunkIndex + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getScoreColor(
                          result.score
                        )}`}
                      >
                        Similarity: {(result.score * 100).toFixed(1)}% ({result.score.toFixed(4)})
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/documents')}
                        leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
                      >
                        View Doc
                      </Button>
                    </div>
                  </div>

                  {/* Chunk Text Preview */}
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-wrap">
                    {result.text}
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400">
                    <span>{result.characterCount} characters</span>
                    <span>•</span>
                    <span>{result.wordCount} words</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="p-12">
              <EmptyState
                icon={<Search className="w-8 h-8 text-slate-400" />}
                title="No relevant chunks found"
                description={`No indexed documents matched your query "${searchQuery}". Make sure documents are processed and indexed.`}
                badgeText="Zero Matches"
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate('/documents')}
                  >
                    Go to Documents
                  </Button>
                }
              />
            </CardContent>
          </Card>
        )
      ) : (
        /* Initial State */
        <Card>
          <CardContent className="p-12">
            <EmptyState
              icon={<Sparkles className="w-8 h-8 text-brand-600" />}
              title="Semantic Vector Search Engine"
              description="VaultIQ generates 1536-dimensional vector embeddings for processed document chunks. Type any question, topic, or keyword above to find semantically relevant passages."
              badgeText="Vector Search Ready"
              action={
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Only indexed documents appear in semantic search results.</span>
                </div>
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};
