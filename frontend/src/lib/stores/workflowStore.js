import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

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
    }))
  )
);

export default useWorkflowStore;