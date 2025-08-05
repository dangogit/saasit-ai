import dagre from '@dagrejs/dagre';

class LayoutEngine {
  constructor() {
    this.defaultNodeWidth = 200;
    this.defaultNodeHeight = 100;
    this.layoutConfigs = {
      sequential: {
        rankdir: 'TB',
        nodesep: 80,
        ranksep: 100,
        marginx: 50,
        marginy: 50
      },
      parallel: {
        rankdir: 'LR',
        nodesep: 120,
        ranksep: 80,
        marginx: 50,
        marginy: 50
      },
      hybrid: {
        rankdir: 'TB',
        nodesep: 100,
        ranksep: 100,
        marginx: 50,
        marginy: 50
      },
      hierarchical: {
        rankdir: 'TB',
        nodesep: 100,
        ranksep: 150,
        marginx: 50,
        marginy: 50
      }
    };
  }

  /**
   * Apply auto-layout to nodes and edges
   * @param {Array} nodes - React Flow nodes
   * @param {Array} edges - React Flow edges
   * @param {string} layoutType - Type of layout (sequential, parallel, hybrid, hierarchical)
   * @returns {Object} - Updated nodes and edges with positions
   */
  applyLayout(nodes, edges, layoutType = 'hybrid') {
    if (!nodes || nodes.length === 0) {
      return { nodes: [], edges };
    }

    // Create a new dagre graph
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    
    // Set graph configuration
    const config = this.layoutConfigs[layoutType] || this.layoutConfigs.hybrid;
    dagreGraph.setGraph(config);

    // Add nodes to the graph
    nodes.forEach(node => {
      dagreGraph.setNode(node.id, {
        width: node.data?.width || this.defaultNodeWidth,
        height: node.data?.height || this.defaultNodeHeight
      });
    });

    // Add edges to the graph
    edges.forEach(edge => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    // Calculate the layout
    dagre.layout(dagreGraph);

    // Apply the calculated positions to nodes
    const layoutedNodes = nodes.map(node => {
      const nodeWithPosition = dagreGraph.node(node.id);
      if (!nodeWithPosition) {
        console.warn(`Node ${node.id} not found in layout`);
        return node;
      }

      return {
        ...node,
        position: {
          x: nodeWithPosition.x - nodeWithPosition.width / 2,
          y: nodeWithPosition.y - nodeWithPosition.height / 2
        }
      };
    });

    return {
      nodes: layoutedNodes,
      edges
    };
  }

  /**
   * Apply layout with smooth transitions
   * @param {Array} nodes - Current nodes
   * @param {Array} edges - Current edges
   * @param {string} layoutType - Layout type
   * @returns {Object} - Nodes with transition styles
   */
  applyLayoutWithTransition(nodes, edges, layoutType = 'hybrid') {
    const { nodes: layoutedNodes, edges: layoutedEdges } = this.applyLayout(nodes, edges, layoutType);

    // Add transition styles for smooth animation
    const transitionedNodes = layoutedNodes.map(node => ({
      ...node,
      style: {
        ...node.style,
        transition: 'all 0.5s ease-in-out'
      }
    }));

    return {
      nodes: transitionedNodes,
      edges: layoutedEdges
    };
  }

  /**
   * Detect optimal layout type based on workflow characteristics
   * @param {Array} nodes - Workflow nodes
   * @param {Array} edges - Workflow edges
   * @returns {string} - Recommended layout type
   */
  detectOptimalLayout(nodes, edges) {
    if (!nodes || nodes.length === 0) {
      return 'hybrid';
    }

    // Count node types and connections
    const nodeCategories = new Set(nodes.map(n => n.data?.category));
    const avgConnections = edges.length / nodes.length;

    // Detect if there are management nodes
    const hasManagers = nodes.some(n => n.data?.isManager);

    // Decision logic
    if (hasManagers) {
      return 'hierarchical';
    } else if (avgConnections < 1.2) {
      return 'sequential';
    } else if (nodeCategories.size === 1) {
      return 'parallel';
    } else {
      return 'hybrid';
    }
  }

  /**
   * Group nodes by category for better organization
   * @param {Array} nodes - Workflow nodes
   * @returns {Object} - Grouped nodes
   */
  groupNodesByCategory(nodes) {
    const groups = {};
    
    nodes.forEach(node => {
      const category = node.data?.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(node);
    });

    return groups;
  }

  /**
   * Calculate workflow complexity score
   * @param {Array} nodes - Workflow nodes
   * @param {Array} edges - Workflow edges
   * @returns {number} - Complexity score (0-100)
   */
  calculateComplexity(nodes, edges) {
    if (!nodes || nodes.length === 0) {
      return 0;
    }

    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    const categoryCount = new Set(nodes.map(n => n.data?.category)).size;
    
    // Simple complexity formula
    const complexity = Math.min(
      100,
      (nodeCount * 5) + (edgeCount * 3) + (categoryCount * 10)
    );

    return Math.round(complexity);
  }

  /**
   * Optimize edge routing to avoid overlaps
   * @param {Array} edges - Workflow edges
   * @param {Array} nodes - Workflow nodes
   * @returns {Array} - Optimized edges
   */
  optimizeEdgeRouting(edges, nodes) {
    // Create a map for quick node lookup
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    return edges.map(edge => {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);

      if (!sourceNode || !targetNode) {
        return edge;
      }

      // Determine edge type based on node positions
      const dx = targetNode.position.x - sourceNode.position.x;
      const dy = targetNode.position.y - sourceNode.position.y;

      let edgeType = 'smoothstep';
      if (Math.abs(dx) > Math.abs(dy) * 2) {
        edgeType = 'step';
      }

      return {
        ...edge,
        type: edgeType
      };
    });
  }

  /**
   * Arrange nodes in a circular layout (useful for collaborative workflows)
   * @param {Array} nodes - Workflow nodes
   * @param {Object} center - Center point {x, y}
   * @param {number} radius - Circle radius
   * @returns {Array} - Nodes with circular positions
   */
  applyCircularLayout(nodes, center = { x: 400, y: 400 }, radius = 300) {
    if (!nodes || nodes.length === 0) {
      return nodes;
    }

    const angleStep = (2 * Math.PI) / nodes.length;

    return nodes.map((node, index) => {
      const angle = index * angleStep;
      return {
        ...node,
        position: {
          x: center.x + radius * Math.cos(angle) - this.defaultNodeWidth / 2,
          y: center.y + radius * Math.sin(angle) - this.defaultNodeHeight / 2
        }
      };
    });
  }
}

// Export singleton instance
const layoutEngine = new LayoutEngine();
export default layoutEngine;

// Export class for testing
export { LayoutEngine };