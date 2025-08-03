import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { X, Clock, CheckCircle, Loader, Play, Pause } from 'lucide-react';

const AgentNode = ({ data }) => {
  const { agent, onRemove, isExecuting } = data;

  const getStatusIcon = () => {
    switch (agent.status) {
      case 'running':
        return <Loader size={16} className="animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'failed':
        return <X size={16} className="text-red-500" />;
      default:
        return <Play size={16} className="text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (agent.status) {
      case 'running':
        return 'ring-blue-200 bg-blue-50';
      case 'completed':
        return 'ring-green-200 bg-green-50';
      case 'failed':
        return 'ring-red-200 bg-red-50';
      default:
        return 'ring-gray-200';
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    if (onRemove && !isExecuting) {
      onRemove(agent.id);
    }
  };

  return (
    <div className={`voice-card ${agent.color} relative min-w-[280px] ring-2 ${getStatusColor()}`}>
      {/* Remove button */}
      {!isExecuting && (
        <button
          onClick={handleRemove}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-10"
        >
          <X size={12} />
        </button>
      )}

      {/* Agent Icon */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-xl">
          {agent.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-sm">{agent.name}</h3>
            {getStatusIcon()}
          </div>
          <p className="text-xs opacity-70 font-mono uppercase tracking-wider">
            {agent.category}
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm mb-3 leading-relaxed">
        {agent.description}
      </p>

      {/* Capabilities */}
      <div className="mb-3">
        <p className="text-xs font-mono uppercase tracking-wider opacity-70 mb-2">
          Capabilities
        </p>
        <div className="flex flex-wrap gap-1">
          {agent.capabilities?.slice(0, 3).map((capability, index) => (
            <span
              key={index}
              className="px-2 py-1 text-xs rounded-full"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                border: '1px solid rgba(0, 0, 0, 0.1)'
              }}
            >
              {capability}
            </span>
          ))}
        </div>
      </div>

      {/* Estimated Time */}
      <div className="flex items-center gap-2 text-xs opacity-70">
        <Clock size={12} />
        <span className="font-mono">{agent.estimatedTime}</span>
      </div>

      {/* Status Message */}
      {agent.status === 'running' && (
        <div className="mt-2 p-2 bg-blue-100 rounded text-xs text-blue-700">
          Working on your project...
        </div>
      )}

      {agent.status === 'completed' && (
        <div className="mt-2 p-2 bg-green-100 rounded text-xs text-green-700">
          Task completed successfully
        </div>
      )}

      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: 'var(--accent-blue-400)',
          width: 8,
          height: 8,
          border: '2px solid white'
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: 'var(--accent-blue-400)',
          width: 8,
          height: 8,
          border: '2px solid white'
        }}
      />
    </div>
  );
};

export default AgentNode;