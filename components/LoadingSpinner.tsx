'use client';

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'white';
  text?: string;
  fullscreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  text,
  fullscreen = false
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'w-4 h-4';
      case 'md': return 'w-8 h-8';
      case 'lg': return 'w-12 h-12';
      case 'xl': return 'w-16 h-16';
    }
  };

  const getColorClasses = () => {
    switch (color) {
      case 'primary': return 'border-primary';
      case 'secondary': return 'border-secondary';
      case 'white': return 'border-white';
    }
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Gradient Spinner */}
      <div className="relative">
        <div className={`${getSizeClasses()} rounded-full border-2 border-transparent bg-gradient-to-r from-primary to-secondary animate-spin`}>
          <div className="absolute inset-1 bg-dark rounded-full"></div>
        </div>
        {/* Pulsing Core */}
        <div className={`absolute inset-0 ${getSizeClasses()} rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 animate-pulse`}></div>
      </div>
      
      {/* Loading Text */}
      {text && (
        <div className="text-center">
          <p className="text-white/80 font-medium animate-pulse">
            {text}
          </p>
          <div className="flex justify-center mt-2 space-x-1">
            <div className="w-1 h-1 bg-primary rounded-full animate-bounce"></div>
            <div className="w-1 h-1 bg-primary rounded-full animate-bounce delay-100"></div>
            <div className="w-1 h-1 bg-primary rounded-full animate-bounce delay-200"></div>
          </div>
        </div>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 bg-dark/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 shadow-2xl">
          {spinner}
        </div>
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner; 