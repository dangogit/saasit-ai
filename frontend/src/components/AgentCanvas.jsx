// Legacy component - replaced by WorkflowCanvas
// This file is kept for backward compatibility but is no longer used

import WorkflowCanvas from './WorkflowCanvas';

const AgentCanvas = ({ isExecuting }) => {
  return <WorkflowCanvas isExecuting={isExecuting} />;
};

export default AgentCanvas;