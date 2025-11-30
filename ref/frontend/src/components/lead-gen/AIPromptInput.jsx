import React, { useState, useCallback } from 'react';
import { Button } from '../ui/primitives/button';
import { Textarea } from '../ui/primitives/textarea';
import { Badge } from '../ui/primitives/badge';
import { Slider } from '../ui/primitives/slider';
import { Label } from '../ui/primitives/label';
import { Checkbox } from '../ui/primitives/checkbox';
import {
  Sparkles,
  RefreshCw,
  CheckCircle,
  Lightbulb,
  Brain,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import leadsApiService from '../../services/leadsApi';

const AIPromptInput = ({
  onPreviewLeads,  // NEW: callback for preview workflow
  onProgressUpdate,
  onExecutionStatusUpdate,
  onStageUpdate
}) => {
  // Input states - initialize from sessionStorage
  const [prompt, setPrompt] = useState(() => {
    const cached = sessionStorage.getItem('lead_gen_prompt_input');
    return cached || '';
  });
  const [maxResults, setMaxResults] = useState(() => {
    const cached = sessionStorage.getItem('lead_gen_max_results');
    return cached ? [parseInt(cached, 10)] : [50];
  });

  // Processing states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isParsingPrompt, setIsParsingPrompt] = useState(false);
  const [parsedIntent, setParsedIntent] = useState(null);

  // Example prompts
  const examplePrompts = [
    "B2B SaaS companies in Toronto with 10–50 employees and recent Series A funding",
    "SMEs in Toronto hiring for software developers (indicates growth + budget)",
    "Home renovation companies in Mississauga doing kitchen/bath remodels, 5–20 employees",
    "Healthcare startups in Vancouver with recent funding rounds",
    "Manufacturing companies in Ontario with 50-200 employees expanding operations"
  ];

  // Cache prompt input whenever it changes
  React.useEffect(() => {
    sessionStorage.setItem('lead_gen_prompt_input', prompt);
  }, [prompt]);

  // Cache max results whenever it changes
  React.useEffect(() => {
    sessionStorage.setItem('lead_gen_max_results', maxResults[0].toString());
  }, [maxResults]);

  // Note: No cleanup function needed - sessionStorage automatically clears on page refresh
  // Cache persists when navigating between tabs within the same session

  const handleExampleClick = useCallback((example) => {
    setPrompt(example);
    setParsedIntent(null);
  }, []);

  const handleParsePrompt = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt first');
      return;
    }

    setIsParsingPrompt(true);
    try {
      const response = await leadsApiService.aiParsePrompt(prompt.trim());

      if (response.status === 'success') {
        setParsedIntent(response.intent);
        toast.success('Prompt parsed successfully! Review the extracted intent.');
      } else {
        toast.error(response.error || 'Failed to parse prompt');
        setParsedIntent(null);
      }
    } catch (error) {
      console.error('Error parsing prompt:', error);
      toast.error('Failed to parse prompt. Please try again.');
      setParsedIntent(null);
    } finally {
      setIsParsingPrompt(false);
    }
  }, [prompt]);

  const handleGenerateLeads = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a lead generation prompt');
      return;
    }

    setIsGenerating(true);
    onExecutionStatusUpdate?.(true);
    onProgressUpdate?.(0);
    onStageUpdate?.('Parsing natural language prompt...');

    try {
      // First, parse the prompt to get structured intent
      onProgressUpdate?.(10);
      onStageUpdate?.('Parsing natural language prompt...');

      const parseResponse = await leadsApiService.aiParsePrompt(prompt.trim());

      if (parseResponse.status !== 'success' || !parseResponse.intent) {
        throw new Error('Failed to parse prompt');
      }

      const intent = parseResponse.intent;
      setParsedIntent(intent);

      // Add maxResults from slider to parsed intent
      const intentWithMaxResults = {
        ...intent,
        max_results: maxResults[0]
      };

      // Now trigger the preview workflow with parsed intent
      onProgressUpdate?.(50);
      onStageUpdate?.('Searching for companies...');

      // Call the parent component's preview handler
      if (onPreviewLeads) {
        await onPreviewLeads(intentWithMaxResults);
      }

      onProgressUpdate?.(100);
      onStageUpdate?.('Preview search completed');

      toast.success(`Preview search completed! Review companies and select which to enrich.`);

    } catch (error) {
      console.error('AI lead generation error:', error);
      toast.error(`Preview search failed: ${error.message}`);
      onStageUpdate?.('Failed');
    } finally {
      setIsGenerating(false);
      onExecutionStatusUpdate?.(false);
    }
  }, [prompt, maxResults, onPreviewLeads, onProgressUpdate, onExecutionStatusUpdate, onStageUpdate]);

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
      <div className="px-7 py-6">
        <div className="mb-6">
          <h3 className="text-3xl font-black text-gray-900 mb-2">
            Lead Generation
          </h3>
          <p className="text-xs text-gray-600 mt-1">
            Describe your ideal leads in natural language and let AI find them
          </p>
        </div>

      <div className="space-y-4">
        {/* Main Prompt Input */}
        <div className="space-y-2">
          <Label htmlFor="ai-prompt" className="text-sm font-medium text-gray-700">
            Describe your ideal leads
          </Label>
          <Textarea
            id="ai-prompt"
            placeholder="Example: B2B SaaS companies in Toronto with 10–50 employees and recent Series A funding"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Example Prompts */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-600">Quick Examples:</Label>
          <div className="flex flex-wrap gap-2">
            {examplePrompts.slice(0, 3).map((example, index) => (
              <Badge
                key={index}
                variant="outline"
                className="cursor-pointer hover:bg-blue-50 hover:border-blue-300 text-xs py-1 px-2"
                onClick={() => handleExampleClick(example)}
              >
                <Lightbulb className="w-3 h-3 mr-1" />
                {example.split(' ').slice(0, 6).join(' ')}...
              </Badge>
            ))}
          </div>
        </div>

        {/* Parse Button */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleParsePrompt}
            disabled={isParsingPrompt || !prompt.trim()}
            className="flex items-center gap-2 text-blue-700 border-blue-300 bg-white hover:bg-blue-50"
          >
            {isParsingPrompt ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Brain className="w-4 h-4" />
            )}
            Test Understanding
          </Button>
        </div>

        {/* Parsed Intent Display */}
        {parsedIntent && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 relative">
            {/* Close Button */}
            <button
              onClick={() => setParsedIntent(null)}
              className="absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-700 hover:bg-blue-100 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900 mb-2">AI Understanding:</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  {/* Left Column: Industry, Location, Company Size */}
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium text-blue-900">Industry:</span>
                      {parsedIntent.industry ? (
                        <Badge variant="outline" className="ml-2 text-xs text-gray-500">
                          {parsedIntent.industry}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="ml-2 text-xs text-gray-400">
                          ——
                        </Badge>
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-blue-900">Location:</span>
                      {parsedIntent.location ? (
                        <Badge variant="outline" className="ml-2 text-xs text-gray-500">
                          {parsedIntent.location}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="ml-2 text-xs text-gray-400">
                          ——
                        </Badge>
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-blue-900">Company Size:</span>
                      {parsedIntent.company_size ? (
                        <Badge variant="outline" className="ml-2 text-xs text-gray-500">
                          {parsedIntent.company_size} employees
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="ml-2 text-xs text-gray-400">
                          ——
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Keywords */}
                  <div>
                    <div>
                      <span className="font-medium text-blue-900">Keywords:</span>
                      {parsedIntent.keywords && parsedIntent.keywords.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {parsedIntent.keywords.map((keyword, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs text-gray-500">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <Badge variant="outline" className="ml-2 text-xs text-gray-400">
                          ——
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <Badge
                    variant={parsedIntent.confidence === 'high' ? 'default' : parsedIntent.confidence === 'medium' ? 'secondary' : 'outline'}
                    className="text-xs text-blue-900"
                  >
                    {parsedIntent.confidence} confidence
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Options */}
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-600">
              Max Results: {maxResults[0]}
            </Label>
            <Slider
              value={maxResults}
              onValueChange={setMaxResults}
              max={300}
              min={1}
              step={1}
              className="w-full"
            />
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerateLeads}
          disabled={isGenerating || !prompt.trim()}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Searching Companies...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Search Companies
            </>
          )}
        </Button>

      </div>
      </div>
    </div>
  );
};

export default AIPromptInput;