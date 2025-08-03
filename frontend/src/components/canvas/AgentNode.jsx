import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { X, Clock, CheckCircle, Loader, AlertCircle } from 'lucide-react';
import useWorkflowStore from '../../lib/stores/workflowStore';

const AgentNode = memo(({ data, selected, id }) => {
  const { removeNode, updateNode } = useWorkflowStore();

  const getStatusIcon = () => {
    switch (data.status) {
      case 'running':
        return <Loader size={14} className="animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle size={14} className="text-green-500" />;
      case 'failed':
        return <AlertCircle size={14} className="text-red-500" />;
      default:
        return <Clock size={14} className="text-gray-400" />;
    }
  };

  const getStatusStyles = () => {
    switch (data.status) {
      case 'running':
        return 'ring-2 ring-blue-200 bg-blue-50';
      case 'completed':
        return 'ring-2 ring-green-200 bg-green-50';
      case 'failed':
        return 'ring-2 ring-red-200 bg-red-50';
      default:
        return selected ? 'ring-2 ring-orange-400' : '';
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    removeNode(id);
  };

  return (
    <>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: 'var(--accent-blue-400)',
          width: 8,
          height: 8,
          border: '2px solid white',
        }}
      />
      
      {/* Node Content */}
      <div 
        className={`
          voice-card ${data.color} 
          min-w-[260px] max-w-[300px]
          transition-all duration-200
          cursor-move
          ${getStatusStyles()}
        `}
      >
        {/* Remove Button */}
        <button
          onClick={handleRemove}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-10 opacity-0 hover:opacity-100 group-hover:opacity-100"
        >
          <X size={12} />
        </button>

        {/* Drag Handle - Header Area */}
        <div className="drag-handle flex items-start gap-3 mb-3 cursor-move">
          {/* Agent Icon */}
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-xl flex-shrink-0">
            {data.icon}
          </div>
          
          {/* Agent Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-sm truncate">{data.name}</h3>
              {getStatusIcon()}
            </div>
            <p className="text-xs font-mono uppercase tracking-wider opacity-70">
              {data.category}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm mb-3 leading-relaxed line-clamp-2">
          {data.description}
        </p>

        {/* Capabilities */}
        <div className="mb-3">
          <p className="text-xs font-mono uppercase tracking-wider opacity-70 mb-2">
            Key Capabilities
          </p>
          <div className="flex flex-wrap gap-1">
            {data.capabilities?.slice(0, 2).map((capability, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs rounded-full truncate max-w-[120px]"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.6)',
                  border: '1px solid rgba(0, 0, 0, 0.1)'
                }}
                title={capability}
              >
                {capability}
              </span>
            ))}
            {data.capabilities?.length > 2 && (
              <span className="px-2 py-1 text-xs rounded-full opacity-70">
                +{data.capabilities.length - 2} more
              </span>
            )}
          </div>
        </div>

        {/* Estimated Time */}
        <div className="flex items-center gap-2 text-xs opacity-70 mb-2">
          <Clock size={12} />
          <span className="font-mono">{data.estimatedTime}</span>
        </div>

        {/* Status Message */}
        {data.status === 'running' && (
          <div className="mt-2 p-2 bg-blue-100 rounded text-xs text-blue-700 animate-pulse">
            🔄 Working on your project...
          </div>
        )}

        {data.status === 'completed' && (
          <div className="mt-2 p-2 bg-green-100 rounded text-xs text-green-700">
            ✅ Task completed successfully
          </div>
        )}

        {data.status === 'failed' && (
          <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-700">
            ❌ Task failed - check logs
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: 'var(--accent-blue-400)',
          width: 8,
          height: 8,
          border: '2px solid white',
        }}
      />
    </>
  );
});

AgentNode.displayName = 'AgentNode';
export default AgentNode;