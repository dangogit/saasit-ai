// Export utilities for handling agent files and file system operations

/**
 * Agent file mappings - maps agent IDs to their file paths
 */
const AGENT_FILE_MAPPINGS = {
  // Engineering
  'rapid-prototyper': 'engineering/rapid-prototyper.md',
  'frontend-developer': 'engineering/frontend-developer.md',
  'backend-architect': 'engineering/backend-architect.md',
  'mobile-app-builder': 'engineering/mobile-app-builder.md',
  'ai-engineer': 'engineering/ai-engineer.md',
  'devops-automator': 'engineering/devops-automator.md',
  'test-writer-fixer': 'engineering/test-writer-fixer.md',
  
  // Design
  'ui-designer': 'design/ui-designer.md',
  'ux-researcher': 'design/ux-researcher.md',
  'brand-guardian': 'design/brand-guardian.md',
  'visual-storyteller': 'design/visual-storyteller.md',
  'whimsy-injector': 'design/whimsy-injector.md',
  
  // Marketing
  'growth-hacker': 'marketing/growth-hacker.md',
  'content-creator': 'marketing/content-creator.md',
  'app-store-optimizer': 'marketing/app-store-optimizer.md',
  'tiktok-strategist': 'marketing/tiktok-strategist.md',
  'twitter-engager': 'marketing/twitter-engager.md',
  'instagram-curator': 'marketing/instagram-curator.md',
  'reddit-community-builder': 'marketing/reddit-community-builder.md',
  
  // Product
  'feedback-synthesizer': 'product/feedback-synthesizer.md',
  'trend-researcher': 'product/trend-researcher.md',
  'sprint-prioritizer': 'product/sprint-prioritizer.md',
  
  // Operations
  'analytics-reporter': 'studio-operations/analytics-reporter.md',
  'finance-tracker': 'studio-operations/finance-tracker.md',
  'infrastructure-maintainer': 'studio-operations/infrastructure-maintainer.md',
  'legal-compliance-checker': 'studio-operations/legal-compliance-checker.md',
  'support-responder': 'studio-operations/support-responder.md',
  
  // Testing
  'performance-benchmarker': 'testing/performance-benchmarker.md',
  'api-tester': 'testing/api-tester.md',
  'test-results-analyzer': 'testing/test-results-analyzer.md',
  'tool-evaluator': 'testing/tool-evaluator.md',
  'workflow-optimizer': 'testing/workflow-optimizer.md',
  
  // Management
  'project-shipper': 'project-management/project-shipper.md',
  'studio-producer': 'project-management/studio-producer.md',
  'experiment-tracker': 'project-management/experiment-tracker.md',
  'technical-lead': 'engineering/backend-architect.md', // Fallback for technical lead
  'design-lead': 'design/ui-designer.md', // Fallback for design lead
  
  // Bonus
  'joker': 'bonus/joker.md',
  'studio-coach': 'bonus/studio-coach.md'
};

/**
 * Fetches agent file content from the public agents directory
 */
export async function fetchAgentFile(agentId) {
  const filePath = AGENT_FILE_MAPPINGS[agentId];
  if (!filePath) {
    console.warn(`No file mapping found for agent: ${agentId}`);
    return null;
  }
  
  try {
    const url = `/agents/${filePath}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${filePath}: ${response.statusText}`);
    }
    const content = await response.text();
    return content;
  } catch (error) {
    console.error(`Error fetching agent file for ${agentId}:`, error);
    return null;
  }
}

/**
 * Checks if the File System Access API is supported
 */
export function isFileSystemAccessSupported() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Shows directory picker and exports workflow with agent files
 * @param {string} workflowName - Name of the workflow
 * @param {Array} nodes - Workflow nodes
 * @param {Array} edges - Workflow edges  
 * @param {string} location - 'project' or 'personal'
 */
export async function exportWorkflowWithFiles(workflowName, nodes, edges, location = 'project') {
  if (!isFileSystemAccessSupported()) {
    // Fallback for unsupported browsers
    return await exportWorkflowAsZip(workflowName, nodes, edges);
  }

  // Handle personal location (no directory picker needed)
  if (location === 'personal') {
    return await exportToPersonalAgents(nodes);
  }

  try {
    // Show directory picker for project location
    const projectHandle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents'
    });

    // Create .claude/agents folder structure
    const claudeFolder = await projectHandle.getDirectoryHandle('.claude', {
      create: true
    });
    const agentsFolder = await claudeFolder.getDirectoryHandle('agents', {
      create: true
    });

    // Export agent files directly to agents folder (no subdirectories)
    const exportedCount = await exportAgentFilesFlat(agentsFolder, nodes);
    
    // Create README in project root
    await createProjectReadme(projectHandle, nodes, workflowName);

    return {
      success: true,
      message: `Exported ${exportedCount} agent files to .claude/agents/`,
      path: '.claude/agents'
    };

  } catch (error) {
    if (error.name === 'AbortError') {
      return { success: false, message: 'Export cancelled by user' };
    }
    console.error('Export error:', error);
    return { success: false, message: `Export failed: ${error.message}` };
  }
}

/**
 * Exports agent markdown files directly to folder (no subdirectories)
 */
async function exportAgentFilesFlat(agentsFolder, nodes) {
  let exportedCount = 0;

  // Export all agents directly to the agents folder
  for (const node of nodes) {
    try {
      const content = await fetchAgentFile(node.data.id);
      if (content) {
        const filename = `${node.data.id}.md`;
        const fileHandle = await agentsFolder.getFileHandle(filename, {
          create: true
        });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        exportedCount++;
      }
    } catch (error) {
      console.error(`Failed to export ${node.data.id}:`, error);
    }
  }

  return exportedCount;
}

/**
 * Exports agents to personal location (~/.claude/agents/)
 */
async function exportToPersonalAgents(nodes) {
  // Personal export is not supported via File System Access API
  // Show instructions instead
  const agentList = nodes.map(n => n.data.id).join('\n');
  
  alert(`⚠️ Personal Agent Export\n\nTo export to your personal agents folder:\n\n1. Create the folder: ~/.claude/agents/\n2. Copy the following agent files:\n${agentList}\n\nNote: Browser security prevents direct access to your home directory.`);
  
  return {
    success: false,
    message: 'Please manually copy agents to ~/.claude/agents/',
    path: '~/.claude/agents'
  };
}

/**
 * Creates a README file in the project root
 */
async function createProjectReadme(projectHandle, nodes, workflowName) {
  const readmeContent = `# ${workflowName} - AI Agent Team

This project includes AI agents created with SaasIt.ai for use with Claude Code.

## Agents Directory

The \`.claude/agents/\` folder contains ${nodes.length} specialized AI agents for this project.

### Agents Included

${nodes.map(node => {
  const role = node.data.isManager ? '👑 Manager' : 
               node.data.isLead ? '⭐ Lead' : 
               '👤 Team Member';
  return `- **${node.data.name}** (${role})\n  - ID: \`${node.data.id}\`\n  - Category: ${node.data.category}\n  - ${node.data.description}`;
}).join('\n\n')}

## Usage with Claude Code

These agents are automatically available in Claude Code when working in this project directory.

To use an agent:
\`\`\`
@${nodes[0]?.data.id || 'agent-name'} [your request]
\`\`\`

## Team Structure

${extractTeamStructureText(nodes)}

## About

Generated by [SaasIt.ai](https://saasit.ai) - Visual AI Agent Team Orchestrator

These agents work together to build complete applications using the Claude Code SDK.
`;

  const readmeFile = await projectHandle.getFileHandle('agents-readme.md', {
    create: true
  });
  const writable = await readmeFile.createWritable();
  await writable.write(readmeContent);
  await writable.close();
}

/**
 * Extracts hierarchy information from nodes and edges
 */
function extractHierarchy(nodes, edges) {
  const managers = nodes.filter(n => n.data.isManager).map(n => n.data.id);
  const leads = nodes.filter(n => n.data.isLead).map(n => n.data.id);
  const team = nodes.filter(n => !n.data.isManager && !n.data.isLead).map(n => n.data.id);

  return {
    managers,
    leads,
    team,
    connections: edges.map(e => ({
      from: e.source,
      to: e.target,
      type: e.data?.type || 'collaborates'
    }))
  };
}

/**
 * Extracts team structure as readable text
 */
function extractTeamStructureText(nodes) {
  const managers = nodes.filter(n => n.data.isManager);
  const leads = nodes.filter(n => n.data.isLead);
  const team = nodes.filter(n => !n.data.isManager && !n.data.isLead);

  let structure = '';
  
  if (managers.length > 0) {
    structure += `**Management:** ${managers.map(n => n.data.name).join(', ')}\n`;
  }
  
  if (leads.length > 0) {
    structure += `**Team Leads:** ${leads.map(n => n.data.name).join(', ')}\n`;
  }
  
  if (team.length > 0) {
    structure += `**Team Members:** ${team.map(n => n.data.name).join(', ')}`;
  }

  return structure || 'Single agent workflow';
}

/**
 * Fallback for browsers without File System Access API
 */
async function exportWorkflowAsZip(workflowName, nodes, edges) {
  // Show alert for unsupported browsers
  alert('⚠️ File System Access not supported\n\nTo export agent files, please use:\n• Chrome (version 86+)\n• Edge (version 86+)\n• Opera (version 72+)\n\nOther browsers like Safari and Firefox don\'t support folder selection yet.');
  
  return {
    success: false,
    message: 'Please use Chrome or Edge browser to export agent files.',
    path: null
  };
}