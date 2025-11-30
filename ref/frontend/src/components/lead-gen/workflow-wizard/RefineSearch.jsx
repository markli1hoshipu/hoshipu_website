import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/primitives/button';
import { Input } from '../../ui/primitives/input';
import { Label } from '../../ui/primitives/label';
import { Badge } from '../../ui/primitives/badge';
import { Target, Loader2, Check, Info } from 'lucide-react';

const RefineSearch = ({
  query,
  parsedIntent,
  initialNumberOfLeads = 10,
  onComplete,
  onBack
}) => {
  const [isLoading, setIsLoading] = useState(() => {
    // Check if we have cached data on initial mount
    try {
      const cached = sessionStorage.getItem('leadgen_workflow_cache');
      if (cached) {
        const cacheData = JSON.parse(cached);
        // If we have parsedIntent cached, skip loading
        return !cacheData.parsedIntent;
      }
    } catch (error) {
      console.error('Error checking cache:', error);
    }
    return true; // Default to loading
  });

  const [numberOfLeads, setNumberOfLeads] = useState(initialNumberOfLeads);
  const [selectedKeywords, setSelectedKeywords] = useState(new Set());
  const [originalKeywords, setOriginalKeywords] = useState([]);

  // Initialize keywords - restore from cache or use all from parsedIntent
  useEffect(() => {
    if (parsedIntent?.keywords) {
      // Check cache for original keywords and selection state
      try {
        const cached = sessionStorage.getItem('leadgen_workflow_cache');
        if (cached) {
          const cacheData = JSON.parse(cached);
          if (cacheData.originalKeywords && cacheData.selectedKeywords) {
            // Restore from cache
            setOriginalKeywords(cacheData.originalKeywords);
            setSelectedKeywords(new Set(cacheData.selectedKeywords));
            return;
          }
        }
      } catch (error) {
        console.error('Error reading keyword cache:', error);
      }

      // First time - use all keywords from parsedIntent
      setOriginalKeywords(parsedIntent.keywords);
      setSelectedKeywords(new Set(parsedIntent.keywords));
    }
  }, [parsedIntent]);

  // Save numberOfLeads to cache whenever it changes
  // IMPORTANT: Don't preserve future step data
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('leadgen_workflow_cache');
      const cacheData = cached ? JSON.parse(cached) : {};
      const updatedCache = {
        query: cacheData.query || '',
        parsedIntent: cacheData.parsedIntent || null,
        numberOfLeads: numberOfLeads,
        // Don't preserve future step data - leave them as cleared
        previewResults: cacheData.previewResults || [],
        selectedCompanies: cacheData.selectedCompanies || [],
        enrichedResults: cacheData.enrichedResults || null,
        selectedLeads: cacheData.selectedLeads || []
      };
      sessionStorage.setItem('leadgen_workflow_cache', JSON.stringify(updatedCache));
    } catch (error) {
      console.error('Error saving numberOfLeads to cache:', error);
    }
  }, [numberOfLeads]);

  useEffect(() => {
    // Only show loading animation if we don't have cached data
    if (isLoading) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const toggleKeyword = (keyword) => {
    const updated = new Set(selectedKeywords);
    if (updated.has(keyword)) {
      updated.delete(keyword);
    } else {
      updated.add(keyword);
    }
    setSelectedKeywords(updated);

    // Save selection state to cache immediately
    try {
      const cached = sessionStorage.getItem('leadgen_workflow_cache');
      const cacheData = cached ? JSON.parse(cached) : {};
      cacheData.originalKeywords = originalKeywords;
      cacheData.selectedKeywords = Array.from(updated);
      sessionStorage.setItem('leadgen_workflow_cache', JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error saving keyword selection:', error);
    }
  };

  const handleContinue = () => {
    // Pass selected keywords to next step
    const updatedIntent = {
      ...parsedIntent,
      keywords: Array.from(selectedKeywords)
    };

    // Update cache with selected keywords
    try {
      const cached = sessionStorage.getItem('leadgen_workflow_cache');
      const cacheData = cached ? JSON.parse(cached) : {};
      cacheData.parsedIntent = updatedIntent;
      cacheData.numberOfLeads = numberOfLeads;
      cacheData.originalKeywords = originalKeywords; // Save full list
      cacheData.selectedKeywords = Array.from(selectedKeywords); // Save selection
      sessionStorage.setItem('leadgen_workflow_cache', JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error saving to cache:', error);
    }

    // Pass both numberOfLeads AND updated intent
    onComplete(numberOfLeads, updatedIntent);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
          <Target className="text-indigo-600" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-indigo-900 mb-2">Refine Search</h2>
        <p className="text-gray-600">
          Based on your search for "<span className="text-indigo-600 font-medium">{query}</span>"
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
          <p className="text-gray-600">AI is analyzing your query...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Keyword Cards */}
          <div className="space-y-4">
            <Label>Select industries that would use this lead:</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {originalKeywords && originalKeywords.length > 0 ? (
                originalKeywords.map((keyword, idx) => {
                  const isSelected = selectedKeywords.has(keyword);
                  return (
                    <button
                      key={idx}
                      onClick={() => toggleKeyword(keyword)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-300 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-gray-900">{keyword}</span>
                        {isSelected && <Check className="text-indigo-600" size={20} />}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="col-span-3 text-center text-gray-400 py-8">
                  No keywords extracted
                </div>
              )}
            </div>
          </div>

          {/* Number of Leads Input */}
          <div className="space-y-2">
            <Label htmlFor="numberOfLeads" className="text-sm font-medium text-gray-700">
              Number of leads to generate:
            </Label>
            <Input
              id="numberOfLeads"
              type="number"
              min="1"
              max="300"
              value={numberOfLeads}
              onChange={(e) => setNumberOfLeads(Number(e.target.value))}
              className="max-w-xs"
            />
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button variant="outline" onClick={onBack} className="border-gray-300">
              Back
            </Button>
            <Button onClick={handleContinue} className="bg-black hover:bg-gray-800 text-white">
              Continue
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefineSearch;
