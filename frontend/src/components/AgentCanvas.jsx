import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import AgentNode from './AgentNode';

const nodeTypes = {
  agentNode: AgentNode,
};

const AgentCanvas = ({ agents, onRemoveAgent, onAgentPositionChange, isExecuting }) => {
  // Convert agents to React Flow nodes
  const initialNodes = useMemo(() => 
    agents.map(agent => ({
      id: agent.id,
      type: 'agentNode',
      position: agent.position,
      data: {
        agent,
        onRemove: onRemoveAgent,
        isExecuting
      }
    }))
  , [agents, onRemoveAgent, isExecuting]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Update nodes when agents change
  React.useEffect(() => {
    const newNodes = agents.map(agent => ({
      id: agent.id,
      type: 'agentNode',
      position: agent.position,
      data: {
        agent,
        onRemove: onRemoveAgent,
        isExecuting
      }
    }));
    setNodes(newNodes);
  }, [agents, onRemoveAgent, isExecuting, setNodes]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeDragStop = useCallback(
    (event, node) => {
      if (onAgentPositionChange) {
        onAgentPositionChange(node.id, node.position);
      }
    },
    [onAgentPositionChange]
  );

  const customOnNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      
      // Handle position changes
      changes.forEach(change => {
        if (change.type === 'position' && change.position && onAgentPositionChange) {
          onAgentPositionChange(change.id, change.position);
        }
      });
    },
    [onNodesChange, onAgentPositionChange]
  );

  return (
    <div className="flex-1 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={customOnNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.2,
        }}
        style={{ backgroundColor: 'var(--bg-page)' }}
        nodesDraggable={!isExecuting}
        nodesConnectable={!isExecuting}
        elementsSelectable={!isExecuting}
      >
        <Background 
          color="var(--border-light)" 
          gap={20} 
          size={1}
          style={{ opacity: 0.5 }}
        />
        <Controls 
          style={{ 
            button: { 
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-primary)'
            }
          }}
        />
        <MiniMap 
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-light)'
          }}
          nodeStrokeColor="var(--border-primary)"
          nodeColor="var(--accent-blue-200)"
        />
      </ReactFlow>
    </div>
  );
};

export default AgentCanvas;