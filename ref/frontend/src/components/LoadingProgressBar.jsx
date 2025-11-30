import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const LoadingProgressBar = ({ isLoading, onComplete }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        let interval;
        
        if (isLoading) {
            setProgress(0);
            interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) {
                        return prev; // Stop at 90% until actual loading is complete
                    }
                    return prev + Math.random() * 15;
                });
            }, 100);
        } else {
            // Complete the progress bar when loading is done
            setProgress(100);
            setTimeout(() => {
                onComplete?.();
                setProgress(0);
            }, 300);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isLoading, onComplete]);

    if (!isLoading && progress === 0) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-50">
            <motion.div
                className="h-1 bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{
                    boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)',
                }}
            />
        </div>
    );
};

export default LoadingProgressBar;