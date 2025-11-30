import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '../../ui/primitives/button';
import { Textarea } from '../../ui/primitives/textarea';
import { Badge } from '../../ui/primitives/badge';
import { Label } from '../../ui/primitives/label';
import { Sparkles, Lightbulb, Brain, RefreshCw, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import leadsApiService from '../../../services/leadsApi';

const DefineLeads = ({ onComplete, initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery);
  const [isProcessing, setIsProcessing] = useState(false);

  // Save query to cache whenever it changes (auto-save on typing)
  // IMPORTANT: Only update the query field, don't preserve other fields
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('leadgen_workflow_cache');
      const cacheData = cached ? JSON.parse(cached) : {};
      // Only update query, preserve parsedIntent and numberOfLeads from this step
      const updatedCache = {
        query: query,
        parsedIntent: cacheData.parsedIntent || null,
        numberOfLeads: cacheData.numberOfLeads || 10,
        // Don't preserve future step data - leave them as cleared
        previewResults: cacheData.previewResults || [],
        selectedCompanies: cacheData.selectedCompanies || [],
        enrichedResults: cacheData.enrichedResults || null,
        selectedLeads: cacheData.selectedLeads || []
      };
      sessionStorage.setItem('leadgen_workflow_cache', JSON.stringify(updatedCache));
    } catch (error) {
      console.error('Error saving query to cache:', error);
    }
  }, [query]);

  // Example prompts
  const examplePrompts = [
    'Forklift dealers in Cleveland, Ohio',
    'Solar panels in California',
    'Commercial HVAC in Texas'
  ];

  const handleExampleClick = useCallback((example) => {
    setQuery(example);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (!query.trim()) {
      toast.error('Please enter a description of your ideal leads');
      return;
    }

    setIsProcessing(true);

    try {
      // Parse the natural language query
      const response = await leadsApiService.aiParsePrompt(query.trim());

      if (response.status === 'success' && response.intent) {
        toast.success('Query understood! Proceeding to next step...');
        // Pass query and parsed intent to parent
        onComplete(query, response.intent);
      } else {
        toast.error(response.error || 'Failed to understand query. Please try rephrasing.');
      }
    } catch (error) {
      console.error('Error parsing query:', error);
      toast.error('Failed to process query. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [query, onComplete]);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
          <Sparkles className="text-indigo-600" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-indigo-900 mb-2">What leads do you want?</h2>
        <p className="text-gray-600">
          Describe the type of leads you're looking for, including location and industry
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Query Input */}
        <div className="space-y-2">
          <div className="relative">
            <Textarea
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., Forklift dealers in Cleveland, Ohio"
              className="min-h-[120px] pr-16 resize-none text-base bg-gray-100 border-2 border-transparent focus:border-gray-300 transition-colors placeholder:text-gray-500"
              disabled={isProcessing}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!query.trim() || isProcessing}
              className="absolute bottom-3 right-3 bg-black hover:bg-gray-800 text-white"
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </Button>
          </div>
        </div>

        {/* Example Prompts */}
        <div className="space-y-3">
          <p className="text-sm text-gray-500 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Try these examples:
          </p>
          <div className="flex flex-wrap gap-2">
            {examplePrompts.map((example, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleExampleClick(example)}
                disabled={isProcessing}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
};

export default DefineLeads;
