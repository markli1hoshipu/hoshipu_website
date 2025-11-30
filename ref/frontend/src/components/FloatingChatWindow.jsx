import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion as _motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Minimize2, Maximize2, Move, MoreHorizontal } from 'lucide-react';
import EnhancedChatWindow from '../chat/components/EnhancedChatWindow';
import { Button } from './ui/primitives/button';

const FloatingChatWindow = ({
    isVisible,
    onToggleVisibility,
    sessionId,
    isConnected,
    messages,
    error,
    send,
    isAgentThinking,
    isLoading,
    context = 'calendar',
}) => {
    const [isMinimized, setIsMinimized] = useState(false);
    const [size, setSize] = useState({ width: 500, height: 1000 });
    const [position, setPosition] = useState(() => ({
        x: Math.max(0, (window?.innerWidth || 1200) - 520),
        y: Math.max(0, (window?.innerHeight || 1200) - 1020)
    }));
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeHandle, setResizeHandle] = useState(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const chatRef = useRef(null);
    
    const minSize = { width: 320, height: 400 };
    const maxSize = { width: 800, height: 1200 };

    // Handle window resize to keep chat window in bounds
    useEffect(() => {
        const handleWindowResize = () => {
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const chatWidth = isMinimized ? 320 : size.width;
            const chatHeight = isMinimized ? 60 : size.height;

            setPosition(prev => ({
                x: Math.min(Math.max(0, prev.x), windowWidth - chatWidth),
                y: Math.min(Math.max(0, prev.y), windowHeight - chatHeight)
            }));
        };

        window.addEventListener('resize', handleWindowResize);
        return () => window.removeEventListener('resize', handleWindowResize);
    }, [isMinimized, size]);
    
    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isVisible) {
                onToggleVisibility();
            }
        };
        
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isVisible, onToggleVisibility]);

    // Enhanced dragging with touch support
    const handleDragStart = useCallback((e) => {
        if (e.target.closest('.chat-content') || e.target.closest('.no-drag') || e.target.closest('.resize-handle')) return;
        
        e.preventDefault();
        setIsDragging(true);
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        setDragStart({
            x: clientX - position.x,
            y: clientY - position.y
        });
    }, [position]);
    
    // Resize functionality
    const handleResizeStart = useCallback((e, handle) => {
        e.stopPropagation();
        e.preventDefault();
        setIsResizing(true);
        setResizeHandle(handle);
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        setDragStart({ x: clientX, y: clientY });
    }, []);

    const handleMove = useCallback((e) => {
        if (!isDragging && !isResizing) return;

        e.preventDefault();
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        if (isDragging) {
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const chatWidth = isMinimized ? 320 : size.width;
            const chatHeight = isMinimized ? 60 : size.height;

            const newX = Math.min(Math.max(0, clientX - dragStart.x), windowWidth - chatWidth);
            const newY = Math.min(Math.max(0, clientY - dragStart.y), windowHeight - chatHeight);

            setPosition({ x: newX, y: newY });
        } else if (isResizing) {
            const deltaX = clientX - dragStart.x;
            const deltaY = clientY - dragStart.y;
            
            setSize(prevSize => {
                let newWidth = prevSize.width;
                let newHeight = prevSize.height;
                
                if (resizeHandle.includes('right')) {
                    newWidth = Math.min(Math.max(minSize.width, prevSize.width + deltaX), maxSize.width);
                }
                if (resizeHandle.includes('left')) {
                    newWidth = Math.min(Math.max(minSize.width, prevSize.width - deltaX), maxSize.width);
                }
                if (resizeHandle.includes('bottom')) {
                    newHeight = Math.min(Math.max(minSize.height, prevSize.height + deltaY), maxSize.height);
                }
                if (resizeHandle.includes('top')) {
                    newHeight = Math.min(Math.max(minSize.height, prevSize.height - deltaY), maxSize.height);
                }
                
                return { width: newWidth, height: newHeight };
            });
            
            setDragStart({ x: clientX, y: clientY });
        }
    }, [isDragging, isResizing, dragStart, resizeHandle, isMinimized, size, minSize, maxSize]);

    const handleEnd = useCallback(() => {
        setIsDragging(false);
        setIsResizing(false);
        setResizeHandle(null);
    }, []);

    useEffect(() => {
        if (isDragging || isResizing) {
            // Mouse events
            document.addEventListener('mousemove', handleMove);
            document.addEventListener('mouseup', handleEnd);
            // Touch events
            document.addEventListener('touchmove', handleMove, { passive: false });
            document.addEventListener('touchend', handleEnd);
            
            document.body.style.userSelect = 'none';
            document.body.style.cursor = isDragging ? 'grabbing' : (isResizing ? `${resizeHandle}-resize` : 'default');
            
            return () => {
                document.removeEventListener('mousemove', handleMove);
                document.removeEventListener('mouseup', handleEnd);
                document.removeEventListener('touchmove', handleMove);
                document.removeEventListener('touchend', handleEnd);
                document.body.style.userSelect = '';
                document.body.style.cursor = 'default';
            };
        }
    }, [isDragging, isResizing, handleMove, handleEnd, resizeHandle]);

    // Toggle minimize/maximize
    const toggleMinimize = () => {
        setIsMinimized(!isMinimized);
    };

    // HIDDEN: Floating chat button - commented out temporarily
    // if (!isVisible) {
    //     // Floating chat button when hidden
    //     return (
    //         <_motion.div
    //             initial={{ opacity: 0, scale: 0 }}
    //             animate={{ opacity: 1, scale: 1 }}
    //             exit={{ opacity: 0, scale: 0 }}
    //             className="fixed bottom-6 right-6 z-50"
    //         >
    //             <Button
    //                 onClick={onToggleVisibility}
    //                 className="w-16 h-16 rounded-full bg-gradient-to-br from-prelude-800 to-prelude-900 hover:from-prelude-700 hover:to-prelude-800 text-white shadow-2xl hover:shadow-prelude-900/50 transition-all duration-300 backdrop-blur-sm border border-white/10 group"
    //                 aria-label="Open Chat"
    //             >
    //                 <MessageCircle className="h-7 w-7 group-hover:scale-110 transition-transform duration-200" />
    //             </Button>
    //         </_motion.div>
    //     );
    // }

    if (!isVisible) {
        return null;
    }

    return (
        <_motion.div
            ref={chatRef}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
                position: 'fixed',
                left: position.x,
                top: position.y,
                zIndex: 1000,
                width: isMinimized ? 320 : size.width,
                height: isMinimized ? 60 : size.height,
            }}
            className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-prelude-200/50 overflow-hidden ring-1 ring-white/10"
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-prelude-800 to-prelude-900 border-b border-white/10 cursor-move">
                <div className="flex items-center space-x-3">
                    <div className="p-1.5 rounded-lg bg-white/10">
                        <Move className="h-4 w-4 text-white/80" />
                    </div>
                    <div>
                        <h3 className="text-sm font-sans font-semibold text-white">
                            AI Assistant
                        </h3>
                        <div className="flex items-center space-x-2 mt-0.5">
                            <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                                isConnected 
                                    ? 'bg-emerald-400 shadow-emerald-400/50 shadow-sm' 
                                    : 'bg-red-400 animate-pulse shadow-red-400/50 shadow-sm'
                            }`} />
                            <span className="text-xs font-sans text-white/70">
                                {isConnected ? 'Connected' : 'Connecting...'}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center space-x-1 no-drag">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleMinimize}
                        className="h-8 w-8 hover:bg-white/10 text-white/80 hover:text-white transition-all duration-200"
                        aria-label={isMinimized ? "Maximize" : "Minimize"}
                    >
                        {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggleVisibility}
                        className="h-8 w-8 hover:bg-red-500/20 text-white/80 hover:text-red-300 transition-all duration-200"
                        aria-label="Close Chat"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Chat Content */}
            <AnimatePresence>
                {!isMinimized && (
                    <_motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: size.height - 77, opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="chat-content overflow-hidden relative"
                    >
                        {sessionId ? (
                            <EnhancedChatWindow
                                sessionId={sessionId}
                                isConnected={isConnected}
                                messages={messages}
                                error={error}
                                send={send}
                                isAgentThinking={isAgentThinking}
                                isLoading={isLoading}
                                context={context}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full p-6">
                                <div className="text-center space-y-3">
                                    <div className="w-16 h-16 bg-gradient-to-br from-prelude-700 to-prelude-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <MessageCircle className="h-8 w-8 text-white" />
                                    </div>
                                    <h4 className="text-base font-sans font-semibold text-prelude-900">No Session Active</h4>
                                    <p className="text-sm font-sans text-prelude-600">Create a new chat session to start</p>
                                </div>
                            </div>
                        )}
                        
                        {/* Resize Handles */}
                        {!isMinimized && (
                            <>
                                {/* Corner handles */}
                                <div 
                                    className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize resize-handle hover:bg-prelude-300/30 transition-colors"
                                    onMouseDown={(e) => handleResizeStart(e, 'nw')}
                                    onTouchStart={(e) => handleResizeStart(e, 'nw')}
                                />
                                <div 
                                    className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize resize-handle hover:bg-prelude-300/30 transition-colors"
                                    onMouseDown={(e) => handleResizeStart(e, 'ne')}
                                    onTouchStart={(e) => handleResizeStart(e, 'ne')}
                                />
                                <div 
                                    className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize resize-handle hover:bg-prelude-300/30 transition-colors"
                                    onMouseDown={(e) => handleResizeStart(e, 'sw')}
                                    onTouchStart={(e) => handleResizeStart(e, 'sw')}
                                />
                                <div 
                                    className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize resize-handle hover:bg-prelude-300/30 transition-colors"
                                    onMouseDown={(e) => handleResizeStart(e, 'se')}
                                    onTouchStart={(e) => handleResizeStart(e, 'se')}
                                />
                                
                                {/* Edge handles */}
                                <div 
                                    className="absolute top-0 left-3 right-3 h-1 cursor-n-resize resize-handle hover:bg-prelude-300/30 transition-colors"
                                    onMouseDown={(e) => handleResizeStart(e, 'n')}
                                    onTouchStart={(e) => handleResizeStart(e, 'n')}
                                />
                                <div 
                                    className="absolute bottom-0 left-3 right-3 h-1 cursor-s-resize resize-handle hover:bg-prelude-300/30 transition-colors"
                                    onMouseDown={(e) => handleResizeStart(e, 's')}
                                    onTouchStart={(e) => handleResizeStart(e, 's')}
                                />
                                <div 
                                    className="absolute left-0 top-3 bottom-3 w-1 cursor-w-resize resize-handle hover:bg-prelude-300/30 transition-colors"
                                    onMouseDown={(e) => handleResizeStart(e, 'w')}
                                    onTouchStart={(e) => handleResizeStart(e, 'w')}
                                />
                                <div 
                                    className="absolute right-0 top-3 bottom-3 w-1 cursor-e-resize resize-handle hover:bg-prelude-300/30 transition-colors"
                                    onMouseDown={(e) => handleResizeStart(e, 'e')}
                                    onTouchStart={(e) => handleResizeStart(e, 'e')}
                                />
                                
                                {/* Visual resize indicator */}
                                <div className="absolute bottom-2 right-2 opacity-30 hover:opacity-60 transition-opacity pointer-events-none">
                                    <MoreHorizontal className="h-3 w-3 text-prelude-400 transform rotate-45" />
                                </div>
                            </>
                        )}
                    </_motion.div>
                )}
            </AnimatePresence>
        </_motion.div>
    );
};

export default FloatingChatWindow;