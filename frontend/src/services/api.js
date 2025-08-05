import axios from 'axios';
import config from '../config/environment';

const API_BASE_URL = config.API_BASE_URL;
const WS_BASE_URL = process.env.REACT_APP_WS_URL || (config.IS_PRODUCTION ? 'wss://your-backend.fly.dev/ws' : 'ws://localhost:8000/ws');

class APIClient {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for auth tokens (if needed in future)
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized access
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Chat endpoints
  async sendChatMessage(messages, stream = false) {
    try {
      const response = await this.client.post('/chat', {
        messages,
        stream,
      });
      return response.data;
    } catch (error) {
      console.error('Chat API error:', error);
      throw this.handleError(error);
    }
  }

  // Workflow generation
  async generateWorkflow(messages, projectContext = null) {
    try {
      const response = await this.client.post('/workflow/generate', {
        messages,
        project_context: projectContext,
      });
      return response.data;
    } catch (error) {
      console.error('Workflow generation error:', error);
      throw this.handleError(error);
    }
  }

  // WebSocket connection for streaming
  connectWebSocket() {
    return new WebSocketClient(`${WS_BASE_URL}/chat`);
  }

  handleError(error) {
    if (error.response) {
      // Server responded with error
      return new Error(error.response.data.detail || 'Server error occurred');
    } else if (error.request) {
      // Request made but no response
      return new Error('Unable to connect to server');
    } else {
      // Request setup error
      return new Error('Request failed');
    }
  }
}

class WebSocketClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.messageHandlers = [];
    this.errorHandlers = [];
    this.closeHandlers = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.reconnectDelay = 1000;
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.messageHandlers.forEach(handler => handler(data));
          } catch (error) {
            console.error('WebSocket message parse error:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.errorHandlers.forEach(handler => handler(error));
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed');
          this.closeHandlers.forEach(handler => handler(event));
          
          // Attempt reconnection
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
              console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
              this.connect();
            }, this.reconnectDelay * this.reconnectAttempts);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      throw new Error('WebSocket is not connected');
    }
  }

  onMessage(handler) {
    this.messageHandlers.push(handler);
  }

  onError(handler) {
    this.errorHandlers.push(handler);
  }

  onClose(handler) {
    this.closeHandlers.push(handler);
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Export singleton instance
const apiClient = new APIClient();
export default apiClient;

// Export classes for testing
export { APIClient, WebSocketClient };