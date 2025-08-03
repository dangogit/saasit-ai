# SaasIt.ai - Frontend Technical Documentation

## Overview

The SaasIt.ai frontend is a modern, responsive web application built with Next.js 14, React, and TypeScript. It provides a visual canvas for designing AI agent workflows with real-time collaboration and execution monitoring.

## Technology Stack

### Core Technologies
```yaml
Framework: Next.js 14 (App Router)
Language: TypeScript 4.9+
UI Library: React 18.2
Styling: Tailwind CSS 3.4
Component Library: Shadcn/ui
State Management: Zustand 4.4
Canvas: React Flow 11.10
Real-time: Socket.io-client 4.6
API Client: React Query (TanStack Query) 5.0
Form Management: React Hook Form 7.48
Validation: Zod 3.22
Animation: Framer Motion 10.16
Icons: Lucide React
Build Tool: Turbopack (Next.js built-in)
Testing: Jest + React Testing Library
E2E Testing: Playwright
```

## Project Structure

```
frontend/
├── app/                          # Next.js 14 App Router
│   ├── (auth)/                   # Auth group routes
│   │   ├── login/
│   │   ├── signup/
│   │   └── forgot-password/
│   ├── (dashboard)/              # Protected routes
│   │   ├── workflows/
│   │   ├── executions/
│   │   ├── agents/
│   │   ├── settings/
│   │   └── team/
│   ├── (marketing)/              # Public routes
│   │   ├── page.tsx              # Landing page
│   │   ├── pricing/
│   │   ├── about/
│   │   └── blog/
│   ├── api/                      # API routes (if needed)
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
│
├── components/
│   ├── ui/                       # Shadcn/ui components
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── canvas/                   # Canvas components
│   │   ├── WorkflowCanvas.tsx
│   │   ├── AgentNode.tsx
│   │   ├── ConnectionLine.tsx
│   │   └── CanvasControls.tsx
│   ├── chat/                     # Chat components
│   │   ├── ChatPanel.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageInput.tsx
│   │   └── TypingIndicator.tsx
│   ├── agents/                   # Agent components
│   │   ├── AgentLibrary.tsx
│   │   ├── AgentCard.tsx
│   │   ├── AgentDetails.tsx
│   │   └── CustomAgentModal.tsx
│   ├── execution/                # Execution components
│   │   ├── ExecutionStatus.tsx
│   │   ├── LogViewer.tsx
│   │   ├── ProgressBar.tsx
│   │   └── ArtifactDownload.tsx
│   ├── pricing/                  # Pricing components
│   │   ├── PricingTable.tsx
│   │   ├── TierCard.tsx
│   │   └── FeatureComparison.tsx
│   └── shared/                   # Shared components
│       ├── Header.tsx
│       ├── Footer.tsx
│       ├── Navigation.tsx
│       └── LoadingSpinner.tsx
│
├── lib/
│   ├── api/                      # API client functions
│   │   ├── client.ts
│   │   ├── workflows.ts
│   │   ├── agents.ts
│   │   ├── executions.ts
│   │   └── auth.ts
│   ├── hooks/                    # Custom React hooks
│   │   ├── useWorkflow.ts
│   │   ├── useCanvas.ts
│   │   ├── useWebSocket.ts
│   │   ├── useAuth.ts
│   │   └── useLocalStorage.ts
│   ├── stores/                   # Zustand stores
│   │   ├── workflowStore.ts
│   │   ├── agentStore.ts
│   │   ├── executionStore.ts
│   │   └── uiStore.ts
│   ├── utils/                    # Utility functions
│   │   ├── canvas.ts
│   │   ├── validation.ts
│   │   ├── formatting.ts
│   │   └── constants.ts
│   └── types/                    # TypeScript types
│       ├── workflow.ts
│       ├── agent.ts
│       ├── execution.ts
│       └── api.ts
│
├── public/                       # Static assets
│   ├── images/
│   ├── fonts/
│   └── icons/
│
├── styles/                       # Additional styles
│   ├── canvas.css
│   └── animations.css
│
├── tests/                        # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.local                    # Environment variables
├── next.config.js                # Next.js configuration
├── tailwind.config.ts            # Tailwind configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies
```

## Core Components Implementation

### 1. Workflow Canvas Component

```typescript
// components/canvas/WorkflowCanvas.tsx
import React, { useCallback, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  ReactFlowProvider,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useWorkflowStore } from '@/lib/stores/workflowStore';
import AgentNode from './AgentNode';
import { useWebSocket } from '@/lib/hooks/useWebSocket';

const nodeTypes = {
  agent: AgentNode,
};

export default function WorkflowCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  
  const { workflow, updateWorkflow } = useWorkflowStore();
  const { sendMessage } = useWebSocket();
  
  const [nodes, setNodes, onNodesChange] = useNodesState(workflow.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(workflow.edges);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
      sendMessage('workflow:update', { 
        workflowId: workflow.id, 
        changes: { edges: [...edges, params] }
      });
    },
    [edges, workflow.id, sendMessage]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type || !reactFlowBounds || !reactFlowInstance) {
        return;
      }

      const agent = JSON.parse(event.dataTransfer.getData('agent'));
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: `${agent.id}-${Date.now()}`,
        type: 'agent',
        position,
        data: agent,
      };

      setNodes((nds) => nds.concat(newNode));
      sendMessage('workflow:update', { 
        workflowId: workflow.id, 
        changes: { nodes: [...nodes, newNode] }
      });
    },
    [reactFlowInstance, nodes, workflow.id, sendMessage]
  );

  return (
    <div className="h-full w-full" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background variant="dots" gap={20} size={1} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
```

### 2. Agent Node Component

```typescript
// components/canvas/AgentNode.tsx
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useExecutionStore } from '@/lib/stores/executionStore';

interface AgentNodeData {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  status?: 'idle' | 'working' | 'completed' | 'failed';
}

const AgentNode = memo(({ data, selected }: NodeProps<AgentNodeData>) => {
  const { currentExecution } = useExecutionStore();
  const agentStatus = currentExecution?.agentStatuses?.[data.id] || 'idle';

  const statusColors = {
    idle: 'bg-gray-100',
    working: 'bg-orange-100 animate-pulse',
    completed: 'bg-green-100',
    failed: 'bg-red-100',
  };

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <Card 
        className={`
          p-4 min-w-[200px] cursor-move transition-all
          ${selected ? 'ring-2 ring-orange-500' : ''}
          ${statusColors[agentStatus]}
        `}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">{data.icon}</span>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">{data.name}</h3>
            <p className="text-xs text-gray-600 mt-1">{data.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {data.category}
              </Badge>
              {agentStatus !== 'idle' && (
                <Badge 
                  variant={agentStatus === 'completed' ? 'success' : 
                          agentStatus === 'failed' ? 'destructive' : 'default'}
                  className="text-xs"
                >
                  {agentStatus}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
});

AgentNode.displayName = 'AgentNode';
export default AgentNode;
```

### 3. Chat Panel Component

```typescript
// components/chat/ChatPanel.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Minimize2, Maximize2 } from 'lucide-react';
import { useChat } from '@/lib/hooks/useChat';
import MessageList from './MessageList';
import TypingIndicator from './TypingIndicator';

interface ChatPanelProps {
  workflowId: string;
  onAgentSuggestion?: (agents: Agent[]) => void;
}

export default function ChatPanel({ workflowId, onAgentSuggestion }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { messages, sendMessage, isTyping } = useChat(workflowId);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Card className={`
      flex flex-col transition-all duration-300
      ${isMinimized ? 'w-16' : 'w-96'}
      h-full border-r
    `}>
      <div className="flex items-center justify-between p-4 border-b">
        {!isMinimized && (
          <h2 className="font-semibold">AI Assistant</h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMinimized(!isMinimized)}
        >
          {isMinimized ? <Maximize2 /> : <Minimize2 />}
        </Button>
      </div>

      {!isMinimized && (
        <>
          <ScrollArea className="flex-1 p-4">
            <MessageList messages={messages} />
            {isTyping && <TypingIndicator />}
            <div ref={scrollRef} />
          </ScrollArea>

          <div className="p-4 border-t">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Describe what you want to build..."
                  className="flex-1"
                />
                <Button type="submit" size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        </>
      )}
    </Card>
  );
}
```

### 4. WebSocket Hook

```typescript
// lib/hooks/useWebSocket.ts
import { useEffect, useRef, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { useAuthStore } from '@/lib/stores/authStore';

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { token } = useAuthStore();

  useEffect(() => {
    if (!token) return;

    socketRef.current = io(process.env.NEXT_PUBLIC_WS_URL!, {
      auth: { token },
      transports: ['websocket'],
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  const sendMessage = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  const subscribe = useCallback((event: string, handler: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
      return () => {
        socketRef.current?.off(event, handler);
      };
    }
  }, []);

  return { sendMessage, subscribe, socket: socketRef.current };
}
```

### 5. Zustand Store Example

```typescript
// lib/stores/workflowStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface WorkflowState {
  workflows: Workflow[];
  currentWorkflow: Workflow | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setWorkflows: (workflows: Workflow[]) => void;
  setCurrentWorkflow: (workflow: Workflow) => void;
  updateWorkflow: (id: string, updates: Partial<Workflow>) => void;
  addNode: (node: Node) => void;
  removeNode: (nodeId: string) => void;
  addEdge: (edge: Edge) => void;
  removeEdge: (edgeId: string) => void;
  clearError: () => void;
}

export const useWorkflowStore = create<WorkflowState>()(
  devtools(
    persist(
      immer((set) => ({
        workflows: [],
        currentWorkflow: null,
        isLoading: false,
        error: null,

        setWorkflows: (workflows) =>
          set((state) => {
            state.workflows = workflows;
          }),

        setCurrentWorkflow: (workflow) =>
          set((state) => {
            state.currentWorkflow = workflow;
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
            if (state.currentWorkflow) {
              state.currentWorkflow.nodes.push(node);
            }
          }),

        removeNode: (nodeId) =>
          set((state) => {
            if (state.currentWorkflow) {
              state.currentWorkflow.nodes = state.currentWorkflow.nodes.filter(
                (n) => n.id !== nodeId
              );
            }
          }),

        addEdge: (edge) =>
          set((state) => {
            if (state.currentWorkflow) {
              state.currentWorkflow.edges.push(edge);
            }
          }),

        removeEdge: (edgeId) =>
          set((state) => {
            if (state.currentWorkflow) {
              state.currentWorkflow.edges = state.currentWorkflow.edges.filter(
                (e) => e.id !== edgeId
              );
            }
          }),

        clearError: () =>
          set((state) => {
            state.error = null;
          }),
      })),
      {
        name: 'workflow-storage',
        partialize: (state) => ({ currentWorkflow: state.currentWorkflow }),
      }
    )
  )
);
```

## API Integration

### API Client Setup

```typescript
// lib/api/client.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/lib/stores/authStore';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for auth
    this.client.interceptors.request.use(
      (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        if (error.response?.status === 401) {
          useAuthStore.getState().logout();
        }
        return Promise.reject(error);
      }
    );
  }

  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client.get(url, config);
  }

  post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.post(url, data, config);
  }

  put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.put(url, data, config);
  }

  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client.delete(url, config);
  }
}

export const apiClient = new ApiClient();
```

### React Query Setup

```typescript
// lib/api/workflows.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

// Fetch workflows
export function useWorkflows() {
  return useQuery({
    queryKey: ['workflows'],
    queryFn: () => apiClient.get<Workflow[]>('/workflows'),
  });
}

// Fetch single workflow
export function useWorkflow(id: string) {
  return useQuery({
    queryKey: ['workflow', id],
    queryFn: () => apiClient.get<Workflow>(`/workflows/${id}`),
    enabled: !!id,
  });
}

// Create workflow
export function useCreateWorkflow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateWorkflowDto) => 
      apiClient.post<Workflow>('/workflows', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

// Update workflow
export function useUpdateWorkflow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkflowDto }) =>
      apiClient.put<Workflow>(`/workflows/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['workflow', id] });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

// Execute workflow
export function useExecuteWorkflow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (workflowId: string) =>
      apiClient.post<Execution>('/executions', { workflowId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executions'] });
    },
  });
}
```

## Design System

### Theme Configuration

```typescript
// lib/theme.ts
export const theme = {
  colors: {
    background: '#FAF9F7',
    surface: '#FFFFFF',
    border: '#E5E3DF',
    text: {
      primary: '#2D2B26',
      secondary: '#6B6966',
    },
    accent: {
      primary: '#D97706',
      light: '#FED7AA',
      dark: '#92400E',
    },
    success: '#059669',
    error: '#DC2626',
    warning: '#F59E0B',
    info: '#3B82F6',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  },
};
```

### Tailwind Configuration

```javascript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#FAF9F7',
        surface: '#FFFFFF',
        border: '#E5E3DF',
        text: {
          primary: '#2D2B26',
          secondary: '#6B6966',
        },
        accent: {
          DEFAULT: '#D97706',
          light: '#FED7AA',
          dark: '#92400E',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
```

## Performance Optimization

### 1. Code Splitting

```typescript
// app/(dashboard)/workflows/[id]/page.tsx
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

// Lazy load heavy components
const WorkflowCanvas = dynamic(
  () => import('@/components/canvas/WorkflowCanvas'),
  { 
    loading: () => <LoadingSpinner />,
    ssr: false // Canvas doesn't need SSR
  }
);

export default function WorkflowPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <WorkflowCanvas workflowId={params.id} />
    </Suspense>
  );
}
```

### 2. Image Optimization

```typescript
// components/agents/AgentCard.tsx
import Image from 'next/image';

export function AgentCard({ agent }: { agent: Agent }) {
  return (
    <div className="agent-card">
      <Image
        src={agent.avatar}
        alt={agent.name}
        width={48}
        height={48}
        loading="lazy"
        placeholder="blur"
        blurDataURL={agent.avatarBlur}
      />
      {/* Rest of component */}
    </div>
  );
}
```

### 3. React Query Optimistic Updates

```typescript
// lib/hooks/useOptimisticWorkflow.ts
export function useOptimisticWorkflowUpdate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateWorkflow,
    onMutate: async (updatedWorkflow) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(['workflow', updatedWorkflow.id]);
      
      // Snapshot previous value
      const previousWorkflow = queryClient.getQueryData(['workflow', updatedWorkflow.id]);
      
      // Optimistically update
      queryClient.setQueryData(['workflow', updatedWorkflow.id], updatedWorkflow);
      
      return { previousWorkflow };
    },
    onError: (err, updatedWorkflow, context) => {
      // Rollback on error
      queryClient.setQueryData(
        ['workflow', updatedWorkflow.id],
        context?.previousWorkflow
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries(['workflows']);
    },
  });
}
```

## Testing Strategy

### Unit Testing

```typescript
// tests/unit/components/AgentNode.test.tsx
import { render, screen } from '@testing-library/react';
import AgentNode from '@/components/canvas/AgentNode';

describe('AgentNode', () => {
  const mockAgent = {
    id: '1',
    name: 'Test Agent',
    icon: '🤖',
    category: 'engineering',
    description: 'Test description',
  };

  it('renders agent information correctly', () => {
    render(<AgentNode data={mockAgent} />);
    
    expect(screen.getByText('Test Agent')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByText('engineering')).toBeInTheDocument();
  });

  it('shows correct status styling', () => {
    render(<AgentNode data={{ ...mockAgent, status: 'working' }} />);
    
    const card = screen.getByRole('article');
    expect(card).toHaveClass('animate-pulse');
  });
});
```

### E2E Testing

```typescript
// tests/e2e/workflow-creation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Workflow Creation', () => {
  test('should create a new workflow', async ({ page }) => {
    await page.goto('/workflows');
    
    // Click new workflow button
    await page.click('button:has-text("New Workflow")');
    
    // Fill in workflow details
    await page.fill('input[name="name"]', 'Test Workflow');
    await page.fill('textarea[name="description"]', 'Test description');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Verify redirect to canvas
    await expect(page).toHaveURL(/\/workflows\/[\w-]+/);
    
    // Verify canvas is loaded
    await expect(page.locator('.react-flow')).toBeVisible();
  });
});
```

## Deployment Configuration

### Next.js Configuration

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['storage.saasit.ai', 'avatars.githubusercontent.com'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  },
  experimental: {
    serverActions: true,
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
NEXT_PUBLIC_POSTHOG_KEY=xxx
NEXT_PUBLIC_SENTRY_DSN=xxx
```

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

## Security Best Practices

### 1. Input Validation

```typescript
// lib/validation/workflow.ts
import { z } from 'zod';

export const createWorkflowSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  agents: z.array(z.string()).max(50),
  isTemplate: z.boolean().optional(),
});

export const validateWorkflowInput = (data: unknown) => {
  return createWorkflowSchema.parse(data);
};
```

### 2. XSS Prevention

```typescript
// lib/utils/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href'],
  });
}
```

### 3. Rate Limiting

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

## Monitoring & Analytics

### Error Tracking with Sentry

```typescript
// lib/monitoring/sentry.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  beforeSend(event) {
    // Filter out sensitive data
    if (event.request?.cookies) {
      delete event.request.cookies;
    }
    return event;
  },
});
```

### Analytics with PostHog

```typescript
// lib/analytics/posthog.ts
import posthog from 'posthog-js';

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: 'https://app.posthog.com',
    capture_pageview: false, // We'll manually track
  });
}

export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (typeof window !== 'undefined') {
    posthog.capture(eventName, properties);
  }
};
```

## Build & Deploy Commands

```json
// package.json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:e2e": "playwright test",
    "type-check": "tsc --noEmit",
    "format": "prettier --write .",
    "analyze": "ANALYZE=true next build",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

This completes the comprehensive frontend technical documentation for SaasIt.ai.