import React from 'react';
import { CheckCircle, Circle, XCircle, Clock } from 'lucide-react';

const OnboardingProgress = ({ 
  steps, 
  currentStep, 
  completedSteps, 
  skippedSteps, 
  progress 
}) => {
  const getStepStatus = (stepId) => {
    if (completedSteps.includes(stepId)) return 'completed';
    if (skippedSteps.includes(stepId)) return 'skipped';
    if (currentStep === stepId) return 'current';
    return 'pending';
  };

  const getStepIcon = (stepId, stepIcon) => {
    const status = getStepStatus(stepId);
    const IconComponent = stepIcon;
    
    switch (status) {
      case 'completed':
        return <CheckCircle size={20} className="text-green-400" />;
      case 'skipped':
        return <XCircle size={20} className="text-orange-400" />;
      case 'current':
        return <Clock size={20} className="text-blue-400 animate-pulse" />;
      default:
        return <IconComponent size={20} className="text-white/40" />;
    }
  };

  const getStepStyles = (stepId) => {
    const status = getStepStatus(stepId);
    
    const baseStyles = "transition-all duration-500 border-2 backdrop-blur-sm relative";
    
    switch (status) {
      case 'completed':
        return `${baseStyles} bg-green-500/20 border-green-400/50 text-green-100`;
      case 'skipped':
        return `${baseStyles} bg-orange-500/20 border-orange-400/50 text-orange-100`;
      case 'current':
        return `${baseStyles} bg-blue-500/30 border-blue-400/60 text-blue-100 shadow-lg ring-2 ring-blue-400/30`;
      default:
        return `${baseStyles} bg-white/10 border-white/20 text-white/60`;
    }
  };

  const getConnectorStyles = (stepIndex) => {
    const currentStepIndex = steps.findIndex(step => step.id === currentStep);
    const isBeforeCurrent = stepIndex < currentStepIndex;
    const isCompleted = completedSteps.includes(steps[stepIndex].id);
    const isSkipped = skippedSteps.includes(steps[stepIndex].id);
    
    if (isCompleted || isSkipped || isBeforeCurrent) {
      return 'bg-gradient-to-r from-blue-400 to-purple-500';
    }
    return 'bg-white/20';
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white/80">Setup Progress</span>
          <span className="text-sm font-medium text-white/80">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-white/20 rounded-full h-2 backdrop-blur-sm">
          <div 
            className="bg-gradient-to-r from-blue-400 to-purple-500 h-2 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-center">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div className={`
                w-16 h-16 rounded-full flex items-center justify-center
                ${getStepStyles(step.id)}
              `}>
                {getStepIcon(step.id, step.icon)}
                
                {/* Pulse animation for current step */}
                {getStepStatus(step.id) === 'current' && (
                  <div className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping"></div>
                )}
              </div>
              
              <div className="mt-3 text-center">
                <div className={`
                  text-sm font-medium transition-all duration-300
                  ${getStepStatus(step.id) === 'current' ? 'text-white' : 'text-white/70'}
                `}>
                  {step.title}
                </div>
                
                {/* Status badge */}
                {getStepStatus(step.id) === 'skipped' && (
                  <div className="mt-1 px-2 py-1 bg-orange-500/30 text-orange-200 text-xs rounded-full">
                    Skipped
                  </div>
                )}
                {getStepStatus(step.id) === 'completed' && (
                  <div className="mt-1 px-2 py-1 bg-green-500/30 text-green-200 text-xs rounded-full">
                    Done
                  </div>
                )}
                {getStepStatus(step.id) === 'current' && (
                  <div className="mt-1 px-2 py-1 bg-blue-500/30 text-blue-200 text-xs rounded-full">
                    Active
                  </div>
                )}
              </div>
            </div>
            
            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className={`
                w-20 h-1 mx-6 mt-8 rounded-full transition-all duration-500
                ${getConnectorStyles(index)}
              `} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Summary */}
      <div className="mt-8 flex justify-center">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-400" />
              <span className="text-white/80">
                {completedSteps.length} completed
              </span>
            </div>
            
            {skippedSteps.length > 0 && (
              <div className="flex items-center gap-2">
                <XCircle size={16} className="text-orange-400" />
                <span className="text-white/80">
                  {skippedSteps.length} skipped
                </span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Circle size={16} className="text-white/40" />
              <span className="text-white/80">
                {steps.length - completedSteps.length - skippedSteps.length} remaining
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingProgress;