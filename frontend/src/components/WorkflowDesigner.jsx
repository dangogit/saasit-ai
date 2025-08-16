import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import GitHubConnector from './GitHubConnector';
import ExecutionModeSelector from './ExecutionModeSelector';
import useWorkflowStore from '../lib/stores/workflowStore';
import { agents, workflowTemplates, executionSteps } from '../data/mock';
import { exportWorkflowWithFiles, isFileSystemAccessSupported } from '../lib/exportUtils';
import { useUser, SignInButton } from '@clerk/clerk-react';

const WorkflowDesigner = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Add CSS for sparkle animation
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes sparkle {
        0%, 100% { 
          opacity: 0; 
          transform: scale(0) rotate(0deg); 
        }
        50% { 
          opacity: 1; 
          transform: scale(1) rotate(180deg); 
        }
      }
      @keyframes scale-in {
        0% { 
          opacity: 0; 
          transform: scale(0.9); 
        }
        100% { 
          opacity: 1; 
          transform: scale(1); 
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => document.head.removeChild(style);
  }, []);
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
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [githubToken, setGithubToken] = useState(null);
  const [showExecutionModes, setShowExecutionModes] = useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [templateLoadingProgress, setTemplateLoadingProgress] = useState(0);
  
  const { isSignedIn, user } = useUser();

  const {
    nodes,
    edges,
    projectContext,
    setCurrentWorkflow,
    setProjectContext,
    updateNode,
    clearError
  } = useWorkflowStore();

  // Initialize project context from navigation state
  useEffect(() => {
    const projectContextFromNav = location.state?.projectContext;
    if (projectContextFromNav) {
      setProjectContext(projectContextFromNav);
      
      // Update workflow name based on project
      if (projectContextFromNav.type === 'new' && projectContextFromNav.name) {
        setWorkflowName(`${projectContextFromNav.name} - AI Team`);
      } else if (projectContextFromNav.type === 'existing' && projectContextFromNav.repository) {
        setWorkflowName(`${projectContextFromNav.repository.name} - Enhancement Team`);
      }
    }
  }, [location.state, setProjectContext]);

  // Initialize workflow on component mount
  useEffect(() => {
    const workflowId = `workflow-${Date.now()}`;
    const projectName = projectContext?.name || projectContext?.repository?.name || 'My Project';
    const finalWorkflowName = projectContext ? 
      (projectContext.type === 'new' ? `${projectName} - AI Team` : `${projectName} - Enhancement Team`) :
      workflowName;
    
    setCurrentWorkflow({
      id: workflowId,
      name: finalWorkflowName,
      nodes: [],
      edges: []
    });
    clearError();
  }, [setCurrentWorkflow, clearError, projectContext]);

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
  
  const handleLoadTemplate = useCallback(async (template) => {
    if (!isSignedIn) {
      setShowAuthPrompt('template');
      return;
    }
    
    try {
      setIsLoadingTemplate(true);
      setTemplateLoadingProgress(0);
      
      // Simulate loading progress with realistic stages
      const progressStages = [
        { progress: 20, message: 'Analyzing template structure...', delay: 300 },
        { progress: 50, message: 'Creating agent instances...', delay: 400 },
        { progress: 80, message: 'Building connections...', delay: 350 },
        { progress: 95, message: 'Applying layout...', delay: 250 },
        { progress: 100, message: 'Template loaded!', delay: 200 }
      ];
      
      // Animate progress
      for (const stage of progressStages) {
        await new Promise(resolve => setTimeout(resolve, stage.delay));
        setTemplateLoadingProgress(stage.progress);
      }
      
      // Generate template layout
      const { nodes: templateNodes, edges: templateEdges } = createHierarchicalLayout(template);
      
      // Apply template with staggered node appearance
      setCurrentWorkflow({
        id: `workflow-${Date.now()}`,
        name: template.name,
        nodes: [], // Start with empty to trigger animations
        edges: []
      });
      setWorkflowName(template.name);
      
      // Add nodes with staggered animation
      await new Promise(resolve => setTimeout(resolve, 300));
      
      for (let i = 0; i < templateNodes.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setCurrentWorkflow(prev => ({
          ...prev,
          nodes: [...prev.nodes, templateNodes[i]],
          edges: i === templateNodes.length - 1 ? templateEdges : prev.edges
        }));
      }
      
      // Trigger zoom-to-fit after all nodes are placed
      setTimeout(() => {
        const reactFlowInstance = window.reactFlowInstance;
        if (reactFlowInstance) {
          reactFlowInstance.fitView({ 
            padding: 0.2, 
            duration: 1000,
            includeHiddenNodes: false 
          });
        }
      }, 500);
      
    } catch (error) {
      console.error('Error loading template:', error);
    } finally {
      setIsLoadingTemplate(false);
      setTemplateLoadingProgress(0);
    }
  }, [setCurrentWorkflow, isSignedIn]);

  // Auto-load template when project context is available (separate useEffect after handleLoadTemplate is defined)
  useEffect(() => {
    if (projectContext?.type === 'new' && 
        projectContext.template && 
        projectContext.template.id !== 'choose-later' &&
        isSignedIn &&
        nodes.length === 0) { // Only auto-load if no nodes exist yet
      
      // Find the matching template from workflowTemplates
      const matchingTemplate = workflowTemplates.find(t => 
        t.name.toLowerCase().includes(projectContext.template.name.toLowerCase().split(' ')[0]) ||
        projectContext.template.id === 'saas-starter' && t.id === 'saas-mvp'
      );
      
      if (matchingTemplate) {
        // Load the template after a short delay to ensure the UI is ready
        setTimeout(() => {
          handleLoadTemplate(matchingTemplate);
        }, 1000);
      }
    }
  }, [projectContext, isSignedIn, nodes.length, handleLoadTemplate]);

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
    if (nodes.length === 0) return '0 minutes';
    
    // Calculate realistic execution time based on agent complexity
    const totalMinutes = nodes.reduce((total, node) => {
      const agentComplexity = getAgentComplexity(node.data);
      return total + agentComplexity;
    }, 0);
    
    // Add base time for coordination and setup
    const baseTime = Math.max(1, Math.floor(nodes.length * 0.5)); // 30 seconds per agent for coordination
    const finalTime = totalMinutes + baseTime;
    
    // Format output
    if (finalTime < 60) {
      return `${Math.ceil(finalTime)} minutes`;
    } else {
      const hours = Math.floor(finalTime / 60);
      const minutes = finalTime % 60;
      return minutes > 0 ? `${hours}h ${Math.ceil(minutes)}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
    }
  };

  const getAgentComplexity = (agentData) => {
    // Base time per agent type
    const baseTime = {
      'rapid-prototyper': 3,      // 3 minutes - quick prototyping
      'frontend-developer': 5,    // 5 minutes - UI implementation
      'backend-architect': 8,     // 8 minutes - API and database setup
      'ai-engineer': 10,          // 10 minutes - ML model integration
      'mobile-app-builder': 12,   // 12 minutes - native mobile features
      'devops-automator': 6,      // 6 minutes - deployment automation
      'test-writer-fixer': 4,     // 4 minutes - test suite creation
      'ui-designer': 3,           // 3 minutes - design assets
      'ux-researcher': 2,         // 2 minutes - user research insights
      'performance-benchmarker': 5, // 5 minutes - performance analysis
      'security-expert': 7,       // 7 minutes - security implementation
      'data-analyst': 6,          // 6 minutes - data processing
      'content-creator': 2,       // 2 minutes - content generation
      'growth-hacker': 3,         // 3 minutes - growth strategy
      'project-manager': 1,       // 1 minute - coordination
    };
    
    // Get base time for this agent type
    const agentId = agentData.id || '';
    let estimatedTime = baseTime[agentId] || 5; // Default 5 minutes
    
    // Adjust based on role complexity
    if (agentData.isManager) {
      estimatedTime = Math.max(1, Math.floor(estimatedTime * 0.3)); // Managers coordinate, less execution
    } else if (agentData.isLead) {
      estimatedTime = Math.floor(estimatedTime * 0.7); // Leads have less hands-on work
    }
    
    // Factor in capabilities complexity
    const capabilities = agentData.capabilities || [];
    if (capabilities.length > 5) {
      estimatedTime += 2; // More complex agents take longer
    }
    
    return Math.max(1, estimatedTime); // Minimum 1 minute per agent
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
          
          {/* Project Context Info */}
          {projectContext && (
            <>
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg text-sm">
                {projectContext.type === 'new' ? (
                  <>
                    <span className="text-blue-600">🚀</span>
                    <span className="text-gray-700">New Project</span>
                    {projectContext.template && (
                      <span className="text-gray-500">• {projectContext.template.name}</span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-green-600">📂</span>
                    <span className="text-gray-700">{projectContext.repository?.name}</span>
                    {projectContext.analysis?.primary_technology && (
                      <span className="text-gray-500">• {projectContext.analysis.primary_technology}</span>
                    )}
                  </>
                )}
              </div>
              <div className="w-px h-6" style={{ background: 'var(--border-light)' }}></div>
            </>
          )}
          
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
          
          <div className="relative">
            <WorkflowCanvas 
              isExecuting={isExecuting} 
              isAuthenticated={isSignedIn}
              onAuthRequired={(feature) => setShowAuthPrompt(feature)}
            />
            
            {/* Chat Hint Overlay for "Choose Later" projects with no agents */}
            {projectContext?.template?.id === 'choose-later' && nodes.length === 0 && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-20 pointer-events-none">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 max-w-md mx-4 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <MessageSquare size={28} className="text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Ready to chat?</h3>
                  <p className="text-white/80 text-lg mb-6 leading-relaxed">
                    Since you chose to build with AI guidance, let's start a conversation! 
                    Open the chat panel and tell me about your project vision.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-purple-200 text-sm">
                    <Sparkles size={16} />
                    <span>Click the Chat button to get started</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
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
            Est. runtime: {getTotalEstimatedTime()}
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
      
      
      {/* Template Loading Overlay */}
      {isLoadingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
             style={{
               background: 'rgba(255, 255, 255, 0.95)',
               backdropFilter: 'blur(4px)',
               WebkitBackdropFilter: 'blur(4px)'
             }}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center animate-scale-in"
               style={{
                 border: '1px solid var(--border-light)',
               }}>
            {/* Loading Animation */}
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute inset-2 border-2 border-purple-300 rounded-full border-r-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            
            {/* Title */}
            <h3 className="text-xl font-semibold mb-3 text-gray-800">
              Loading Template
            </h3>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${templateLoadingProgress}%` }}
              />
            </div>
            
            {/* Progress Text */}
            <div className="text-sm text-gray-600 mb-2">
              {templateLoadingProgress}% Complete
            </div>
            
            {/* Loading Message */}
            <div className="text-xs text-gray-500">
              {templateLoadingProgress <= 20 && 'Analyzing template structure...'}
              {templateLoadingProgress > 20 && templateLoadingProgress <= 50 && 'Creating agent instances...'}
              {templateLoadingProgress > 50 && templateLoadingProgress <= 80 && 'Building connections...'}
              {templateLoadingProgress > 80 && templateLoadingProgress < 100 && 'Applying layout...'}
              {templateLoadingProgress === 100 && 'Template loaded! ✨'}
            </div>
            
            {/* Sparkle Animation */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-yellow-400 rounded-full opacity-0 animate-[sparkle_2s_ease-in-out_infinite]"
                  style={{
                    left: `${20 + i * 10}%`,
                    top: `${20 + (i % 3) * 20}%`,
                    animationDelay: `${i * 250}ms`
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      
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