// Enhanced ChatWindow
import React, { useState, useRef, useEffect, memo } from 'react';
import { Send, Bot, User, Loader2, ChevronDown, ChevronRight, Settings, Copy, Check, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { Button } from '../../components/ui/primitives/button';
import { motion, AnimatePresence } from 'framer-motion';

// Enhanced Message component
const Message = memo(({ message, isLast }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showTimestamp, setShowTimestamp] = useState(false);
  const isUser = message.from === 'user';
  const isTool = message.from === 'tool';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  if (isTool) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center my-2"
      >
        <div className="w-full max-w-md">
          <div
            className={`text-xs bg-prelude-50 border border-prelude-200 rounded-lg p-3 ${
              message.expandable ? 'cursor-pointer hover:bg-prelude-100 transition-colors' : ''
            }`}
            onClick={message.expandable ? () => setIsExpanded(!isExpanded) : undefined}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-3 h-3 text-prelude-600" />
                <span className="text-prelude-800 font-medium">{message.text}</span>
              </div>
              {message.expandable && (
                <div className="text-prelude-600">
                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </div>
              )}
            </div>
            
            <AnimatePresence>
              {isExpanded && message.details && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 pt-3 border-t border-prelude-200"
                >
                  <div className="text-prelude-700 space-y-2">
                    {message.details.type === 'call' && (
                      <>
                        <div>
                          <strong>Function:</strong> 
                          <span aria-label={`Function name: ${message.details.function_name}`}>
                            {message.details.function_name}
                          </span>
                        </div>
                        <div><strong>ID:</strong> {message.details.invocation_id}</div>
                        {message.details.args && (
                          <div>
                            <strong>Arguments:</strong>
                            <pre className="mt-1 text-xs bg-prelude-100 p-2 rounded overflow-x-auto">
                              {JSON.stringify(message.details.args, null, 2)}
                            </pre>
                          </div>
                        )}
                      </>
                    )}
                    {message.details.type === 'response' && (
                      <>
                        <div><strong>Function:</strong> {message.details.function_name}</div>
                        <div><strong>ID:</strong> {message.details.invocation_id}</div>
                        {message.details.response && (
                          <div>
                            <strong>Response:</strong>
                            <pre className="mt-1 text-xs bg-prelude-100 p-2 rounded overflow-x-auto">
                              {JSON.stringify(message.details.response, null, 2)}
                            </pre>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    );
  }


  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-4`}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-prelude-800' : 'bg-prelude-600'
      }`}>
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div className={`max-w-[70%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div 
          className={`group relative px-4 py-2 rounded-2xl ${
            isUser 
              ? 'bg-prelude-800 text-white' 
              : 'bg-prelude-50 text-prelude-900 border border-prelude-200'
          }`}
          onMouseEnter={() => setShowTimestamp(true)}
          onMouseLeave={() => setShowTimestamp(false)}
        >
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className={`absolute top-1 ${isUser ? 'left-1' : 'right-1'} opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded ${
              isUser 
                ? 'hover:bg-prelude-700 text-prelude-200' 
                : 'hover:bg-prelude-100 text-prelude-600'
            }`}
            title="Copy message"
          >
            {isCopied ? (
              <Check className="w-3 h-3" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
          <div className={`prose prose-sm max-w-none ${
            isUser ? 'prose-invert' : ''
          }`}>
            <ReactMarkdown
              rehypePlugins={[rehypeSanitize]}
              components={{
              p: ({ children }) => <p className="my-0">{children}</p>,
              a: ({ children, href }) => (
                <a 
                  href={href} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={isUser ? 'text-prelude-200 underline hover:text-white' : 'text-prelude-700 underline hover:text-prelude-900'}
                >
                  {children}
                </a>
              ),
              code: ({ children }) => (
                <code className={`px-1 py-0.5 rounded text-sm ${
                  isUser ? 'bg-prelude-700' : 'bg-prelude-100'
                }`}>
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className={`p-2 rounded-lg overflow-x-auto text-sm my-2 ${
                  isUser ? 'bg-prelude-700' : 'bg-prelude-100'
                }`}>
                  {children}
                </pre>
              ),
            }}
          >
            {message.text}
          </ReactMarkdown>
          </div>
        </div>

        {/* Timestamp and status */}
        <div className={`flex items-center gap-1 mt-1 text-xs text-gray-500 ${
          isUser ? 'flex-row-reverse' : 'flex-row'
        } ${showTimestamp || isLast ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}>
          {message.timestamp && (
            <>
              <Clock className="w-3 h-3" />
              <span>{formatTimestamp(message.timestamp)}</span>
            </>
          )}
          {message.status && (
            <span className={`text-xs px-1 py-0.5 rounded ${
              message.status === 'sent' ? 'text-blue-600' :
              message.status === 'received' ? 'text-green-600' :
              'text-gray-500'
            }`}>
              {message.status}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
});

Message.displayName = 'Message';

// Quick suggestions component
const QuickSuggestions = memo(({ onSuggestionClick, context = 'calendar' }) => {
  const getContextSuggestions = (context) => {
    const suggestions = {
      leads: [
        "How can I generate new leads?",
        "What lead sources are available?",
        "Show me lead conversion metrics",
        "Help me qualify prospects"
      ],
      'sales-center': [
        "What sales tools are available?", 
        "Show me sales performance metrics",
        "How do I track deal pipeline?",
        "Help me with sales training"
      ],
      crm: [
        "How do I manage customer relationships?",
        "Show me customer analytics",
        "Help me track customer interactions",
        "What CRM features are available?"
      ],
      employees: [
        "How do I manage team assignments?",
        "Show me employee performance data",
        "Help me match skills to customers",
        "What team management tools exist?"
      ],
      calendar: [
        "Help me schedule meetings",
        "Show me calendar integrations", 
        "How do I manage appointments?",
        "What scheduling features are available?"
      ],
      'usage-analytics': [
        "Show me platform usage statistics",
        "What analytics are available?",
        "Help me track user engagement",
        "Generate usage reports"
      ]
    };
    
    // Always include these general questions
    const generalSuggestions = [
      "What tools do you have?",
      "Give me a summary of the program"
    ];
    
    const contextSpecific = suggestions[context] || suggestions.calendar;
    
    // Return 2 context-specific + 2 general suggestions
    return [
      ...contextSpecific.slice(0, 2),
      ...generalSuggestions
    ];
  };

  const suggestions = getContextSuggestions(context);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="mt-6 space-y-2"
    >
      <p className="text-xs text-gray-500 text-center mb-3">
        {context !== 'calendar' ? `${context.charAt(0).toUpperCase() + context.slice(1)} suggestions:` : 'Suggested questions:'}
      </p>
      <div className="flex flex-col gap-2">
        {suggestions.map((suggestion, index) => (
          <motion.button
            key={suggestion}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + index * 0.1, duration: 0.3 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSuggestionClick(suggestion)}
            className="px-4 py-2 text-sm text-prelude-700 bg-prelude-50 border border-prelude-200 rounded-lg hover:bg-prelude-100 hover:border-prelude-300 transition-all duration-200 text-left"
          >
            {suggestion}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
});

QuickSuggestions.displayName = 'QuickSuggestions';

// Enhanced ChatWindow component
const EnhancedChatWindow = ({
  sessionId,
  messages = [],
  isConnected,
  error,
  send,
  isAgentThinking = false,
  isLoading = false,
  context = 'calendar',
}) => {
  const [inputText, setInputText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);


  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      // Use setTimeout to ensure layout is complete before scrolling
      const timeoutId = setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'instant' });
        }
      }, 10);
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  // Hide suggestions when messages exist or when agent is thinking
  useEffect(() => {
    if (messages.length > 0 || isAgentThinking) {
      setShowSuggestions(false);
    } else if (messages.length === 0 && !isAgentThinking && !isLoading) {
      // Show suggestions for truly empty sessions
      setShowSuggestions(true);
    }
  }, [messages.length, isAgentThinking, isLoading]);

  // Send message handler
  const handleSendMessage = (messageText = null) => {
    const message = messageText || inputText.trim();
    if (!message || !isConnected) {
      return;
    }

    // Prevent sending while agent is thinking but allow typing
    if (isAgentThinking) {
      return;
    }

    // Clear input immediately
    setInputText('');
    setShowSuggestions(false);

    // Send to chat agent
    if (send) {
      send(message);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    handleSendMessage(suggestion);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };


  return (
    <div className="flex flex-col h-full bg-white">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
          {/* Loading session history */}
          {isLoading && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-prelude-400 mx-auto mb-3 animate-spin" />
                <p className="text-sm text-prelude-500">Loading conversation...</p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && messages.length === 0 && !isAgentThinking && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <Bot className="w-12 h-12 text-prelude-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-prelude-900 mb-2">
                  Start a conversation
                </h3>
                <p className="text-sm text-prelude-500 mb-6">
                  Ask me anything and I'll do my best to help
                </p>
                {showSuggestions && (
                  <QuickSuggestions onSuggestionClick={handleSuggestionClick} context={context} />
                )}
              </div>
            </div>
          )}

          {/* Messages */}
          {!isLoading && (
            <div key="messages-container" className="space-y-3">
              {messages.map((message, index) => (
                <Message
                  key={`${sessionId}-msg-${index}-${message.from || 'unknown'}`}
                  message={message}
                  isLast={index === messages.length - 1}
                />
              ))}

              {/* Thinking Indicator */}
              {isAgentThinking && (
                <motion.div
                  key="thinking-indicator"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex gap-3"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-prelude-600 flex items-center justify-center shadow-sm">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-prelude-50 border border-prelude-200 px-4 py-2 rounded-2xl">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin text-prelude-600" />
                      <span className="text-sm text-prelude-700 font-medium">Processing...</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <p className="text-sm text-red-600">{error.message || String(error)}</p>
        </div>
      )}

      {/* Enhanced Input Area */}
      <div className="border-t px-4 py-4">
        <div className="relative">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  !isConnected ? "Connecting..." :
                  isAgentThinking ? "Agent is responding..." :
                  "Type a message..."
                }
                disabled={!isConnected}
                className={`w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-prelude-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 min-h-[40px] max-h-[120px] pr-12 ${
                  inputText.length > 1000 ? 'border-red-300 focus:ring-red-500' : 
                  inputText.length > 800 ? 'border-yellow-300 focus:ring-yellow-500' :
                  'border-prelude-300'
                }`}
                rows={1}
              />
              
              {/* Character count */}
              <div className={`absolute bottom-1 right-1 text-xs px-1 rounded ${
                inputText.length > 1000 ? 'text-red-600 bg-red-50' :
                inputText.length > 800 ? 'text-yellow-600 bg-yellow-50' :
                'text-gray-400'
              }`}>
                {inputText.length}
              </div>
            </div>
            
            <Button
              onClick={handleSendMessage}
              disabled={!isConnected || !inputText.trim() || isAgentThinking || inputText.length > 1000}
              size="sm"
              className={`rounded-lg px-4 h-[40px] transition-all duration-200 ${
                inputText.trim() && isConnected && !isAgentThinking && inputText.length <= 1000
                  ? 'bg-prelude-800 hover:bg-prelude-900 text-white scale-100'
                  : 'bg-gray-300 text-gray-500 scale-95'
              }`}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Enhanced helper text */}
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-500">
              Press Enter to send • Shift + Enter for new line
            </p>
            {inputText.length > 800 && (
              <p className={`text-xs ${
                inputText.length > 1000 ? 'text-red-600' : 'text-yellow-600'
              }`}>
                {inputText.length > 1000 ? 'Message too long' : 'Approaching limit'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(EnhancedChatWindow); 