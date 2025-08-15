/**
 * Smart Canvas Placement Algorithm with Collision Detection
 * Ensures agents are placed with optimal spacing and no overlaps
 */

// Constants for agent placement
const AGENT_WIDTH = 200;
const AGENT_HEIGHT = 120;
const MIN_SPACING = 150; // Minimum distance between agent centers
const GRID_SIZE = 50; // Grid snap size for consistent placement
const CANVAS_PADDING = 100; // Padding from canvas edges

/**
 * Calculate the bounds of an agent node
 * @param {Object} node - Node with position and dimensions
 * @returns {Object} Bounds with x, y, width, height
 */
export function getNodeBounds(node) {
  return {
    x: node.position.x,
    y: node.position.y,
    width: node.width || AGENT_WIDTH,
    height: node.height || AGENT_HEIGHT
  };
}

/**
 * Check if two nodes overlap with a minimum spacing buffer
 * @param {Object} node1 - First node
 * @param {Object} node2 - Second node
 * @param {number} spacing - Minimum spacing between nodes
 * @returns {boolean} True if nodes would overlap
 */
export function nodesOverlap(node1, node2, spacing = MIN_SPACING) {
  const bounds1 = getNodeBounds(node1);
  const bounds2 = getNodeBounds(node2);
  
  // Calculate center points
  const center1 = {
    x: bounds1.x + bounds1.width / 2,
    y: bounds1.y + bounds1.height / 2
  };
  const center2 = {
    x: bounds2.x + bounds2.width / 2,
    y: bounds2.y + bounds2.height / 2
  };
  
  // Calculate distance between centers
  const distance = Math.sqrt(
    Math.pow(center2.x - center1.x, 2) + 
    Math.pow(center2.y - center1.y, 2)
  );
  
  return distance < spacing;
}

/**
 * Snap position to grid for consistent alignment
 * @param {number} value - Position value
 * @param {number} gridSize - Grid size
 * @returns {number} Snapped position
 */
export function snapToGrid(value, gridSize = GRID_SIZE) {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Find the optimal position for a new node avoiding collisions
 * @param {Array} existingNodes - Array of existing nodes
 * @param {Object} preferredPosition - Preferred position {x, y}
 * @param {Object} canvasBounds - Canvas bounds {width, height}
 * @returns {Object} Optimal position {x, y}
 */
export function findOptimalPosition(existingNodes, preferredPosition, canvasBounds) {
  const newNode = {
    position: { x: preferredPosition.x, y: preferredPosition.y },
    width: AGENT_WIDTH,
    height: AGENT_HEIGHT
  };
  
  // If no existing nodes, use preferred position (snapped to grid)
  if (!existingNodes || existingNodes.length === 0) {
    return {
      x: Math.max(CANVAS_PADDING, snapToGrid(preferredPosition.x)),
      y: Math.max(CANVAS_PADDING, snapToGrid(preferredPosition.y))
    };
  }
  
  // Check if preferred position is valid
  const hasCollision = existingNodes.some(node => 
    nodesOverlap(newNode, node)
  );
  
  if (!hasCollision) {
    return {
      x: snapToGrid(preferredPosition.x),
      y: snapToGrid(preferredPosition.y)
    };
  }
  
  // Find alternative position using spiral search
  return findPositionSpiral(existingNodes, preferredPosition, canvasBounds);
}

/**
 * Find position using spiral search pattern
 * @param {Array} existingNodes - Existing nodes
 * @param {Object} centerPosition - Center point for spiral
 * @param {Object} canvasBounds - Canvas bounds
 * @returns {Object} Found position {x, y}
 */
function findPositionSpiral(existingNodes, centerPosition, canvasBounds) {
  const searchRadius = MIN_SPACING;
  const angleStep = Math.PI / 6; // 30 degrees
  let radius = searchRadius;
  const maxRadius = Math.min(canvasBounds.width, canvasBounds.height) / 2;
  
  while (radius < maxRadius) {
    for (let angle = 0; angle < 2 * Math.PI; angle += angleStep) {
      const x = centerPosition.x + radius * Math.cos(angle);
      const y = centerPosition.y + radius * Math.sin(angle);
      
      // Ensure position is within canvas bounds
      if (x < CANVAS_PADDING || y < CANVAS_PADDING || 
          x > canvasBounds.width - CANVAS_PADDING - AGENT_WIDTH ||
          y > canvasBounds.height - CANVAS_PADDING - AGENT_HEIGHT) {
        continue;
      }
      
      const testNode = {
        position: { x: snapToGrid(x), y: snapToGrid(y) },
        width: AGENT_WIDTH,
        height: AGENT_HEIGHT
      };
      
      const hasCollision = existingNodes.some(node => 
        nodesOverlap(testNode, node)
      );
      
      if (!hasCollision) {
        return { x: snapToGrid(x), y: snapToGrid(y) };
      }
    }
    radius += searchRadius / 2;
  }
  
  // Fallback: place in a grid pattern
  return findGridPosition(existingNodes, canvasBounds);
}

/**
 * Find position using systematic grid placement
 * @param {Array} existingNodes - Existing nodes
 * @param {Object} canvasBounds - Canvas bounds
 * @returns {Object} Grid position {x, y}
 */
function findGridPosition(existingNodes, canvasBounds) {
  const cols = Math.floor((canvasBounds.width - 2 * CANVAS_PADDING) / (AGENT_WIDTH + MIN_SPACING));
  const rows = Math.floor((canvasBounds.height - 2 * CANVAS_PADDING) / (AGENT_HEIGHT + MIN_SPACING));
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = CANVAS_PADDING + col * (AGENT_WIDTH + MIN_SPACING);
      const y = CANVAS_PADDING + row * (AGENT_HEIGHT + MIN_SPACING);
      
      const testNode = {
        position: { x, y },
        width: AGENT_WIDTH,
        height: AGENT_HEIGHT
      };
      
      const hasCollision = existingNodes.some(node => 
        nodesOverlap(testNode, node)
      );
      
      if (!hasCollision) {
        return { x, y };
      }
    }
  }
  
  // Ultimate fallback
  return { x: CANVAS_PADDING, y: CANVAS_PADDING };
}

/**
 * Calculate placement zones for visual feedback
 * @param {Array} existingNodes - Existing nodes
 * @param {Object} canvasBounds - Canvas bounds
 * @returns {Array} Array of optimal placement zones
 */
export function getPlacementZones(existingNodes, canvasBounds) {
  const zones = [];
  const zoneSize = MIN_SPACING;
  
  // Sample potential placement areas
  for (let x = CANVAS_PADDING; x < canvasBounds.width - CANVAS_PADDING - AGENT_WIDTH; x += zoneSize) {
    for (let y = CANVAS_PADDING; y < canvasBounds.height - CANVAS_PADDING - AGENT_HEIGHT; y += zoneSize) {
      const testNode = {
        position: { x, y },
        width: AGENT_WIDTH,
        height: AGENT_HEIGHT
      };
      
      const hasCollision = existingNodes.some(node => 
        nodesOverlap(testNode, node, MIN_SPACING * 0.8) // Slightly smaller buffer for zones
      );
      
      if (!hasCollision) {
        zones.push({
          x,
          y,
          width: zoneSize,
          height: zoneSize,
          score: calculateZoneScore(x, y, existingNodes, canvasBounds)
        });
      }
    }
  }
  
  // Sort zones by score (higher is better)
  return zones.sort((a, b) => b.score - a.score).slice(0, 10); // Return top 10 zones
}

/**
 * Calculate a score for placement zones (higher = better)
 * @param {number} x - Zone x position
 * @param {number} y - Zone y position
 * @param {Array} existingNodes - Existing nodes
 * @param {Object} canvasBounds - Canvas bounds
 * @returns {number} Zone score
 */
function calculateZoneScore(x, y, existingNodes, canvasBounds) {
  let score = 100;
  
  // Prefer positions closer to center
  const centerX = canvasBounds.width / 2;
  const centerY = canvasBounds.height / 2;
  const distanceFromCenter = Math.sqrt(
    Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
  );
  score -= distanceFromCenter * 0.01;
  
  // Prefer positions with good spacing from existing nodes
  existingNodes.forEach(node => {
    const distance = Math.sqrt(
      Math.pow(x - node.position.x, 2) + 
      Math.pow(y - node.position.y, 2)
    );
    
    if (distance > MIN_SPACING && distance < MIN_SPACING * 2) {
      score += 20; // Bonus for good neighbor distance
    } else if (distance < MIN_SPACING) {
      score -= 50; // Penalty for too close
    }
  });
  
  // Prefer grid-aligned positions
  if (x % GRID_SIZE === 0 && y % GRID_SIZE === 0) {
    score += 10;
  }
  
  return score;
}

/**
 * Auto-arrange existing nodes to resolve overlaps
 * @param {Array} nodes - Array of nodes to arrange
 * @param {Object} canvasBounds - Canvas bounds
 * @returns {Array} Rearranged nodes
 */
export function autoArrangeNodes(nodes, canvasBounds) {
  if (!nodes || nodes.length === 0) return nodes;
  
  const arrangedNodes = [...nodes];
  let hasOverlaps = true;
  let iterations = 0;
  const maxIterations = 50;
  
  while (hasOverlaps && iterations < maxIterations) {
    hasOverlaps = false;
    
    for (let i = 0; i < arrangedNodes.length; i++) {
      for (let j = i + 1; j < arrangedNodes.length; j++) {
        if (nodesOverlap(arrangedNodes[i], arrangedNodes[j])) {
          hasOverlaps = true;
          
          // Move the second node to a better position
          const newPosition = findOptimalPosition(
            arrangedNodes.slice(0, j).concat(arrangedNodes.slice(j + 1)),
            arrangedNodes[j].position,
            canvasBounds
          );
          
          arrangedNodes[j] = {
            ...arrangedNodes[j],
            position: newPosition
          };
        }
      }
    }
    iterations++;
  }
  
  return arrangedNodes;
}

/**
 * Get collision prediction for a dragged node
 * @param {Object} draggedNode - Node being dragged
 * @param {Array} existingNodes - Other nodes on canvas
 * @returns {Object} Collision info with suggestions
 */
export function getCollisionPrediction(draggedNode, existingNodes) {
  const collisions = existingNodes.filter(node => 
    node.id !== draggedNode.id && nodesOverlap(draggedNode, node)
  );
  
  if (collisions.length === 0) {
    return {
      hasCollision: false,
      isOptimalPosition: true,
      suggestions: []
    };
  }
  
  // Find alternative positions
  const alternatives = [];
  const searchPositions = [
    { x: draggedNode.position.x + MIN_SPACING, y: draggedNode.position.y },
    { x: draggedNode.position.x - MIN_SPACING, y: draggedNode.position.y },
    { x: draggedNode.position.x, y: draggedNode.position.y + MIN_SPACING },
    { x: draggedNode.position.x, y: draggedNode.position.y - MIN_SPACING }
  ];
  
  searchPositions.forEach(pos => {
    const testNode = { ...draggedNode, position: pos };
    const hasCollision = existingNodes.some(node => 
      node.id !== draggedNode.id && nodesOverlap(testNode, node)
    );
    
    if (!hasCollision) {
      alternatives.push(pos);
    }
  });
  
  return {
    hasCollision: true,
    collidingNodes: collisions,
    suggestedPositions: alternatives.slice(0, 3), // Top 3 alternatives
    optimalPosition: alternatives[0] || findOptimalPosition(
      existingNodes.filter(n => n.id !== draggedNode.id),
      draggedNode.position,
      { width: 1200, height: 800 } // Default canvas size
    )
  };
}

export default {
  findOptimalPosition,
  getPlacementZones,
  autoArrangeNodes,
  getCollisionPrediction,
  nodesOverlap,
  snapToGrid,
  MIN_SPACING,
  AGENT_WIDTH,
  AGENT_HEIGHT
};