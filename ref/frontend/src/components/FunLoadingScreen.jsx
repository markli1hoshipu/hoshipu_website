import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, Zap, Star, Heart, Sparkles, Rocket } from 'lucide-react';

const FunLoadingScreen = ({ isLoading, targetView, isContentReady, onComplete }) => {
    const [progress, setProgress] = useState(0);
    const [currentMessage, setCurrentMessage] = useState(0);
    const [showIcon, setShowIcon] = useState(true);
    const [isVisible, setIsVisible] = useState(false);
    const progressIntervalRef = useRef(null);
    const messageIntervalRef = useRef(null);
    const iconIntervalRef = useRef(null);

    const loadingMessages = [
        "🚀 Preparing your workspace...",
        "✨ Loading awesome content...",
        "🎯 Almost there...",
        "🌟 Finalizing details...",
        "🎉 Ready to rock!"
    ];

    const viewNames = {
        dashboard: "Dashboard",
        leads: "Lead Generation",
        'sales-center': "Sales Center",
        crm: "Customer Relations",
        employees: "Team Management",
        calendar: "Calendar & Scheduling",
        invitations: "Team Invitations",
        'usage-analytics': "Usage Analytics"
    };

    useEffect(() => {
        // Start loading animation when isLoading becomes true
        if (isLoading) {
            setIsVisible(true);
            setProgress(0);
            setCurrentMessage(0);
            setShowIcon(true);

            // Smooth progress animation to 95%
            let currentProgress = 0;
            progressIntervalRef.current = setInterval(() => {
                currentProgress += Math.random() * 3 + 1; // Increment by 1-4%
                
                if (currentProgress >= 95) {
                    currentProgress = 95;
                    if (progressIntervalRef.current) {
                        clearInterval(progressIntervalRef.current);
                        progressIntervalRef.current = null;
                    }
                }
                
                setProgress(currentProgress);
            }, 100); // Update every 100ms for smooth animation

            // Message cycling
            messageIntervalRef.current = setInterval(() => {
                setCurrentMessage(prev => {
                    if (prev < loadingMessages.length - 2) { // Don't show "Ready to rock" until 100%
                        return prev + 1;
                    }
                    return prev;
                });
            }, 800);

            // Icon animation cycling
            iconIntervalRef.current = setInterval(() => {
                setShowIcon(prev => !prev);
            }, 800);
        } else if (!isLoading && isVisible) {
            // Clear intervals when loading stops
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
            }
            if (messageIntervalRef.current) {
                clearInterval(messageIntervalRef.current);
                messageIntervalRef.current = null;
            }
            if (iconIntervalRef.current) {
                clearInterval(iconIntervalRef.current);
                iconIntervalRef.current = null;
            }
        }

        // Cleanup function
        return () => {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
            if (iconIntervalRef.current) clearInterval(iconIntervalRef.current);
        };
    }, [isLoading]);

    // Handle content ready - progress from 95% to 100%
    useEffect(() => {
        if (isContentReady && progress >= 95 && isVisible) {
            // Clear intervals
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
            
            // Animate to 100%
            setProgress(100);
            setCurrentMessage(loadingMessages.length - 1); // Show "Ready to rock!"
            
            // Fade out after a short delay
            setTimeout(() => {
                setIsVisible(false);
                setTimeout(() => {
                    onComplete?.();
                }, 300); // Wait for fade out animation
            }, 500);
        }
    }, [isContentReady, progress, isVisible, onComplete]);

    if (!isVisible) return null;

    const icons = [Plane, Rocket, Zap, Star, Sparkles, Heart];
    const CurrentIcon = icons[currentMessage % icons.length];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white flex flex-col items-center justify-center z-10"
                style={{
                    background: 'linear-gradient(135deg, rgb(240, 248, 255) 0%, rgb(219, 234, 254) 100%)'
                }}
            >
                {/* Flying Icon */}
                <motion.div
                    className="mb-8"
                    animate={{
                        x: [0, 30, -30, 0],
                        y: [0, -15, -15, 0],
                        rotate: [0, 5, -5, 0]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                >
                    <AnimatePresence mode="wait">
                        {showIcon && (
                            <motion.div
                                key={currentMessage}
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0, rotate: 180 }}
                                transition={{ duration: 0.5 }}
                            >
                                <CurrentIcon 
                                    className="w-16 h-16 text-blue-500" 
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Loading Title */}
                <motion.h2
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-2xl font-bold text-gray-800 mb-4"
                >
                    Loading {viewNames[targetView] || targetView}
                </motion.h2>

                {/* Progress Bar Container */}
                <div className="w-80 mb-6">
                    <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 rounded-full"
                            initial={{ width: '0%' }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.2, ease: 'linear' }}
                            style={{
                                boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)',
                            }}
                        />
                    </div>
                    <div className="text-center mt-2 flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                            {Math.round(progress)}%
                        </span>
                        {progress >= 95 && !isContentReady && (
                            <span className="text-xs text-gray-500 animate-pulse">
                                Waiting for content...
                            </span>
                        )}
                    </div>
                </div>

                {/* Animated Loading Messages */}
                <motion.div
                    key={currentMessage}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -10, opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="text-lg text-gray-700 mb-8 text-center"
                >
                    {loadingMessages[currentMessage]}
                </motion.div>

                {/* Floating Particles */}
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-2 h-2 bg-blue-300 rounded-full"
                        style={{
                            left: `${20 + i * 12}%`,
                            top: `${30 + (i % 2) * 40}%`,
                        }}
                        animate={{
                            y: [0, -20, 0],
                            opacity: [0.3, 0.8, 0.3],
                            scale: [1, 1.5, 1]
                        }}
                        transition={{
                            duration: 2 + i * 0.5,
                            repeat: Infinity,
                            delay: i * 0.3,
                        }}
                    />
                ))}

                {/* Loading Dots */}
                <div className="flex space-x-2">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className="w-3 h-3 bg-blue-400 rounded-full"
                            animate={{
                                y: [0, -10, 0],
                            }}
                            transition={{
                                duration: 0.6,
                                repeat: Infinity,
                                delay: i * 0.2,
                            }}
                        />
                    ))}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default FunLoadingScreen;