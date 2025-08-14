import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Loader,
  Lock,
  Star,
  Shield
} from 'lucide-react';
import WorkflowCanvas from './canvas/WorkflowCanvas';
import AgentLibrary from './AgentLibrary';
import ChatPanel from './ChatPanel';
import ExecutionPanel from './ExecutionPanel';
import ComingSoonModal from './ComingSoonModal';
import ExportLocationModal from './ExportLocationModal';
import useWorkflowStore from '../lib/stores/workflowStore';
import { agents, workflowTemplates, executionSteps } from '../data/mock';
import { exportWorkflowWithFiles, isFileSystemAccessSupported } from '../lib/exportUtils';
import { useUser, SignInButton } from '@clerk/clerk-react';

const WorkflowDesigner = () => {
  const navigate = useNavigate();
  const [isExecuting, setIsExecuting] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showLibrary, setShowLibrary] = useState(true);
  const [showExecution, setShowExecution] = useState(false);
  const [workflowName, setWorkflowName] = useState('My AI Team Workflow');
  const [activeTab, setActiveTab] = useState('agents');
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [showExportLocationModal, setShowExportLocationModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(null); // For feature-specific auth prompts
  
  const { isSignedIn, user } = useUser();

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

  // Hierarchical layout algorithm
  const createHierarchicalLayout = (template) => {
    const { hierarchy, connections } = template;
    const { manager, techLead, designLead, team } = hierarchy;
    
    const nodes = [];
    const edges = [];
    const timestamp = Date.now();
    
    // Layout configuration - maximum spacing for crystal clear hierarchy
    const layout = {
      centerX: 600,
      managerY: 120,
      leadY: 400,
      teamY: 700,
      horizontalSpacing: 500,
      nodeWidth: 280
    };
    
    // Create manager node (top center)
    if (manager) {
      const managerAgent = agents.find(a => a.id === manager);
      if (managerAgent) {
        nodes.push({
          id: `${manager}-${timestamp}`,
          type: 'agent',
          position: { x: layout.centerX - layout.nodeWidth/2, y: layout.managerY },
          data: {
            ...managerAgent,
            status: 'idle',
            role: 'manager',
            isManager: true
          }
        });
      }
    }
    
    // Create lead nodes (second level)
    const leads = [techLead, designLead].filter(Boolean);
    const leadStartX = layout.centerX - ((leads.length - 1) * layout.horizontalSpacing) / 2;
    
    leads.forEach((leadId, index) => {
      const leadAgent = agents.find(a => a.id === leadId);
      if (leadAgent) {
        const nodeId = `${leadId}-${timestamp}`;
        nodes.push({
          id: nodeId,
          type: 'agent',
          position: { 
            x: leadStartX + index * layout.horizontalSpacing - layout.nodeWidth/2, 
            y: layout.leadY 
          },
          data: {
            ...leadAgent,
            status: 'idle',
            role: 'lead',
            isLead: true
          }
        });
        
        // Connect manager to leads
        if (manager) {
          edges.push({
            id: `${manager}-${leadId}-${timestamp}`,
            source: `${manager}-${timestamp}`,
            target: nodeId,
            type: 'smoothstep',
            style: { stroke: '#3b82f6', strokeWidth: 2 },
            data: { type: 'manages' }
          });
        }
      }
    });
    
    // Create team member nodes (third level)
    if (team && team.length > 0) {
      const teamStartX = layout.centerX - ((team.length - 1) * (layout.horizontalSpacing * 0.85)) / 2;
      
      team.forEach((memberId, index) => {
        const memberAgent = agents.find(a => a.id === memberId);
        if (memberAgent) {
          const nodeId = `${memberId}-${timestamp}`;
          nodes.push({
            id: nodeId,
            type: 'agent',
            position: { 
              x: teamStartX + index * (layout.horizontalSpacing * 0.85) - layout.nodeWidth/2, 
              y: layout.teamY 
            },
            data: {
              ...memberAgent,
              status: 'idle',
              role: 'member'
            }
          });
        }
      });
    }
    
    // Create connections based on template definition
    if (connections) {
      connections.forEach(conn => {
        const sourceId = `${conn.from}-${timestamp}`;
        const targetId = `${conn.to}-${timestamp}`;
        
        // Check if both nodes exist
        const sourceExists = nodes.some(n => n.id === sourceId);
        const targetExists = nodes.some(n => n.id === targetId);
        
        if (sourceExists && targetExists) {
          const edgeStyle = {
            manages: { stroke: '#3b82f6', strokeWidth: 2 },
            coordinates: { stroke: '#10b981', strokeWidth: 2 },
            collaborates: { stroke: '#f59e0b', strokeWidth: 1, strokeDasharray: '5,5' },
            reports: { stroke: '#6b7280', strokeWidth: 1 }
          };
          
          edges.push({
            id: `${conn.from}-${conn.to}-${timestamp}`,
            source: sourceId,
            target: targetId,
            type: conn.type === 'collaborates' ? 'default' : 'smoothstep',
            style: edgeStyle[conn.type] || edgeStyle.reports,
            data: { type: conn.type }
          });
        }
      });
    }
    
    return { nodes, edges };
  };
  
  const handleLoadTemplate = useCallback((template) => {
    if (!isSignedIn) {
      setShowAuthPrompt('template');
      return;
    }
    
    const { nodes: templateNodes, edges: templateEdges } = createHierarchicalLayout(template);
    
    setCurrentWorkflow({
      id: `workflow-${Date.now()}`,
      name: template.name,
      nodes: templateNodes,
      edges: templateEdges
    });
    setWorkflowName(template.name);
  }, [setCurrentWorkflow, isSignedIn]);

  const handleExecuteWorkflow = async () => {
    if (!isSignedIn) {
      setShowAuthPrompt('execute');
      return;
    }
    
    if (nodes.length === 0) {
      alert('Please add at least one agent to your workflow');
      return;
    }
    
    try {
      // Import the execution services
      const { default: executionWebSocketService } = await import('../services/executionWebSocket');
      const { 
        startExecution, 
        updateWebSocketState 
      } = useWorkflowStore.getState();

      // Create execution request
      const executionRequest = {
        workflow_name: workflowName,
        workflow_data: {
          nodes,
          edges,
          estimatedSteps: nodes.length * 2 // Rough estimate: setup + execution per agent
        },
        estimated_steps: nodes.length * 2,
        metadata: {
          created_at: new Date().toISOString(),
          user_id: user?.id
        }
      };

      // Start execution in store
      startExecution({
        workflowId: null, // Will be set by backend
        estimatedSteps: nodes.length * 2,
        agents: nodes.map(node => node.data)
      });

      // Get auth token (assuming it's stored in localStorage)
      const token = localStorage.getItem('auth_token') || user?.sessionId;
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Create execution via API first
      const apiResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/v1/executions/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(executionRequest)
      });

      if (!apiResponse.ok) {
        throw new Error(`Failed to create execution: ${apiResponse.statusText}`);
      }

      const execution = await apiResponse.json();
      console.log('Created execution:', execution);

      // Connect to execution WebSocket
      await executionWebSocketService.connect(token, execution.id);

      // Send workflow execution request
      executionWebSocketService.startExecution({
        nodes,
        edges,
        name: workflowName
      });

      // Show execution panel
      setShowExecution(true);
      setShowLibrary(false);
      setShowChat(false);

      console.log('Execution started successfully');

    } catch (error) {
      console.error('Execution failed:', error);
      const { updateExecutionStatus } = useWorkflowStore.getState();
      updateExecutionStatus('failed');
      
      alert('Failed to start execution: ' + error.message);
      
      // Reset execution state
      const { resetExecution } = useWorkflowStore.getState();
      resetExecution();
    }
  };

  const handleSaveWorkflow = () => {
    if (!isSignedIn) {
      setShowAuthPrompt('save');
      return;
    }
    
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
    if (!isSignedIn) {
      setShowAuthPrompt('export');
      return;
    }
    
    if (nodes.length === 0) {
      alert('Please add at least one agent to your workflow before exporting');
      return;
    }

    // Show location selection modal
    setShowExportLocationModal(true);
  };

  const handleExportWithLocation = async (location) => {
    setIsExporting(true);
    
    try {
      const result = await exportWorkflowWithFiles(workflowName, nodes, edges, location);
      
      if (result.success) {
        alert(`✅ Export successful!\n\n${result.message}`);
      } else {
        alert(`❌ Export failed:\n\n${result.message}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert(`❌ Export failed:\n\n${error.message}`);
    } finally {
      setIsExporting(false);
    }
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
    <div className="workflow-designer" style={{ background: 'var(--bg-page)' }}>
      {/* Header */}
      <header className="h-16 border-b flex items-center justify-between px-4" 
              style={{ borderColor: 'var(--border-light)', background: 'var(--bg-card)' }}>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="font-mono font-semibold text-lg hover:opacity-80 transition-opacity"
          >
            SaasIt.ai
          </button>
          <div className="w-px h-6" style={{ background: 'var(--border-light)' }}></div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={workflowName}
              onChange={(e) => isSignedIn ? setWorkflowName(e.target.value) : setShowAuthPrompt('edit')}
              onFocus={() => !isSignedIn && setShowAuthPrompt('edit')}
              className={`font-medium bg-transparent border-none outline-none text-lg max-w-xs ${!isSignedIn ? 'cursor-pointer' : 'cursor-text'}`}
              style={{ color: 'var(--text-primary)' }}
              readOnly={!isSignedIn}
              title={!isSignedIn ? 'Sign in to edit workflow name' : ''}
            />
            {!isSignedIn && <Lock size={14} className="opacity-50" />}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSaveWorkflow}
            className={`btn-secondary ${!isSignedIn ? 'relative' : ''}`}
            title={!isSignedIn ? 'Sign in to save workflows' : ''}
          >
            <Save size={16} className="mr-2" />
            Save
            {!isSignedIn && <Lock size={12} className="ml-1 opacity-60" />}
          </button>
          
          <button 
            onClick={handleExportWorkflow}
            disabled={isExporting || nodes.length === 0}
            className={`btn-secondary disabled:opacity-50 disabled:cursor-not-allowed ${!isSignedIn ? 'relative' : ''}`}
            title={!isSignedIn ? 'Sign in to export workflows' : (isFileSystemAccessSupported() ? 'Export with agent files' : 'Export config only (use Chrome/Edge for full export)')}
          >
            {isExporting ? (
              <Loader size={16} className="mr-2 animate-spin" />
            ) : (
              <Download size={16} className="mr-2" />
            )}
            {isExporting ? 'Exporting...' : 'Export'}
            {!isSignedIn && <Lock size={12} className="ml-1 opacity-60" />}
          </button>
          
          <button 
            onClick={handleExecuteWorkflow}
            className={`btn-primary ${!isSignedIn ? 'relative' : ''}`}
            disabled={isExecuting || nodes.length === 0}
            title={!isSignedIn ? 'Sign in to run workflows in the cloud' : ''}
          >
            {isExecuting ? (
              <Loader size={16} className="mr-2 animate-spin" />
            ) : (
              <Play size={16} className="mr-2" />
            )}
            {isExecuting ? 'Running...' : 'Run in Cloud'}
            {!isSignedIn && <Lock size={12} className="ml-1 opacity-60" />}
          </button>
          
          {/* Library Button - separate from Run button */}
          {!showLibrary && !showExecution && (
            <button
              onClick={() => setShowLibrary(true)}
              className="btn-secondary text-sm px-3 py-2"
            >
              <Settings size={16} className="mr-2" />
              Library
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="workflow-main">
        {/* Chat Panel */}
        {showChat && (
          <div className="workflow-panel border-r transition-width panel-slide-in" style={{ 
            borderColor: 'var(--border-light)',
            width: '300px'
          }}>
            <div className="h-12 border-b flex items-center justify-between px-4" 
                 style={{ borderColor: 'var(--border-light)', background: 'var(--bg-card)' }}>
              <div className="flex items-center gap-2">
                <h3 className="font-mono font-medium text-sm uppercase tracking-wider">AI Assistant</h3>
                {!isSignedIn && <Lock size={12} className="opacity-60" />}
              </div>
              <button 
                onClick={() => setShowChat(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={16} />
              </button>
            </div>
            {isSignedIn ? (
              <ChatPanel />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
                  <MessageSquare size={24} className="text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">AI Assistant</h3>
                <p className="text-sm text-gray-600 mb-4">Get personalized workflow recommendations and build guidance from our AI assistant.</p>
                <button 
                  onClick={() => setShowAuthPrompt('chat')}
                  className="btn-primary text-sm px-4 py-2"
                >
                  <Lock size={14} className="mr-2" />
                  Sign In to Chat
                </button>
              </div>
            )}
          </div>
        )}

        {/* Canvas Area */}
        <div className="workflow-canvas transition-all">
          {!showChat && (
            <button
              onClick={() => setShowChat(true)}
              className={`absolute top-4 left-4 z-10 btn-secondary fade-in-up ${!isSignedIn ? 'relative' : ''}`}
              title={!isSignedIn ? 'Sign in to use AI assistant' : ''}
            >
              <MessageSquare size={16} className="mr-2" />
              Chat
              {!isSignedIn && <Lock size={12} className="ml-1 opacity-60" />}
            </button>
          )}
          
          <WorkflowCanvas 
            isExecuting={isExecuting} 
            isAuthenticated={isSignedIn}
            onAuthRequired={(feature) => setShowAuthPrompt(feature)}
          />
          
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center max-w-2xl p-8 fade-in-up">
                <div className="mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Plus size={28} className="text-blue-600" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Build Your AI Team</h3>
                
                
                {/* Interactive Guide */}
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 mb-6 border border-blue-200 shadow-lg">
                  <div className="flex items-center justify-center mb-4">
                    <span className="text-sm text-blue-800 font-medium">
                      Get started
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 max-w-lg mx-auto">
                    <button
                      onClick={() => setShowChat(true)}
                      className="bg-white/90 hover:bg-white rounded-xl p-4 border border-blue-300 hover:border-blue-400 transition-all pointer-events-auto hover:shadow-lg"
                    >
                      <div className="text-2xl mb-2">💬</div>
                      <h4 className="font-semibold text-sm mb-1 text-gray-800">
                        Describe Your App
                      </h4>
                      <p className="text-xs text-gray-600">
                        Tell AI what you want to build
                      </p>
                    </button>
                    
                    <button
                      onClick={() => setShowLibrary(true)}
                      className="bg-white/90 hover:bg-white rounded-xl p-4 border border-purple-300 hover:border-purple-400 transition-all pointer-events-auto hover:shadow-lg"
                    >
                      <div className="text-2xl mb-2">🤖</div>
                      <h4 className="font-semibold text-sm mb-1 text-gray-800">Browse Agents</h4>
                      <p className="text-xs text-gray-600">40+ specialists available</p>
                    </button>
                  </div>
                  
                </div>
                
              </div>
            </div>
          )}
        </div>

        {/* Right Panel */}
        {(showLibrary || showExecution) && (
          <div className="workflow-panel border-l transition-width" style={{ 
            borderColor: 'var(--border-light)',
            width: '350px',
            animation: 'slideInRight 0.3s ease-out'
          }}>
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
              <ExecutionPanel />
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <AgentLibrary 
                  activeTab={activeTab}
                  templates={workflowTemplates}
                  onLoadTemplate={handleLoadTemplate}
                  isAuthenticated={isSignedIn}
                  onAuthRequired={(feature) => setShowAuthPrompt(feature)}
                />
              </div>
            )}
          </div>
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
      
      {/* Coming Soon Modal */}
      <ComingSoonModal 
        isOpen={showComingSoonModal} 
        onClose={() => setShowComingSoonModal(false)} 
      />
      
      {/* Export Location Modal */}
      <ExportLocationModal
        isOpen={showExportLocationModal}
        onClose={() => setShowExportLocationModal(false)}
        onSelectLocation={handleExportWithLocation}
      />
      
      
      {/* Feature-specific Auth Prompt Modal */}
      {showAuthPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAuthPrompt(null);
            }
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 relative animate-scale-in"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-light)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <button
              onClick={() => setShowAuthPrompt(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors z-10"
            >
              <X size={16} />
            </button>

            <div className="p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield size={28} className="text-orange-600" />
                </div>
                <h2 className="text-2xl font-semibold mb-3">
                  {showAuthPrompt === 'execute' && 'Cloud Execution'}
                  {showAuthPrompt === 'save' && 'Save Workflows'}
                  {showAuthPrompt === 'export' && 'Export Workflows'}
                  {showAuthPrompt === 'chat' && 'AI Assistant'}
                  {showAuthPrompt === 'template' && 'Use Templates'}
                  {showAuthPrompt === 'drag' && 'Add Agents'}
                  {showAuthPrompt === 'edit' && 'Edit Workflow'}
                </h2>
                <h3 className="text-xl font-medium bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent mb-4">
                  Premium Feature
                </h3>
                <p className="text-gray-600 mb-6">
                  {showAuthPrompt === 'execute' && 'Run your AI teams in the cloud with real tools and APIs. Get complete applications delivered in days.'}
                  {showAuthPrompt === 'save' && 'Save your workflows to access them later and build a library of your AI teams.'}
                  {showAuthPrompt === 'export' && 'Export your workflows with full code generation and deployment-ready files.'}
                  {showAuthPrompt === 'chat' && 'Get personalized recommendations and build guidance from our AI assistant.'}
                  {showAuthPrompt === 'template' && 'Use proven workflow templates to jumpstart your AI team development.'}
                  {showAuthPrompt === 'drag' && 'Add and configure AI agents to build your custom development teams.'}
                  {showAuthPrompt === 'edit' && 'Create and customize your workflow names and configurations to organize your AI teams.'}
                </p>
              </div>
              
              <div className="space-y-3">
                <SignInButton mode="modal" afterSignInUrl="/app">
                  <button className="w-full btn-primary flex items-center justify-center gap-2">
                    <Star size={16} />
                    Sign Up for Full Access
                  </button>
                </SignInButton>
                
                <p className="text-xs text-center text-gray-500">
                  Join thousands of developers using SaasIt.ai
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowDesigner;