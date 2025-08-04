import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { X, Clock, CheckCircle, Loader, AlertCircle } from 'lucide-react';
import useWorkflowStore from '../../lib/stores/workflowStore';

const AgentNode = memo(({ data, selected, id }) => {
  const { removeNode, updateNode } = useWorkflowStore();
  const { role, isManager, isLead } = data;

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

  const getRoleIcon = () => {
    if (isManager) return '👑';
    if (isLead) return '⭐';
    return null;
  };
  
  const getRoleTitle = () => {
    if (isManager) return 'Project Manager';
    if (isLead) return 'Team Lead';
    return 'Team Member';
  };

  const getStatusStyles = () => {
    let baseStyles = '';
    
    // Role-based styling
    if (isManager) {
      baseStyles = 'ring-2 ring-orange-400 bg-gradient-to-br from-orange-50 to-yellow-50';
    } else if (isLead) {
      baseStyles = 'ring-2 ring-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50';
    }
    
    // Status-based overlay
    switch (data.status) {
      case 'running':
        return baseStyles + ' shadow-lg';
      case 'completed':
        return baseStyles + ' ring-green-400 bg-gradient-to-br from-green-50 to-emerald-50';
      case 'failed':
        return baseStyles + ' ring-red-400 bg-gradient-to-br from-red-50 to-pink-50';
      default:
        return baseStyles || (selected ? 'ring-2 ring-orange-400' : '');
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
          voice-card ${data.color} group
          min-w-[260px] max-w-[300px]
          transition-all duration-200
          cursor-move
          relative
          hover:shadow-xl hover:scale-[1.02]
          ${getStatusStyles()}
        `}
      >
        {/* Role Badge */}
        {getRoleIcon() && (
          <div 
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs z-20"
            style={{
              background: isManager ? '#f59e0b' : '#3b82f6',
              color: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            {getRoleIcon()}
          </div>
        )}
        
        {/* Remove Button */}
        <button
          onClick={handleRemove}
          className="absolute -top-2 -left-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-all duration-200 z-20 opacity-0 group-hover:opacity-100 shadow-lg hover:shadow-xl hover:scale-110"
        >
          <X size={14} />
        </button>

        {/* Drag Handle - Header Area */}
        <div className="drag-handle flex items-start gap-3 mb-3 cursor-move">
          {/* Agent Icon */}
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl flex-shrink-0 ${
            isManager ? 'bg-gradient-to-br from-orange-100 to-yellow-100 border-2 border-orange-200' :
            isLead ? 'bg-gradient-to-br from-blue-100 to-indigo-100 border-2 border-blue-200' :
            'bg-white border border-gray-200'
          }`}>
            {data.icon}
          </div>
          
          {/* Agent Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`font-medium truncate ${
                isManager ? 'text-base font-semibold' : 'text-sm'
              }`}>{data.name}</h3>
              {getStatusIcon()}
            </div>
            <p className="text-xs text-gray-600 mb-1">
              {getRoleTitle()}
            </p>
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


        {/* Status Message */}
        {data.status === 'running' && (
          <div className="mt-3 p-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg text-xs text-blue-700 animate-pulse border border-blue-200">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="font-medium">Working on your project...</span>
            </div>
          </div>
        )}

        {data.status === 'completed' && (
          <div className="mt-3 p-2.5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg text-xs text-green-700 border border-green-200">
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-green-500" />
              <span className="font-medium">Task completed successfully</span>
            </div>
          </div>
        )}

        {data.status === 'failed' && (
          <div className="mt-3 p-2.5 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg text-xs text-red-700 border border-red-200">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="text-red-500" />
              <span className="font-medium">Task failed - check logs</span>
            </div>
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