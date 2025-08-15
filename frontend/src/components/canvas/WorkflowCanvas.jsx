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
import canvasLayout from '../../utils/canvasLayout';

// Canvas component without ReactFlowProvider (since it will be wrapped)
const WorkflowCanvasInner = ({ isExecuting }) => {
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  
  // Drag preview state
  const [dragPreview, setDragPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [placementZones, setPlacementZones] = useState([]);

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

  const onDragEnter = useCallback((event) => {
    event.preventDefault();
    setIsDragging(true);
    
    // Calculate placement zones for visual feedback
    const canvasBounds = reactFlowWrapper.current?.getBoundingClientRect();
    if (canvasBounds && reactFlowInstance) {
      const zones = canvasLayout.getPlacementZones(nodes, {
        width: canvasBounds.width,
        height: canvasBounds.height
      });
      setPlacementZones(zones);
    }
  }, [nodes, reactFlowInstance]);

  const onDragLeave = useCallback((event) => {
    // Only hide preview if leaving the canvas area
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDragging(false);
      setDragPreview(null);
      setPlacementZones([]);
    }
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    
    if (!reactFlowInstance || !isDragging) return;
    
    // Calculate preview position
    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    
    // Find optimal position using smart placement
    const optimalPosition = canvasLayout.findOptimalPosition(
      nodes,
      position,
      { width: 1200, height: 800 } // Canvas bounds
    );
    
    // Get collision prediction
    const testNode = {
      id: 'preview',
      position: optimalPosition,
      width: canvasLayout.AGENT_WIDTH,
      height: canvasLayout.AGENT_HEIGHT
    };
    
    const collision = canvasLayout.getCollisionPrediction(testNode, nodes);
    
    setDragPreview({
      position: optimalPosition,
      originalPosition: position,
      hasCollision: collision.hasCollision,
      isOptimal: !collision.hasCollision,
      suggestions: collision.suggestedPositions || []
    });
  }, [reactFlowInstance, isDragging, nodes]);

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
        
        // Use optimal position from preview if available, otherwise calculate
        let position;
        if (dragPreview && !dragPreview.hasCollision) {
          position = dragPreview.position;
        } else {
          const rawPosition = reactFlowInstance.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          });
          position = canvasLayout.findOptimalPosition(
            nodes,
            rawPosition,
            { width: canvasBounds.width, height: canvasBounds.height }
          );
        }

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
      } finally {
        // Clean up drag state
        setIsDragging(false);
        setDragPreview(null);
        setPlacementZones([]);
      }
    },
    [reactFlowInstance, addNode, dragPreview, nodes]
  );

  const onInit = useCallback((rfi) => {
    setReactFlowInstance(rfi);
    // Expose ReactFlow instance globally for template loading
    window.reactFlowInstance = rfi;
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
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
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
        
        {/* Placement Zones Overlay */}
        {isDragging && placementZones.length > 0 && (
          <div className="absolute inset-0 pointer-events-none z-10">
            {placementZones.slice(0, 5).map((zone, index) => (
              <div
                key={index}
                className="absolute border-2 border-dashed border-green-400 bg-green-50 opacity-40 rounded-lg transition-all duration-300"
                style={{
                  left: zone.x,
                  top: zone.y,
                  width: canvasLayout.AGENT_WIDTH,
                  height: canvasLayout.AGENT_HEIGHT,
                  transform: `scale(${1 - index * 0.1})`,
                  animationDelay: `${index * 100}ms`
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center text-green-600 font-medium text-sm">
                  {index === 0 ? '✨ Optimal' : `Option ${index + 1}`}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Drag Preview Ghost */}
        {isDragging && dragPreview && (
          <div className="absolute pointer-events-none z-20">
            <div
              className={`absolute border-2 rounded-lg transition-all duration-200 ${
                dragPreview.hasCollision
                  ? 'border-red-400 bg-red-50 border-dashed'
                  : 'border-blue-400 bg-blue-50 border-solid shadow-lg'
              }`}
              style={{
                left: dragPreview.position.x,
                top: dragPreview.position.y,
                width: canvasLayout.AGENT_WIDTH,
                height: canvasLayout.AGENT_HEIGHT,
                transform: dragPreview.hasCollision ? 'scale(0.95)' : 'scale(1.05)',
                animation: dragPreview.hasCollision ? 'shake 0.5s ease-in-out infinite' : 'pulse 2s ease-in-out infinite'
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`text-center ${dragPreview.hasCollision ? 'text-red-600' : 'text-blue-600'}`}>
                  <div className="text-2xl mb-1">
                    {dragPreview.hasCollision ? '❌' : '✅'}
                  </div>
                  <div className="text-xs font-medium">
                    {dragPreview.hasCollision ? 'Too close!' : 'Perfect spot!'}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Show connection to original position */}
            {dragPreview.originalPosition && (
              <svg
                className="absolute inset-0 pointer-events-none"
                style={{ 
                  width: '100%', 
                  height: '100%',
                  left: 0,
                  top: 0
                }}
              >
                <line
                  x1={dragPreview.originalPosition.x}
                  y1={dragPreview.originalPosition.y}
                  x2={dragPreview.position.x + canvasLayout.AGENT_WIDTH / 2}
                  y2={dragPreview.position.y + canvasLayout.AGENT_HEIGHT / 2}
                  stroke="rgba(59, 130, 246, 0.4)"
                  strokeWidth="2"
                  strokeDasharray="8, 4"
                />
              </svg>
            )}
          </div>
        )}

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
const WorkflowCanvas = ({ isExecuting = false, isAuthenticated = false, onAuthRequired }) => {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner 
        isExecuting={isExecuting} 
        isAuthenticated={isAuthenticated}
        onAuthRequired={onAuthRequired}
      />
    </ReactFlowProvider>
  );
};

export default WorkflowCanvas;