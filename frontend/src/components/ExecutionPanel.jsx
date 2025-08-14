import React, { useEffect, useRef, useState } from 'react';
import { 
  CheckCircle, Clock, Loader, AlertCircle, Download, ExternalLink, 
  Play, Pause, Square, Terminal, ChevronDown, ChevronUp, Copy,
  FileText, Code, Database, Globe
} from 'lucide-react';
import useWorkflowStore from '../lib/stores/workflowStore';

const ExecutionPanel = () => {
  const terminalRef = useRef(null);
  const [showTerminal, setShowTerminal] = useState(true);
  const [terminalFilter, setTerminalFilter] = useState('all'); // all, stdout, stderr, system
  const [autoScroll, setAutoScroll] = useState(true);

  const {
    executionState,
    executionSteps,
    terminalOutput,
    wsConnection
  } = useWorkflowStore();

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput, autoScroll]);

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

  const getOutputTypeIcon = (type) => {
    switch (type) {
      case 'stdout':
        return <Terminal size={12} className="text-green-600" />;
      case 'stderr':
        return <AlertCircle size={12} className="text-red-600" />;
      case 'system':
        return <FileText size={12} className="text-blue-600" />;
      case 'agent':
        return <Code size={12} className="text-purple-600" />;
      default:
        return <Terminal size={12} className="text-gray-600" />;
    }
  };

  const filteredTerminalOutput = terminalOutput.filter(output => {
    if (terminalFilter === 'all') return true;
    return output.type === terminalFilter;
  });

  const copyTerminalOutput = () => {
    const content = filteredTerminalOutput
      .map(output => `[${output.timestamp}] ${output.content}`)
      .join('\n');
    navigator.clipboard.writeText(content);
  };

  const progress = executionState.totalSteps > 0 
    ? (executionState.completedSteps / executionState.totalSteps) * 100 
    : 0;

  return (
    <div className="flex-1 flex flex-col">
      {/* Header with Connection Status */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-medium">Execution Progress</h3>
          
          {/* Connection Status */}
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${
              wsConnection.isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}></div>
            <span className="text-xs text-gray-500">
              {wsConnection.isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Execution Status */}
          {executionState.isExecuting && (
            <div className="flex items-center gap-1">
              <Loader size={12} className="animate-spin text-blue-500" />
              <span className="text-xs font-mono capitalize text-blue-600">
                {executionState.status}
              </span>
            </div>
          )}
        </div>
        
        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">
              {executionState.completedSteps} of {executionState.totalSteps} steps completed
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
            <span>{executionState.completedSteps} Completed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>{executionSteps.filter(s => s.status === 'running').length} Running</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span>{executionSteps.filter(s => s.status === 'pending').length} Pending</span>
          </div>
          {executionState.failedSteps > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span>{executionState.failedSteps} Failed</span>
            </div>
          )}
        </div>
      </div>

      {/* Execution Steps */}
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          <div className="space-y-3 mb-4">
            {executionSteps.map((step, index) => (
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
                    
                    <div className="flex items-center gap-4 text-xs opacity-70 mb-2">
                      <span className="font-mono">Agent: {step.agent}</span>
                      <span className="font-mono">Duration: {step.duration}</span>
                    </div>
                    
                    {step.status === 'running' && (
                      <div className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">
                        Processing... {step.output && `Current: ${step.output.slice(0, 50)}...`}
                      </div>
                    )}
                    
                    {step.status === 'failed' && step.errorMessage && (
                      <div className="text-xs text-red-700 bg-red-100 px-2 py-1 rounded">
                        Error: {step.errorMessage}
                      </div>
                    )}
                    
                    {step.status === 'completed' && step.artifacts && step.artifacts.length > 0 && (
                      <div className="mt-2 flex gap-2">
                        {step.artifacts.map((artifact, i) => (
                          <button
                            key={i}
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded"
                          >
                            <ExternalLink size={10} />
                            {artifact.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Terminal Output Section */}
          <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border-light)' }}>
            {/* Terminal Header */}
            <div className="bg-gray-50 px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-light)' }}>
              <div className="flex items-center gap-2">
                <Terminal size={16} />
                <span className="font-mono text-sm">Terminal Output</span>
                <span className="text-xs text-gray-500">({filteredTerminalOutput.length} lines)</span>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Output Filter */}
                <select
                  value={terminalFilter}
                  onChange={(e) => setTerminalFilter(e.target.value)}
                  className="text-xs border rounded px-2 py-1"
                >
                  <option value="all">All</option>
                  <option value="stdout">Output</option>
                  <option value="stderr">Errors</option>
                  <option value="system">System</option>
                  <option value="agent">Agent</option>
                </select>

                {/* Auto-scroll Toggle */}
                <button
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={`text-xs px-2 py-1 rounded ${autoScroll ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}
                >
                  Auto-scroll
                </button>

                {/* Copy Button */}
                <button
                  onClick={copyTerminalOutput}
                  className="text-xs px-2 py-1 rounded hover:bg-gray-100"
                >
                  <Copy size={12} />
                </button>

                {/* Collapse/Expand */}
                <button
                  onClick={() => setShowTerminal(!showTerminal)}
                  className="text-xs px-2 py-1 rounded hover:bg-gray-100"
                >
                  {showTerminal ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>
            </div>

            {/* Terminal Content */}
            {showTerminal && (
              <div
                ref={terminalRef}
                className="bg-black text-green-400 font-mono text-xs p-3 h-64 overflow-auto"
                style={{ maxHeight: '300px' }}
              >
                {filteredTerminalOutput.length === 0 ? (
                  <div className="text-gray-500 italic">No output yet...</div>
                ) : (
                  filteredTerminalOutput.map((output) => (
                    <div key={output.id} className="flex items-start gap-2 mb-1">
                      <span className="text-gray-500 text-xs">
                        {getOutputTypeIcon(output.type)}
                      </span>
                      <span className="text-gray-500 text-xs">
                        [{new Date(output.timestamp).toLocaleTimeString()}]
                      </span>
                      {output.agent && (
                        <span className="text-purple-400 text-xs">
                          [{output.agent}]
                        </span>
                      )}
                      <span 
                        className={`flex-1 ${
                          output.type === 'stderr' ? 'text-red-400' :
                          output.type === 'system' ? 'text-blue-400' :
                          output.type === 'agent' ? 'text-purple-400' :
                          'text-green-400'
                        }`}
                      >
                        {output.content}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Section */}
      {!executionState.isExecuting && executionState.status === 'completed' && (
        <div className="border-t p-4" style={{ borderColor: 'var(--border-light)' }}>
          <h4 className="font-medium text-sm mb-3">Execution Results</h4>
          <div className="space-y-2">
            <button className="w-full btn-primary text-sm">
              <Download size={16} className="mr-2" />
              Download Git Repository
            </button>
            <button className="w-full btn-secondary text-sm">
              <Globe size={16} className="mr-2" />
              View Live Preview
            </button>
          </div>
          
          <div className="mt-3 p-2 bg-green-100 rounded text-xs text-green-700">
            ✅ Your app has been built successfully!
            Total time: {executionState.endTime && executionState.startTime ? 
              `${Math.round((new Date(executionState.endTime) - new Date(executionState.startTime)) / 1000)}s` : 
              'Unknown'}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutionPanel;