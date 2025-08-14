import config from '../config/environment';
import useWorkflowStore from '../lib/stores/workflowStore';

const WS_BASE_URL = process.env.REACT_APP_WS_URL || 
  (process.env.NODE_ENV === 'production' ? 'wss://saasit-ai-backend-dgoldman.fly.dev/ws' : 'ws://localhost:8000/ws');

class ExecutionWebSocketService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.heartbeatInterval = null;
    this.messageQueue = [];
    this.currentExecutionId = null;
  }

  connect(token, executionId) {
    return new Promise((resolve, reject) => {
      try {
        this.currentExecutionId = executionId;
        const wsUrl = `${WS_BASE_URL}/execution/${executionId}?token=${encodeURIComponent(token)}`;
        
        console.log(`Connecting to execution WebSocket: ${wsUrl}`);
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('Execution WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Update store
          const { updateWebSocketState } = useWorkflowStore.getState();
          updateWebSocketState({
            isConnected: true,
            lastHeartbeat: new Date().toISOString(),
            reconnectAttempts: 0
          });

          // Start heartbeat
          this.startHeartbeat();
          
          // Send queued messages
          this.flushMessageQueue();
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('Execution WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log('Execution WebSocket closed:', event.code, event.reason);
          this.isConnected = false;
          
          // Update store
          const { updateWebSocketState } = useWorkflowStore.getState();
          updateWebSocketState({
            isConnected: false
          });

          // Stop heartbeat
          this.stopHeartbeat();
          
          // Attempt reconnection if not intentionally closed
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect(token, executionId);
          }
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  handleMessage(data) {
    console.log('Received WebSocket message:', data);
    
    const store = useWorkflowStore.getState();
    const { 
      updateExecutionStatus, 
      addExecutionStep, 
      updateExecutionStep, 
      addTerminalOutput,
      updateWebSocketState
    } = store;
    
    switch (data.type) {
      case 'connected':
        console.log('WebSocket connection confirmed:', data);
        break;

      case 'execution_started':
        updateExecutionStatus('running');
        addTerminalOutput({
          type: 'system',
          content: `🚀 Execution started at ${new Date(data.timestamp).toLocaleTimeString()}`
        });
        break;

      case 'step_started':
        if (data.data && data.data.step) {
          addExecutionStep({
            ...data.data.step,
            status: 'running',
            startTime: data.timestamp
          });
          updateExecutionStatus('running', data.data.step.id);
          
          addTerminalOutput({
            type: 'system',
            content: `▶️ Starting: ${data.data.step.name}`,
            stepId: data.data.step.id,
            agent: data.data.step.agent_type
          });
        }
        break;

      case 'step_completed':
        if (data.data && data.data.step_id) {
          updateExecutionStep(data.data.step_id, {
            status: 'completed',
            endTime: data.timestamp,
            duration: data.data.duration,
            progress: 100
          });
          
          addTerminalOutput({
            type: 'system',
            content: `✅ Completed in ${data.data.duration}`,
            stepId: data.data.step_id
          });
        }
        break;

      case 'step_failed':
        if (data.data && data.data.step_id) {
          updateExecutionStep(data.data.step_id, {
            status: 'failed',
            endTime: data.timestamp,
            duration: data.data.duration,
            errorMessage: data.data.error
          });
          
          addTerminalOutput({
            type: 'stderr',
            content: `❌ Failed: ${data.data.error}`,
            stepId: data.data.step_id
          });
        }
        break;

      case 'step_updated':
        if (data.data && data.data.step_id) {
          updateExecutionStep(data.data.step_id, data.data.update);
        }
        break;

      case 'terminal_output':
        if (data.data && data.data.output) {
          addTerminalOutput({
            type: data.data.output.type || 'stdout',
            content: data.data.output.content,
            stepId: data.data.output.step_id,
            agent: data.data.output.agent
          });
        }
        break;

      case 'execution_completed':
        updateExecutionStatus('completed');
        addTerminalOutput({
          type: 'system',
          content: `🎉 Execution completed successfully at ${new Date(data.timestamp).toLocaleTimeString()}`
        });
        break;

      case 'execution_failed':
        updateExecutionStatus('failed');
        addTerminalOutput({
          type: 'stderr',
          content: `💥 Execution failed: ${data.data?.error || 'Unknown error'}`
        });
        break;

      case 'execution_paused':
        updateExecutionStatus('paused');
        addTerminalOutput({
          type: 'system',
          content: `⏸️ Execution paused at ${new Date(data.timestamp).toLocaleTimeString()}`
        });
        break;

      case 'execution_resumed':
        updateExecutionStatus('running');
        addTerminalOutput({
          type: 'system',
          content: `▶️ Execution resumed at ${new Date(data.timestamp).toLocaleTimeString()}`
        });
        break;

      case 'execution_cancelled':
        updateExecutionStatus('cancelled');
        addTerminalOutput({
          type: 'system',
          content: `🛑 Execution cancelled at ${new Date(data.timestamp).toLocaleTimeString()}`
        });
        break;

      case 'pong':
        updateWebSocketState({
          lastHeartbeat: new Date().toISOString()
        });
        break;

      case 'error':
        console.error('WebSocket error:', data.error);
        addTerminalOutput({
          type: 'stderr',
          content: `❌ Error: ${data.error}`
        });
        break;

      default:
        console.warn('Unknown WebSocket message type:', data.type);
    }
  }

  send(message) {
    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      console.log('Sending WebSocket message:', message);
      this.ws.send(JSON.stringify(message));
    } else {
      console.log('WebSocket not ready, queuing message:', message);
      this.messageQueue.push(message);
    }
  }

  flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000); // 30 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  attemptReconnect(token, executionId) {
    this.reconnectAttempts++;
    
    const { updateWebSocketState } = useWorkflowStore.getState();
    updateWebSocketState({
      reconnectAttempts: this.reconnectAttempts
    });

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    setTimeout(() => {
      console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} (delay: ${delay}ms)`);
      this.connect(token, executionId).catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
    }
    this.isConnected = false;
    this.currentExecutionId = null;
  }

  // Control messages
  startExecution(workflowData) {
    this.send({ 
      type: 'start_execution',
      data: workflowData
    });
  }

  pauseExecution() {
    this.send({ type: 'pause_execution' });
  }

  resumeExecution() {
    this.send({ type: 'resume_execution' });
  }

  cancelExecution() {
    this.send({ type: 'cancel_execution' });
  }

  getExecutionStatus() {
    this.send({ type: 'get_status' });
  }
}

export default new ExecutionWebSocketService();