import React from 'react';
import { CheckCircle, Clock, Loader, AlertCircle, Download, ExternalLink } from 'lucide-react';

const ExecutionPanel = ({ steps, isExecuting, selectedAgents }) => {
  const getStepIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'running':
        return <Loader size={16} className="animate-spin text-blue-500" />;
      case 'failed':
        return <AlertCircle size={16} className="text-red-500" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  const getStepColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'running':
        return 'bg-blue-50 border-blue-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const totalSteps = steps.length;
  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const progress = (completedSteps / totalSteps) * 100;

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-medium">Execution Progress</h3>
          {isExecuting && (
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          )}
        </div>
        
        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">
              {completedSteps} of {totalSteps} steps completed
            </span>
            <span className="text-sm font-mono">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Status Summary */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>{steps.filter(s => s.status === 'completed').length} Completed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>{steps.filter(s => s.status === 'running').length} Running</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span>{steps.filter(s => s.status === 'pending').length} Pending</span>
          </div>
        </div>
      </div>

      {/* Execution Steps */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div 
              key={step.id}
              className={`p-3 rounded-lg border ${getStepColor(step.status)} transition-all duration-300`}
            >
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white border-2 border-current flex-shrink-0 mt-0.5">
                  <span className="text-xs font-mono">{index + 1}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getStepIcon(step.status)}
                    <h4 className="font-medium text-sm">{step.name}</h4>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs opacity-70">
                    <span className="font-mono">Agent: {step.agent}</span>
                    <span className="font-mono">Duration: {step.duration}</span>
                  </div>
                  
                  {step.status === 'running' && (
                    <div className="mt-2 text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">
                      Processing... This may take a few minutes
                    </div>
                  )}
                  
                  {step.status === 'completed' && (
                    <div className="mt-2">
                      <button className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                        <ExternalLink size={12} />
                        View Output
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Status */}
      <div className="border-t p-4" style={{ borderColor: 'var(--border-light)' }}>
        <h4 className="font-medium text-sm mb-3">Active Agents</h4>
        <div className="space-y-2">
          {selectedAgents.slice(0, 3).map((agent) => (
            <div key={agent.id} className="flex items-center gap-3 text-sm">
              <div className="w-6 h-6 rounded bg-white flex items-center justify-center text-xs">
                {agent.icon}
              </div>
              <span className="flex-1">{agent.name}</span>
              <div className="flex items-center gap-1">
                {agent.status === 'running' && (
                  <Loader size={12} className="animate-spin text-blue-500" />
                )}
                {agent.status === 'completed' && (
                  <CheckCircle size={12} className="text-green-500" />
                )}
                <span className="text-xs font-mono capitalize">{agent.status}</span>
              </div>
            </div>
          ))}
          
          {selectedAgents.length > 3 && (
            <div className="text-xs opacity-70 text-center">
              +{selectedAgents.length - 3} more agents
            </div>
          )}
        </div>
      </div>

      {/* Results Section */}
      {!isExecuting && completedSteps > 0 && (
        <div className="border-t p-4" style={{ borderColor: 'var(--border-light)' }}>
          <h4 className="font-medium text-sm mb-3">Execution Results</h4>
          <div className="space-y-2">
            <button className="w-full btn-primary text-sm">
              <Download size={16} className="mr-2" />
              Download Git Repository
            </button>
            <button className="w-full btn-secondary text-sm">
              <ExternalLink size={16} className="mr-2" />
              View Live Preview
            </button>
          </div>
          
          <div className="mt-3 p-2 bg-green-100 rounded text-xs text-green-700">
            ✅ Your app has been built successfully!
            Repository includes all source code, documentation, and deployment configs.
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutionPanel;