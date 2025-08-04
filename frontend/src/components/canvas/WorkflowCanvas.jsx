import React, { useCallback, useRef, useState, useMemo } from 'react';
import ReactFlow, {
  Controls,
  Background,
  addEdge,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';

import useWorkflowStore from '../../lib/stores/workflowStore';
import AgentNode from './AgentNode';
import { Button } from '../ui/button';
import { Layers } from 'lucide-react';

// Canvas component without ReactFlowProvider (since it will be wrapped)
const WorkflowCanvasInner = ({ isExecuting }) => {
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  
  // Memoize nodeTypes to prevent React Flow warnings
  const nodeTypes = useMemo(() => ({
    agent: AgentNode,
  }), []);
  
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    addNode,
    addEdge: addEdgeToStore,
    applyAutoLayout,
    currentLayoutType,
  } = useWorkflowStore();

  const onConnect = useCallback(
    (params) => {
      const newEdge = {
        ...params,
        id: `edge-${params.source}-${params.target}-${Date.now()}`,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#10b981', strokeWidth: 2 },
      };
      addEdgeToStore(newEdge);
    },
    [addEdgeToStore]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const agentData = event.dataTransfer.getData('application/json');
      
      if (!agentData || !reactFlowBounds || !reactFlowInstance) {
        return;
      }

      try {
        const agent = JSON.parse(agentData);
        // Use the new screenToFlowPosition instead of deprecated project
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        const newNode = {
          id: `${agent.id}-${Date.now()}`,
          type: 'agent',
          position,
          data: {
            ...agent,
            status: 'idle',
          },
          dragHandle: '.drag-handle',
        };

        addNode(newNode);
      } catch (error) {
        console.error('Error parsing agent data:', error);
      }
    },
    [reactFlowInstance, addNode]
  );

  const onInit = useCallback((rfi) => {
    setReactFlowInstance(rfi);
  }, []);

  return (
    <div className="h-full w-full" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={onInit}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        nodesDraggable={!isExecuting}
        nodesConnectable={!isExecuting}
        elementsSelectable={!isExecuting}
        fitView
        fitViewOptions={{
          padding: 0.2,
        }}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.1}
        maxZoom={2}
        attributionPosition="bottom-left"
        proOptions={{
          hideAttribution: true,
        }}
      >
        {/* Auto-layout button */}
        <div className="absolute top-4 left-4 z-10">
          <Button
            onClick={() => applyAutoLayout()}
            variant="secondary"
            size="sm"
            className="flex items-center gap-2"
            disabled={nodes.length === 0}
          >
            <Layers size={16} />
            Auto Layout
          </Button>
        </div>
        
        <Background 
          variant="dots" 
          gap={20} 
          size={1}
          color="rgba(153, 153, 153, 0.3)"
        />
        <Controls
          showZoom={true}
          showFitView={true}
          showInteractive={!isExecuting}
          style={{
            button: {
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-primary)',
            }
          }}
        />
      </ReactFlow>
    </div>
  );
};

// Main component with ReactFlowProvider wrapper
const WorkflowCanvas = ({ isExecuting = false }) => {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner isExecuting={isExecuting} />
    </ReactFlowProvider>
  );
};

export default WorkflowCanvas;