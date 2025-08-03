import React, { useState, useCallback, useEffect } from 'react';
import { 
  MessageSquare, 
  Play, 
  Save, 
  Download, 
  Settings,
  Plus,
  X,
  Clock,
  CheckCircle,
  Loader
} from 'lucide-react';
import WorkflowCanvas from './canvas/WorkflowCanvas';
import AgentLibrary from './AgentLibrary';
import ChatPanel from './ChatPanel';
import ExecutionPanel from './ExecutionPanel';
import useWorkflowStore from '../lib/stores/workflowStore';
import { agents, workflowTemplates, executionSteps } from '../data/mock';

const WorkflowDesigner = ({ onBackToLanding }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showLibrary, setShowLibrary] = useState(true);
  const [showExecution, setShowExecution] = useState(false);
  const [workflowName, setWorkflowName] = useState('My AI Team Workflow');
  const [activeTab, setActiveTab] = useState('agents');

  const {
    nodes,
    edges,
    setCurrentWorkflow,
    updateNode,
    clearError
  } = useWorkflowStore();

  // Initialize workflow on component mount
  useEffect(() => {
    setCurrentWorkflow({
      id: `workflow-${Date.now()}`,
      name: workflowName,
      nodes: [],
      edges: []
    });
    clearError();
  }, [setCurrentWorkflow, clearError, workflowName]);

  const handleLoadTemplate = useCallback((template) => {
    const templateNodes = template.agents.map((agentId, index) => {
      const agent = agents.find(a => a.id === agentId);
      if (!agent) return null;
      
      return {
        id: `${agent.id}-${Date.now()}-${index}`,
        type: 'agent',
        position: { 
          x: 100 + (index % 3) * 320, 
          y: 100 + Math.floor(index / 3) * 200 
        },
        data: {
          ...agent,
          status: 'idle'
        }
      };
    }).filter(Boolean);
    
    setCurrentWorkflow({
      id: `workflow-${Date.now()}`,
      name: template.name,
      nodes: templateNodes,
      edges: []
    });
    setWorkflowName(template.name);
  }, [setCurrentWorkflow]);

  const handleExecuteWorkflow = () => {
    if (nodes.length === 0) {
      alert('Please add at least one agent to your workflow');
      return;
    }
    
    setIsExecuting(true);
    setShowExecution(true);
    
    // Update all nodes to running status
    nodes.forEach(node => {
      updateNode(node.id, { data: { ...node.data, status: 'running' } });
    });
    
    // Mock execution simulation
    setTimeout(() => {
      nodes.forEach(node => {
        updateNode(node.id, { data: { ...node.data, status: 'completed' } });
      });
      setIsExecuting(false);
    }, 10000);
  };

  const handleSaveWorkflow = () => {
    const workflow = {
      name: workflowName,
      nodes,
      edges,
      timestamp: new Date().toISOString()
    };
    console.log('Saving workflow:', workflow);
    
    // Mock save to localStorage
    try {
      const savedWorkflows = JSON.parse(localStorage.getItem('saasit-workflows') || '[]');
      savedWorkflows.push(workflow);
      localStorage.setItem('saasit-workflows', JSON.stringify(savedWorkflows));
      alert('Workflow saved successfully!');
    } catch (error) {
      console.error('Error saving workflow:', error);
      alert('Error saving workflow');
    }
  };

  const handleExportWorkflow = () => {
    const config = {
      name: workflowName,
      agents: nodes.map(node => ({
        id: node.data.id,
        name: node.data.name,
        category: node.data.category,
        capabilities: node.data.capabilities,
        position: node.position
      })),
      connections: edges
    };
    
    const dataStr = JSON.stringify(config, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${workflowName.toLowerCase().replace(/\s+/g, '-')}-config.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const getTotalEstimatedTime = () => {
    const totalHours = nodes.reduce((total, node) => {
      const timeStr = node.data.estimatedTime || '0-0 hours';
      const maxHours = parseInt(timeStr.split('-')[1] || timeStr.split(' ')[0]);
      return total + maxHours;
    }, 0);
    return totalHours;
  };

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg-page)' }}>
      {/* Header */}
      <header className="h-16 border-b flex items-center justify-between px-4" 
              style={{ borderColor: 'var(--border-light)', background: 'var(--bg-card)' }}>
        <div className="flex items-center gap-4">
          <button 
            onClick={onBackToLanding}
            className="font-mono font-semibold text-lg hover:opacity-80 transition-opacity"
          >
            SaasIt.ai
          </button>
          <div className="w-px h-6" style={{ background: 'var(--border-light)' }}></div>
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="font-medium bg-transparent border-none outline-none text-lg max-w-xs"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSaveWorkflow}
            className="btn-secondary"
          >
            <Save size={16} className="mr-2" />
            Save
          </button>
          
          <button 
            onClick={handleExportWorkflow}
            className="btn-secondary"
            disabled={nodes.length === 0}
          >
            <Download size={16} className="mr-2" />
            Export
          </button>
          
          <button 
            onClick={handleExecuteWorkflow}
            className="btn-primary"
            disabled={isExecuting || nodes.length === 0}
          >
            {isExecuting ? (
              <Loader size={16} className="mr-2 animate-spin" />
            ) : (
              <Play size={16} className="mr-2" />
            )}
            {isExecuting ? 'Running...' : 'Run in Cloud'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Chat Panel */}
        {showChat && (
          <div className="w-80 border-r flex flex-col" style={{ borderColor: 'var(--border-light)' }}>
            <div className="h-12 border-b flex items-center justify-between px-4" 
                 style={{ borderColor: 'var(--border-light)', background: 'var(--bg-card)' }}>
              <h3 className="font-mono font-medium text-sm uppercase tracking-wider">AI Assistant</h3>
              <button 
                onClick={() => setShowChat(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={16} />
              </button>
            </div>
            <ChatPanel />
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 relative">
          {!showChat && (
            <button
              onClick={() => setShowChat(true)}
              className="absolute top-4 left-4 z-10 btn-secondary"
            >
              <MessageSquare size={16} className="mr-2" />
              Chat
            </button>
          )}
          
          <WorkflowCanvas isExecuting={isExecuting} />
          
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center max-w-md">
                <Plus size={48} className="mx-auto mb-4 opacity-30" />
                <h3 className="heading-2 mb-2">Start Building Your AI Team</h3>
                <p className="body-medium opacity-70 mb-4">
                  Drag agents from the library to the canvas or describe your app in the chat to get started
                </p>
                <button 
                  onClick={() => setShowLibrary(true)}
                  className="btn-primary pointer-events-auto"
                >
                  Browse Agents
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel */}
        {(showLibrary || showExecution) && (
          <div className="w-96 border-l flex flex-col" style={{ borderColor: 'var(--border-light)' }}>
            {/* Tabs */}
            <div className="h-12 border-b flex items-center" 
                 style={{ borderColor: 'var(--border-light)', background: 'var(--bg-card)' }}>
              <div className="flex-1 flex">
                <button
                  onClick={() => {
                    setActiveTab('agents');
                    setShowLibrary(true);
                    setShowExecution(false);
                  }}
                  className={`flex-1 h-12 px-4 text-sm font-mono uppercase tracking-wider border-r transition-colors ${
                    activeTab === 'agents' && !showExecution
                      ? 'bg-blue-50 text-blue-600' 
                      : 'hover:bg-gray-50'
                  }`}
                  style={{ borderColor: 'var(--border-light)' }}
                >
                  Agents
                </button>
                <button
                  onClick={() => {
                    setActiveTab('templates');
                    setShowLibrary(true);
                    setShowExecution(false);
                  }}
                  className={`flex-1 h-12 px-4 text-sm font-mono uppercase tracking-wider border-r transition-colors ${
                    activeTab === 'templates' && !showExecution
                      ? 'bg-blue-50 text-blue-600' 
                      : 'hover:bg-gray-50'
                  }`}
                  style={{ borderColor: 'var(--border-light)' }}
                >
                  Templates
                </button>
                <button
                  onClick={() => {
                    setShowExecution(true);
                    setShowLibrary(false);
                  }}
                  className={`flex-1 h-12 px-4 text-sm font-mono uppercase tracking-wider transition-colors relative ${
                    showExecution
                      ? 'bg-green-50 text-green-600' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  Execution
                  {isExecuting && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  )}
                </button>
              </div>
              <button 
                onClick={() => {
                  setShowLibrary(false);
                  setShowExecution(false);
                }}
                className="p-3 hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>

            {/* Panel Content */}
            {showExecution ? (
              <ExecutionPanel 
                steps={executionSteps}
                isExecuting={isExecuting}
                selectedAgents={nodes.map(node => node.data)}
              />
            ) : (
              <AgentLibrary 
                activeTab={activeTab}
                templates={workflowTemplates}
                onLoadTemplate={handleLoadTemplate}
              />
            )}
          </div>
        )}

        {/* Toggle Library Button */}
        {!showLibrary && !showExecution && (
          <button
            onClick={() => setShowLibrary(true)}
            className="absolute top-4 right-4 btn-secondary"
          >
            <Settings size={16} className="mr-2" />
            Library
          </button>
        )}
      </div>

      {/* Status Bar */}
      <div className="h-8 border-t px-4 flex items-center justify-between text-xs" 
           style={{ borderColor: 'var(--border-light)', background: 'var(--bg-card)' }}>
        <div className="flex items-center gap-4">
          <span className="font-mono">
            {nodes.length} agent{nodes.length !== 1 ? 's' : ''} selected
          </span>
          <span className="font-mono opacity-60">
            Est. runtime: {getTotalEstimatedTime()} hours
          </span>
          <span className="font-mono opacity-60">
            {edges.length} connection{edges.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {isExecuting ? (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-mono text-green-600">Executing</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="font-mono opacity-60">Ready</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowDesigner;