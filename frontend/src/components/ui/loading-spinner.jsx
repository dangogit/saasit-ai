import React from 'react';
import { cn } from '../../lib/utils';

const LoadingSpinner = ({ 
  className, 
  size = 'default',
  ...props 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    default: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  return (
    <div
      className={cn(
        'border-2 border-current border-t-transparent rounded-full animate-spin',
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
};

export default LoadingSpinner;