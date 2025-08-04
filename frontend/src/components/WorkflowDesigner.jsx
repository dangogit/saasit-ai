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
  Loader
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
    const { nodes: templateNodes, edges: templateEdges } = createHierarchicalLayout(template);
    
    setCurrentWorkflow({
      id: `workflow-${Date.now()}`,
      name: template.name,
      nodes: templateNodes,
      edges: templateEdges
    });
    setWorkflowName(template.name);
  }, [setCurrentWorkflow]);

  const handleExecuteWorkflow = () => {
    if (nodes.length === 0) {
      alert('Please add at least one agent to your workflow');
      return;
    }
    
    // Show coming soon modal instead of executing
    setShowComingSoonModal(true);
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
            disabled={isExporting || nodes.length === 0}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            title={isFileSystemAccessSupported() ? 'Export with agent files' : 'Export config only (use Chrome/Edge for full export)'}
          >
            {isExporting ? (
              <Loader size={16} className="mr-2 animate-spin" />
            ) : (
              <Download size={16} className="mr-2" />
            )}
            {isExporting ? 'Exporting...' : 'Export'}
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
        <div className="workflow-canvas transition-all">
          {!showChat && (
            <button
              onClick={() => setShowChat(true)}
              className="absolute top-4 left-4 z-10 btn-secondary fade-in-up"
            >
              <MessageSquare size={16} className="mr-2" />
              Chat
            </button>
          )}
          
          <WorkflowCanvas isExecuting={isExecuting} />
          
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center max-w-2xl p-8 fade-in-up">
                <div className="mb-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 float-animation shadow-lg">
                    <Plus size={36} className="text-blue-600" />
                  </div>
                </div>
                <h3 className="heading-1 mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Build Your AI Team</h3>
                
                {/* Interactive Guide */}
                <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-3xl p-8 mb-8 border border-blue-200 shadow-xl backdrop-blur-sm">
                  <div className="flex items-center justify-center mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse shadow-lg"></div>
                      <span className="text-base text-blue-800 font-semibold">Choose your approach</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <button
                      onClick={() => setShowChat(true)}
                      className="group bg-white/90 hover:bg-white rounded-2xl p-6 border border-blue-300 hover:border-blue-400 transition-all pointer-events-auto hover:scale-105 hover:shadow-lg"
                    >
                      <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">💬</div>
                      <h4 className="font-bold text-base mb-2 text-gray-800">Describe Your App</h4>
                      <p className="text-sm text-gray-600">Tell me what you want to build</p>
                    </button>
                    
                    <button
                      onClick={() => setShowLibrary(true)}
                      className="group bg-white/90 hover:bg-white rounded-2xl p-6 border border-purple-300 hover:border-purple-400 transition-all pointer-events-auto hover:scale-105 hover:shadow-lg"
                    >
                      <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">🤖</div>
                      <h4 className="font-bold text-base mb-2 text-gray-800">Pick Agents</h4>
                      <p className="text-sm text-gray-600">Browse 40+ specialists</p>
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowLibrary(true);
                        setActiveTab('templates');
                      }}
                      className="group bg-white/90 hover:bg-white rounded-2xl p-6 border border-green-300 hover:border-green-400 transition-all pointer-events-auto hover:scale-105 hover:shadow-lg"
                    >
                      <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">⚡</div>
                      <h4 className="font-bold text-base mb-2 text-gray-800">Use Template</h4>
                      <p className="text-sm text-gray-600">Start with proven teams</p>
                    </button>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm text-gray-600 font-medium">
                      💡 Start with any approach - build and iterate as you go
                    </p>
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="flex justify-center gap-8 text-sm">
                  <div className="flex items-center gap-2 bg-white/60 rounded-full px-4 py-2 backdrop-blur-sm border border-gray-200">
                    <span className="text-lg">✨</span>
                    <span className="font-medium text-gray-700">40+ Agents</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/60 rounded-full px-4 py-2 backdrop-blur-sm border border-gray-200">
                    <span className="text-lg">🚀</span>
                    <span className="font-medium text-gray-700">Ready Templates</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/60 rounded-full px-4 py-2 backdrop-blur-sm border border-gray-200">
                    <span className="text-lg">⚡</span>
                    <span className="font-medium text-gray-700">Instant Deploy</span>
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
              <ExecutionPanel 
                steps={executionSteps}
                isExecuting={isExecuting}
                selectedAgents={nodes.map(node => node.data)}
              />
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <AgentLibrary 
                  activeTab={activeTab}
                  templates={workflowTemplates}
                  onLoadTemplate={handleLoadTemplate}
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
    </div>
  );
};

export default WorkflowDesigner;