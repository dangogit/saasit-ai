import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import layoutEngine from '../../utils/layoutEngine';
import workflowGenerator from '../../services/workflowGenerator';

const useWorkflowStore = create()(
  devtools(
    immer((set, get) => ({
      // State
      workflows: [],
      currentWorkflow: null,
      nodes: [],
      edges: [],
      isLoading: false,
      error: null,
      
      // AI Assistant State
      conversationHistory: [],
      conversationPhase: 'initial', // initial, clarifying, designing, refining
      projectContext: {},
      layoutMode: 'auto', // auto, manual
      currentLayoutType: 'hybrid', // sequential, parallel, hybrid, hierarchical

      // Execution State
      executionState: {
        isExecuting: false,
        executionId: null,
        startTime: null,
        endTime: null,
        status: 'idle', // idle, starting, running, paused, completed, failed, cancelled
        currentStep: null,
        totalSteps: 0,
        completedSteps: 0,
        failedSteps: 0,
        progress: 0, // Overall progress 0-100
      },

      // Execution Steps with enhanced data
      executionSteps: [],

      // Real-time terminal output
      terminalOutput: [],
      
      // WebSocket connection state
      wsConnection: {
        isConnected: false,
        connectionId: null,
        lastHeartbeat: null,
        reconnectAttempts: 0,
      },

      // Panel Layout State
      panelLayout: {
        chatPanel: {
          width: 300,
          minWidth: 300,
          maxWidth: 800,
          isVisible: false,
          isExpanded: false,
          expandedWidth: 500,
          storageKey: 'saasit-chat-panel-width'
        },
        agentLibrary: {
          width: 350,
          minWidth: 350,
          maxWidth: 600,
          isVisible: true,
          storageKey: 'saasit-library-panel-width'
        },
        executionPanel: {
          width: 350,
          minWidth: 300,
          maxWidth: 600,
          isVisible: false,
          storageKey: 'saasit-execution-panel-width'
        }
      },

      // Chat enhancement state
      conversationState: {
        currentQuestionIndex: 0,
        totalQuestions: 0,
        isWaitingForAnswer: false,
        questionQueue: [],
        progressPhase: 'initial' // initial, questioning, designing, complete
      },

      // Actions
      setWorkflows: (workflows) =>
        set((state) => {
          state.workflows = workflows;
        }),

      setCurrentWorkflow: (workflow) =>
        set((state) => {
          state.currentWorkflow = workflow;
          state.nodes = workflow?.nodes || [];
          state.edges = workflow?.edges || [];
        }),

      updateWorkflow: (id, updates) =>
        set((state) => {
          const workflow = state.workflows.find((w) => w.id === id);
          if (workflow) {
            Object.assign(workflow, updates);
          }
          if (state.currentWorkflow?.id === id) {
            Object.assign(state.currentWorkflow, updates);
          }
        }),

      addNode: (node) =>
        set((state) => {
          state.nodes.push(node);
          if (state.currentWorkflow) {
            state.currentWorkflow.nodes = state.nodes;
          }
        }),

      removeNode: (nodeId) =>
        set((state) => {
          state.nodes = state.nodes.filter((n) => n.id !== nodeId);
          state.edges = state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
          if (state.currentWorkflow) {
            state.currentWorkflow.nodes = state.nodes;
            state.currentWorkflow.edges = state.edges;
          }
        }),

      updateNode: (nodeId, updates) =>
        set((state) => {
          const node = state.nodes.find((n) => n.id === nodeId);
          if (node) {
            Object.assign(node, updates);
          }
        }),

      addEdge: (edge) =>
        set((state) => {
          state.edges.push(edge);
          if (state.currentWorkflow) {
            state.currentWorkflow.edges = state.edges;
          }
        }),

      removeEdge: (edgeId) =>
        set((state) => {
          state.edges = state.edges.filter((e) => e.id !== edgeId);
          if (state.currentWorkflow) {
            state.currentWorkflow.edges = state.edges;
          }
        }),

      setNodes: (nodes) =>
        set((state) => {
          state.nodes = nodes;
        }),

      setEdges: (edges) =>
        set((state) => {
          state.edges = edges;
        }),

      onNodesChange: (changes) =>
        set((state) => {
          // Apply React Flow node changes
          changes.forEach((change) => {
            const nodeIndex = state.nodes.findIndex((n) => n.id === change.id);
            if (nodeIndex === -1) return;

            switch (change.type) {
              case 'position':
                if (change.position) {
                  state.nodes[nodeIndex].position = change.position;
                }
                if (change.positionAbsolute) {
                  state.nodes[nodeIndex].positionAbsolute = change.positionAbsolute;
                }
                break;
              case 'select':
                state.nodes[nodeIndex].selected = change.selected;
                break;
              case 'remove':
                state.nodes.splice(nodeIndex, 1);
                break;
              case 'dimensions':
                if (change.dimensions) {
                  state.nodes[nodeIndex] = {
                    ...state.nodes[nodeIndex],
                    ...change.dimensions
                  };
                }
                break;
              default:
                break;
            }
          });
        }),

      onEdgesChange: (changes) =>
        set((state) => {
          changes.forEach((change) => {
            const edgeIndex = state.edges.findIndex((e) => e.id === change.id);
            if (edgeIndex === -1) return;

            switch (change.type) {
              case 'select':
                state.edges[edgeIndex].selected = change.selected;
                break;
              case 'remove':
                state.edges.splice(edgeIndex, 1);
                break;
              default:
                break;
            }
          });
        }),

      clearError: () =>
        set((state) => {
          state.error = null;
        }),
        
      // AI Assistant Actions
      setConversationPhase: (phase) =>
        set((state) => {
          state.conversationPhase = phase;
        }),
        
      updateProjectContext: (context) =>
        set((state) => {
          state.projectContext = { ...state.projectContext, ...context };
        }),
        
      addConversationMessage: (message) =>
        set((state) => {
          state.conversationHistory.push(message);
        }),
        
      // Generate workflow from AI response
      generateWorkflowFromAI: async (response) => {
        const { nodes: currentNodes, edges: currentEdges } = get();
        
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });
        
        try {
          // Generate workflow structure
          const workflow = workflowGenerator.generateWorkflow(response);
          
          if (workflow && workflow.nodes) {
            // Apply auto-layout
            const layoutType = workflow.layout || get().currentLayoutType;
            const { nodes: layoutedNodes, edges: layoutedEdges } = layoutEngine.applyLayoutWithTransition(
              workflow.nodes,
              workflow.edges,
              layoutType
            );
            
            set((state) => {
              state.nodes = layoutedNodes;
              state.edges = layoutedEdges;
              state.currentLayoutType = layoutType;
              state.isLoading = false;
              
              if (workflow.metadata) {
                state.conversationPhase = workflow.metadata.phase || state.conversationPhase;
              }
            });
            
            return workflow;
          }
        } catch (error) {
          console.error('Workflow generation error:', error);
          set((state) => {
            state.error = error.message;
            state.isLoading = false;
          });
        }
      },
      
      // Apply layout to existing nodes
      applyAutoLayout: (layoutType = null) => {
        const { nodes, edges, currentLayoutType } = get();
        
        if (!nodes || nodes.length === 0) return;
        
        const type = layoutType || layoutEngine.detectOptimalLayout(nodes, edges);
        const { nodes: layoutedNodes, edges: layoutedEdges } = layoutEngine.applyLayoutWithTransition(
          nodes,
          edges,
          type
        );
        
        set((state) => {
          state.nodes = layoutedNodes;
          state.edges = layoutedEdges;
          state.currentLayoutType = type;
        });
      },
      
      // Add agents to existing workflow
      addAgentsToWorkflow: (newAgents) => {
        const { nodes, edges } = get();
        
        const result = workflowGenerator.addAgentsToWorkflow(nodes, edges, newAgents);
        
        // Apply layout to the updated workflow
        const { nodes: layoutedNodes, edges: layoutedEdges } = layoutEngine.applyLayoutWithTransition(
          result.nodes,
          result.edges,
          get().currentLayoutType
        );
        
        set((state) => {
          state.nodes = layoutedNodes;
          state.edges = layoutedEdges;
        });
      },
      
      // Calculate workflow complexity
      getWorkflowComplexity: () => {
        const { nodes, edges } = get();
        return layoutEngine.calculateComplexity(nodes, edges);
      },
      
      // Reset workflow
      resetWorkflow: () =>
        set((state) => {
          state.nodes = [];
          state.edges = [];
          state.conversationHistory = [];
          state.conversationPhase = 'initial';
          state.projectContext = {};
          state.error = null;
        }),

      // Panel Layout Actions
      updatePanelLayout: (panelId, updates) =>
        set((state) => {
          if (state.panelLayout[panelId]) {
            state.panelLayout[panelId] = { ...state.panelLayout[panelId], ...updates };
          }
        }),

      setPanelWidth: (panelId, width) =>
        set((state) => {
          if (state.panelLayout[panelId]) {
            const panel = state.panelLayout[panelId];
            const constrainedWidth = Math.max(panel.minWidth, Math.min(panel.maxWidth, width));
            state.panelLayout[panelId].width = constrainedWidth;
          }
        }),

      togglePanelVisibility: (panelId) =>
        set((state) => {
          if (state.panelLayout[panelId]) {
            state.panelLayout[panelId].isVisible = !state.panelLayout[panelId].isVisible;
          }
        }),

      setPanelVisibility: (panelId, isVisible) =>
        set((state) => {
          if (state.panelLayout[panelId]) {
            state.panelLayout[panelId].isVisible = isVisible;
          }
        }),

      expandChatPanel: () =>
        set((state) => {
          state.panelLayout.chatPanel.isExpanded = true;
          state.panelLayout.chatPanel.width = state.panelLayout.chatPanel.expandedWidth;
        }),

      collapseChatPanel: () =>
        set((state) => {
          state.panelLayout.chatPanel.isExpanded = false;
          state.panelLayout.chatPanel.width = state.panelLayout.chatPanel.minWidth;
        }),

      // Chat Conversation Flow Actions
      setQuestionQueue: (questions) =>
        set((state) => {
          state.conversationState.questionQueue = questions;
          state.conversationState.totalQuestions = questions.length;
          state.conversationState.currentQuestionIndex = 0;
          state.conversationState.progressPhase = 'questioning';
        }),

      nextQuestion: () =>
        set((state) => {
          if (state.conversationState.currentQuestionIndex < state.conversationState.totalQuestions - 1) {
            state.conversationState.currentQuestionIndex += 1;
            state.conversationState.isWaitingForAnswer = false;
          } else {
            state.conversationState.progressPhase = 'designing';
          }
        }),

      setWaitingForAnswer: (isWaiting) =>
        set((state) => {
          state.conversationState.isWaitingForAnswer = isWaiting;
        }),

      resetConversationFlow: () =>
        set((state) => {
          state.conversationState = {
            currentQuestionIndex: 0,
            totalQuestions: 0,
            isWaitingForAnswer: false,
            questionQueue: [],
            progressPhase: 'initial'
          };
        }),

      // Execution Actions
      startExecution: (workflowData) =>
        set((state) => {
          state.executionState = {
            isExecuting: true,
            executionId: `exec_${Date.now()}`,
            startTime: new Date().toISOString(),
            endTime: null,
            status: 'starting',
            currentStep: null,
            totalSteps: workflowData.estimatedSteps || 0,
            completedSteps: 0,
            failedSteps: 0,
            progress: 0
          };
          state.executionSteps = [];
          state.terminalOutput = [];
        }),

      updateExecutionStatus: (status, currentStep = null) =>
        set((state) => {
          state.executionState.status = status;
          if (currentStep) {
            state.executionState.currentStep = currentStep;
          }
          if (status === 'completed' || status === 'failed' || status === 'cancelled') {
            state.executionState.isExecuting = false;
            state.executionState.endTime = new Date().toISOString();
          }
        }),

      addExecutionStep: (step) =>
        set((state) => {
          const existingStepIndex = state.executionSteps.findIndex(s => s.id === step.id);
          if (existingStepIndex >= 0) {
            // Update existing step
            state.executionSteps[existingStepIndex] = { ...state.executionSteps[existingStepIndex], ...step };
          } else {
            // Add new step
            state.executionSteps.push({
              id: step.id,
              name: step.name,
              agent: step.agent,
              status: step.status || 'pending',
              startTime: step.startTime,
              endTime: step.endTime,
              duration: step.duration || '0s',
              output: step.output || '',
              errorMessage: step.errorMessage || null,
              artifacts: step.artifacts || [],
              progress: step.progress || 0
            });
          }
          
          // Update counters
          const completed = state.executionSteps.filter(s => s.status === 'completed').length;
          const failed = state.executionSteps.filter(s => s.status === 'failed').length;
          state.executionState.completedSteps = completed;
          state.executionState.failedSteps = failed;
          
          // Update overall progress
          if (state.executionState.totalSteps > 0) {
            state.executionState.progress = (completed / state.executionState.totalSteps) * 100;
          }
        }),

      updateExecutionStep: (stepId, stepUpdate) =>
        set((state) => {
          const stepIndex = state.executionSteps.findIndex(s => s.id === stepId);
          if (stepIndex >= 0) {
            state.executionSteps[stepIndex] = { ...state.executionSteps[stepIndex], ...stepUpdate };
            
            // Update counters
            const completed = state.executionSteps.filter(s => s.status === 'completed').length;
            const failed = state.executionSteps.filter(s => s.status === 'failed').length;
            state.executionState.completedSteps = completed;
            state.executionState.failedSteps = failed;
            
            // Update overall progress
            if (state.executionState.totalSteps > 0) {
              state.executionState.progress = (completed / state.executionState.totalSteps) * 100;
            }
          }
        }),

      addTerminalOutput: (output) =>
        set((state) => {
          state.terminalOutput.push({
            id: `output_${Date.now()}_${Math.random()}`,
            timestamp: new Date().toISOString(),
            type: output.type || 'stdout', // stdout, stderr, system, agent
            content: output.content,
            stepId: output.stepId || null,
            agent: output.agent || null
          });
          
          // Keep terminal output manageable (last 1000 entries)
          if (state.terminalOutput.length > 1000) {
            state.terminalOutput = state.terminalOutput.slice(-1000);
          }
        }),

      updateWebSocketState: (wsState) =>
        set((state) => {
          state.wsConnection = { ...state.wsConnection, ...wsState };
        }),

      resetExecution: () =>
        set((state) => {
          state.executionState = {
            isExecuting: false,
            executionId: null,
            startTime: null,
            endTime: null,
            status: 'idle',
            currentStep: null,
            totalSteps: 0,
            completedSteps: 0,
            failedSteps: 0,
            progress: 0
          };
          state.executionSteps = [];
          state.terminalOutput = [];
        }),
    }))
  )
);

export default useWorkflowStore;