import { agents } from '../data/mock';
import apiClient from './api';

class WorkflowGeneratorService {
  constructor() {
    this.agentsMap = this.createAgentsMap();
  }

  createAgentsMap() {
    const map = new Map();
    agents.forEach(agent => {
      map.set(agent.id, agent);
    });
    return map;
  }

  /**
   * Generate a workflow from Claude's response
   * @param {Object} response - The parsed response from Claude
   * @returns {Object} - Workflow with nodes and edges
   */
  generateWorkflow(response) {
    if (!response.workflow) {
      return null;
    }

    const { agents: agentsList = [], connections = [], layout = 'hybrid' } = response.workflow;
    
    // Generate nodes from agents
    const nodes = this.generateNodes(agentsList);
    
    // Generate edges from connections
    const edges = this.generateEdges(connections);

    return {
      nodes,
      edges,
      layout,
      metadata: {
        phase: response.phase,
        message: response.message,
        questions: response.questions || []
      }
    };
  }

  /**
   * Generate React Flow nodes from agent definitions
   */
  generateNodes(agentsList) {
    return agentsList.map((agentDef, index) => {
      // Get full agent data from our agents map
      const fullAgentData = this.agentsMap.get(agentDef.id) || {};
      
      return {
        id: `${agentDef.id}-${Date.now()}-${index}`,
        type: 'agent',
        position: { x: 0, y: 0 }, // Will be calculated by layout engine
        data: {
          ...fullAgentData,
          ...agentDef.data,
          id: agentDef.id,
          status: 'idle',
          role: agentDef.data?.description || fullAgentData.description
        },
        dragHandle: '.drag-handle'
      };
    });
  }

  /**
   * Generate React Flow edges from connections
   */
  generateEdges(connections) {
    return connections.map((connection, index) => {
      const edgeType = this.mapConnectionType(connection.type);
      
      return {
        id: `edge-${connection.source}-${connection.target}-${Date.now()}-${index}`,
        source: `${connection.source}-${Date.now()}-${this.findNodeIndex(connection.source)}`,
        target: `${connection.target}-${Date.now()}-${this.findNodeIndex(connection.target)}`,
        type: 'smoothstep',
        animated: edgeType.animated,
        style: {
          stroke: edgeType.color,
          strokeWidth: 2
        },
        data: {
          label: connection.type,
          connectionType: connection.type
        }
      };
    });
  }

  /**
   * Map connection types to visual properties
   */
  mapConnectionType(type) {
    const typeMap = {
      'depends_on': { color: '#10b981', animated: true },
      'collaborates_with': { color: '#3b82f6', animated: false },
      'reports_to': { color: '#8b5cf6', animated: false },
      'manages': { color: '#f59e0b', animated: false }
    };
    
    return typeMap[type] || { color: '#6b7280', animated: false };
  }

  /**
   * Helper to find node index (temporary solution)
   */
  findNodeIndex(agentId) {
    // This is a simplified version - in real implementation,
    // we'd maintain proper node ID mapping
    return 0;
  }

  /**
   * Send a message to Claude and generate workflow
   */
  async sendMessageAndGenerateWorkflow(messages, projectContext = null) {
    try {
      const response = await apiClient.generateWorkflow(messages, projectContext);
      
      if (response.workflow) {
        return this.generateWorkflow(response);
      }
      
      return {
        metadata: {
          phase: response.phase || 'clarifying',
          message: response.message || '',
          questions: response.questions || []
        }
      };
    } catch (error) {
      console.error('Workflow generation error:', error);
      throw error;
    }
  }

  /**
   * Parse agent suggestions from text and create workflow
   */
  parseAgentSuggestionsFromText(text) {
    const suggestedAgents = [];
    const connections = [];
    
    // Extract agent mentions from bullet points
    const bulletPoints = text.match(/•\s*\*\*(.*?)\*\*/g);
    if (bulletPoints) {
      bulletPoints.forEach((point, index) => {
        const agentName = point.match(/\*\*(.*?)\*\*/)?.[1];
        if (agentName) {
          // Find agent by name
          const agent = agents.find(a => 
            a.name.toLowerCase() === agentName.toLowerCase()
          );
          
          if (agent) {
            suggestedAgents.push({
              id: agent.id,
              data: {
                name: agent.name,
                category: agent.category,
                description: agent.description
              }
            });
            
            // Create sequential connections
            if (index > 0) {
              connections.push({
                source: suggestedAgents[index - 1].id,
                target: agent.id,
                type: 'depends_on'
              });
            }
          }
        }
      });
    }
    
    return {
      workflow: {
        agents: suggestedAgents,
        connections,
        layout: 'sequential'
      }
    };
  }

  /**
   * Add agents to existing workflow
   */
  addAgentsToWorkflow(existingNodes, existingEdges, newAgents) {
    const newNodes = this.generateNodes(newAgents);
    
    // Find the last node in the existing workflow to connect to
    const lastNode = existingNodes[existingNodes.length - 1];
    const newEdges = [];
    
    if (lastNode && newNodes.length > 0) {
      newEdges.push({
        id: `edge-${lastNode.id}-${newNodes[0].id}-${Date.now()}`,
        source: lastNode.id,
        target: newNodes[0].id,
        type: 'smoothstep',
        animated: true,
        style: {
          stroke: '#10b981',
          strokeWidth: 2
        }
      });
    }
    
    return {
      nodes: [...existingNodes, ...newNodes],
      edges: [...existingEdges, ...newEdges]
    };
  }
}

// Export singleton instance
const workflowGenerator = new WorkflowGeneratorService();
export default workflowGenerator;

// Export class for testing
export { WorkflowGeneratorService };