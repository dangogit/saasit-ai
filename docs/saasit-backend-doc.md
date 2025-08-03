# SaasIt.ai - Backend Technical Documentation

## Overview

The SaasIt.ai backend is a scalable Node.js/Express API that handles workflow management, agent orchestration, real-time communication, and cloud execution coordination. Built with TypeScript for type safety and designed for horizontal scaling.

## Technology Stack

### Core Technologies
```yaml
Runtime: Node.js 20 LTS
Language: TypeScript 5.3
Framework: Express 4.18
API Protocol: REST + WebSocket
Database ORM: Prisma 5.7
Primary Database: PostgreSQL 15
Cache/Queue: Redis 7.2
Message Queue: Bull 4.11
WebSocket: Socket.io 4.6
Authentication: JWT + Passport.js
Validation: Zod 3.22
API Documentation: OpenAPI 3.0 (Swagger)
Testing: Jest + Supertest
Process Manager: PM2
Container: Docker
Orchestration: Kubernetes
```

## Project Structure

```
backend/
├── src/
│   ├── api/                     # API routes
│   │   ├── v1/
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.routes.ts
│   │   │   │   └── auth.dto.ts
│   │   │   ├── workflows/
│   │   │   │   ├── workflow.controller.ts
│   │   │   │   ├── workflow.service.ts
│   │   │   │   ├── workflow.routes.ts
│   │   │   │   └── workflow.dto.ts
│   │   │   ├── agents/
│   │   │   ├── executions/
│   │   │   ├── teams/
│   │   │   ├── billing/
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── config/                  # Configuration
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   ├── stripe.ts
│   │   ├── aws.ts
│   │   └── index.ts
│   │
│   ├── core/                    # Core business logic
│   │   ├── agents/
│   │   │   ├── AgentRegistry.ts
│   │   │   ├── AgentOrchestrator.ts
│   │   │   └── AgentDefinitions.ts
│   │   ├── execution/
│   │   │   ├── ExecutionEngine.ts
│   │   │   ├── ContainerManager.ts
│   │   │   └── WorkflowRunner.ts
│   │   ├── queue/
│   │   │   ├── QueueManager.ts
│   │   │   ├── JobProcessor.ts
│   │   │   └── PriorityQueue.ts
│   │   └── billing/
│   │       ├── SubscriptionManager.ts
│   │       └── UsageTracker.ts
│   │
│   ├── database/                # Database layer
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── repositories/
│   │   │   ├── WorkflowRepository.ts
│   │   │   ├── UserRepository.ts
│   │   │   └── ExecutionRepository.ts
│   │   └── index.ts
│   │
│   ├── middleware/              # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── rateLimit.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── logging.middleware.ts
│   │   └── cors.middleware.ts
│   │
│   ├── services/                # External services
│   │   ├── claude/
│   │   │   ├── ClaudeService.ts
│   │   │   └── ClaudeExecutor.ts
│   │   ├── github/
│   │   │   └── GitHubService.ts
│   │   ├── storage/
│   │   │   └── S3Service.ts
│   │   ├── email/
│   │   │   └── EmailService.ts
│   │   └── analytics/
│   │       └── AnalyticsService.ts
│   │
│   ├── websocket/               # WebSocket handling
│   │   ├── SocketServer.ts
│   │   ├── handlers/
│   │   │   ├── workflow.handler.ts
│   │   │   ├── execution.handler.ts
│   │   │   └── chat.handler.ts
│   │   └── middleware/
│   │       └── socketAuth.ts
│   │
│   ├── utils/                   # Utilities
│   │   ├── logger.ts
│   │   ├── crypto.ts
│   │   ├── validators.ts
│   │   └── helpers.ts
│   │
│   ├── types/                   # TypeScript types
│   │   ├── express.d.ts
│   │   ├── socket.d.ts
│   │   └── global.d.ts
│   │
│   ├── jobs/                    # Background jobs
│   │   ├── cleanupJob.ts
│   │   ├── analyticsJob.ts
│   │   └── billingJob.ts
│   │
│   ├── app.ts                   # Express app setup
│   └── server.ts                # Server entry point
│
├── tests/                        # Test files
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
├── docker/                       # Docker files
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── k8s/                         # Kubernetes manifests
│   ├── deployment.yaml
│   ├── service.yaml
│   └── configmap.yaml
│
├── scripts/                     # Utility scripts
│   ├── migrate.ts
│   ├── seed.ts
│   └── generateTypes.ts
│
├── .env.example
├── .gitignore
├── tsconfig.json
├── package.json
└── README.md
```

## Core Implementation

### 1. Express App Setup

```typescript
// src/app.ts
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { errorHandler } from './middleware/error.middleware';
import { authMiddleware } from './middleware/auth.middleware';
import { rateLimiter } from './middleware/rateLimit.middleware';
import apiRoutes from './api/v1';
import { initializeSocketServer } from './websocket/SocketServer';
import { logger } from './utils/logger';

export class App {
  public app: Application;
  public server: any;
  public io: SocketIOServer;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL,
        credentials: true,
      },
    });

    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeWebSocket();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.FRONTEND_URL,
      credentials: true,
    }));
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(morgan('combined', { stream: { write: (message) => logger.info(message) } }));
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // API routes
    this.app.use('/api/v1', rateLimiter, apiRoutes);

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });
  }

  private initializeWebSocket(): void {
    initializeSocketServer(this.io);
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public listen(port: number): void {
    this.server.listen(port, () => {
      logger.info(`Server running on port ${port}`);
    });
  }
}
```

### 2. Database Schema (Prisma)

```prisma
// src/database/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserTier {
  FREE
  DESIGNER
  STARTER
  PROFESSIONAL
  SCALE
  ENTERPRISE
}

enum ExecutionStatus {
  QUEUED
  INITIALIZING
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}

model User {
  id                String      @id @default(cuid())
  email             String      @unique
  passwordHash      String
  name              String?
  avatarUrl         String?
  tier              UserTier    @default(FREE)
  stripeCustomerId  String?     @unique
  emailVerified     Boolean     @default(false)
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  workflows         Workflow[]
  executions        Execution[]
  customAgents      Agent[]
  teamMemberships   TeamMember[]
  usageMetrics      UsageMetric[]
  
  @@index([email])
  @@index([tier])
}

model Workflow {
  id                String      @id @default(cuid())
  userId            String
  name              String
  description       String?
  canvasState       Json        // React Flow state
  chatHistory       Json[]      // Chat messages
  messageCount      Int         @default(0)
  agentCount        Int         @default(0)
  version           Int         @default(1)
  parentWorkflowId  String?
  isTemplate        Boolean     @default(false)
  templateCategory  String?
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  user              User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  parentWorkflow    Workflow?   @relation("WorkflowVersions", fields: [parentWorkflowId], references: [id])
  childWorkflows    Workflow[]  @relation("WorkflowVersions")
  executions        Execution[]

  @@index([userId])
  @@index([isTemplate, templateCategory])
}

model Agent {
  id                String      @id @default(cuid())
  name              String      @unique
  displayName       String
  category          String
  description       String
  avatar            String
  skills            String[]
  tools             String[]
  systemPrompt      String      @db.Text
  isCustom          Boolean     @default(false)
  createdById       String?
  isPublic          Boolean     @default(true)
  usageCount        Int         @default(0)
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  createdBy         User?       @relation(fields: [createdById], references: [id])
  executionLogs     ExecutionLog[]

  @@index([category])
  @@index([createdById, isCustom])
}

model Execution {
  id                String          @id @default(cuid())
  workflowId        String
  userId            String
  status            ExecutionStatus @default(QUEUED)
  containerId       String?
  startedAt         DateTime?
  completedAt       DateTime?
  runtimeSeconds    Int?
  logsUrl           String?
  artifactsUrl      String?
  gitRepoUrl        String?
  errorMessage      String?
  metadata          Json?
  createdAt         DateTime        @default(now())

  workflow          Workflow        @relation(fields: [workflowId], references: [id])
  user              User            @relation(fields: [userId], references: [id])
  logs              ExecutionLog[]

  @@index([userId, status])
  @@index([status])
}

model ExecutionLog {
  id                BigInt      @id @default(autoincrement())
  executionId       String
  agentId           String?
  timestamp         DateTime    @default(now())
  level             String      // info, warning, error, debug
  message           String
  metadata          Json?

  execution         Execution   @relation(fields: [executionId], references: [id], onDelete: Cascade)
  agent             Agent?      @relation(fields: [agentId], references: [id])

  @@index([executionId, timestamp])
}

model Team {
  id                String      @id @default(cuid())
  name              String
  ownerId           String
  tier              UserTier
  seatsUsed         Int         @default(1)
  seatsLimit        Int
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  members           TeamMember[]
}

model TeamMember {
  teamId            String
  userId            String
  role              String      // owner, admin, member
  joinedAt          DateTime    @default(now())

  team              Team        @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user              User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([teamId, userId])
}

model UsageMetric {
  id                BigInt      @id @default(autoincrement())
  userId            String
  metricType        String      // workflows_created, executions_run, etc
  count             Int         @default(1)
  periodStart       DateTime
  periodEnd         DateTime
  metadata          Json?
  createdAt         DateTime    @default(now())

  user              User        @relation(fields: [userId], references: [id])

  @@index([userId, metricType, periodStart])
}
```

### 3. Authentication Service

```typescript
// src/api/v1/auth/auth.service.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';

export class AuthService {
  private prisma: PrismaClient;
  private redis: Redis;

  constructor() {
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL!);
  }

  async register(email: string, password: string, name?: string) {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError('User already exists', 400);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
      },
    });

    // Generate tokens
    const { accessToken, refreshToken } = this.generateTokens(user.id);

    // Store refresh token in Redis
    await this.redis.set(
      `refresh_token:${user.id}`,
      refreshToken,
      'EX',
      7 * 24 * 60 * 60 // 7 days
    );

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  async login(email: string, password: string) {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new AppError('Invalid credentials', 401);
    }

    // Generate tokens
    const { accessToken, refreshToken } = this.generateTokens(user.id);

    // Store refresh token
    await this.redis.set(
      `refresh_token:${user.id}`,
      refreshToken,
      'EX',
      7 * 24 * 60 * 60
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET!
      ) as { userId: string };

      // Check if token exists in Redis
      const storedToken = await this.redis.get(`refresh_token:${payload.userId}`);
      if (storedToken !== refreshToken) {
        throw new AppError('Invalid refresh token', 401);
      }

      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } = this.generateTokens(
        payload.userId
      );

      // Update refresh token in Redis
      await this.redis.set(
        `refresh_token:${payload.userId}`,
        newRefreshToken,
        'EX',
        7 * 24 * 60 * 60
      );

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new AppError('Invalid refresh token', 401);
    }
  }

  async logout(userId: string) {
    await this.redis.del(`refresh_token:${userId}`);
  }

  private generateTokens(userId: string) {
    const accessToken = jwt.sign(
      { userId },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
  }
}
```

### 4. Workflow Service

```typescript
// src/api/v1/workflows/workflow.service.ts
import { PrismaClient, Workflow } from '@prisma/client';
import { Redis } from 'ioredis';
import { AppError } from '@/utils/errors';
import { CreateWorkflowDto, UpdateWorkflowDto } from './workflow.dto';
import { UsageTracker } from '@/core/billing/UsageTracker';

export class WorkflowService {
  private prisma: PrismaClient;
  private redis: Redis;
  private usageTracker: UsageTracker;

  constructor() {
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL!);
    this.usageTracker = new UsageTracker();
  }

  async createWorkflow(userId: string, data: CreateWorkflowDto): Promise<Workflow> {
    // Check tier limits
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check monthly limits for free tier
    if (user.tier === 'FREE') {
      const monthlyCount = await this.usageTracker.getMonthlyWorkflowCount(userId);
      if (monthlyCount >= 3) {
        throw new AppError('Monthly workflow limit reached. Please upgrade.', 403);
      }
    }

    // Validate agent and message limits
    const limits = this.getTierLimits(user.tier);
    if (data.agents && data.agents.length > limits.maxAgents) {
      throw new AppError(`Agent limit exceeded. Your tier allows ${limits.maxAgents} agents.`, 400);
    }

    // Create workflow
    const workflow = await this.prisma.workflow.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        canvasState: data.canvasState || { nodes: [], edges: [] },
        agentCount: data.agents?.length || 0,
      },
    });

    // Track usage
    await this.usageTracker.trackWorkflowCreation(userId);

    // Cache workflow
    await this.redis.set(
      `workflow:${workflow.id}`,
      JSON.stringify(workflow),
      'EX',
      3600 // 1 hour cache
    );

    return workflow;
  }

  async getWorkflow(workflowId: string, userId: string): Promise<Workflow> {
    // Check cache first
    const cached = await this.redis.get(`workflow:${workflowId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get from database
    const workflow = await this.prisma.workflow.findFirst({
      where: {
        id: workflowId,
        OR: [
          { userId },
          { isTemplate: true },
        ],
      },
    });

    if (!workflow) {
      throw new AppError('Workflow not found', 404);
    }

    // Cache it
    await this.redis.set(
      `workflow:${workflowId}`,
      JSON.stringify(workflow),
      'EX',
      3600
    );

    return workflow;
  }

  async updateWorkflow(
    workflowId: string,
    userId: string,
    data: UpdateWorkflowDto
  ): Promise<Workflow> {
    // Verify ownership
    const workflow = await this.prisma.workflow.findFirst({
      where: {
        id: workflowId,
        userId,
      },
    });

    if (!workflow) {
      throw new AppError('Workflow not found', 404);
    }

    // Update workflow
    const updated = await this.prisma.workflow.update({
      where: { id: workflowId },
      data: {
        ...data,
        agentCount: data.canvasState?.nodes?.length || workflow.agentCount,
        messageCount: data.chatHistory?.length || workflow.messageCount,
        version: { increment: 1 },
      },
    });

    // Invalidate cache
    await this.redis.del(`workflow:${workflowId}`);

    return updated;
  }

  async deleteWorkflow(workflowId: string, userId: string): Promise<void> {
    // Verify ownership
    const workflow = await this.prisma.workflow.findFirst({
      where: {
        id: workflowId,
        userId,
      },
    });

    if (!workflow) {
      throw new AppError('Workflow not found', 404);
    }

    // Delete workflow
    await this.prisma.workflow.delete({
      where: { id: workflowId },
    });

    // Invalidate cache
    await this.redis.del(`workflow:${workflowId}`);
  }

  async listWorkflows(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [workflows, total] = await Promise.all([
      this.prisma.workflow.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          agentCount: true,
          updatedAt: true,
        },
      }),
      this.prisma.workflow.count({
        where: { userId },
      }),
    ]);

    return {
      workflows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  private getTierLimits(tier: string) {
    const limits: Record<string, any> = {
      FREE: { maxAgents: 10, maxMessages: 10 },
      DESIGNER: { maxAgents: Infinity, maxMessages: Infinity },
      STARTER: { maxAgents: Infinity, maxMessages: Infinity },
      PROFESSIONAL: { maxAgents: Infinity, maxMessages: Infinity },
      SCALE: { maxAgents: Infinity, maxMessages: Infinity },
    };

    return limits[tier] || limits.FREE;
  }
}
```

### 5. Execution Engine

```typescript
// src/core/execution/ExecutionEngine.ts
import { PrismaClient, Execution } from '@prisma/client';
import { Queue, Job } from 'bull';
import { v4 as uuidv4 } from 'uuid';
import k8s from '@kubernetes/client-node';
import { Redis } from 'ioredis';
import { logger } from '@/utils/logger';
import { S3Service } from '@/services/storage/S3Service';
import { GitHubService } from '@/services/github/GitHubService';
import { WebSocketManager } from '@/websocket/WebSocketManager';

export class ExecutionEngine {
  private prisma: PrismaClient;
  private queue: Queue;
  private redis: Redis;
  private k8sApi: k8s.BatchV1Api;
  private s3Service: S3Service;
  private githubService: GitHubService;
  private wsManager: WebSocketManager;

  constructor() {
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL!);
    this.s3Service = new S3Service();
    this.githubService = new GitHubService();
    this.wsManager = WebSocketManager.getInstance();

    // Initialize Kubernetes client
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    this.k8sApi = kc.makeApiClient(k8s.BatchV1Api);

    // Initialize queue
    this.queue = new Queue('execution-queue', process.env.REDIS_URL!, {
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.setupQueueProcessors();
  }

  async executeWorkflow(workflowId: string, userId: string): Promise<Execution> {
    // Get user and workflow
    const [user, workflow] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.workflow.findUnique({ where: { id: workflowId } }),
    ]);

    if (!user || !workflow) {
      throw new Error('User or workflow not found');
    }

    // Check concurrent execution limits
    const canExecute = await this.checkConcurrentLimit(userId, user.tier);
    if (!canExecute) {
      throw new Error('Concurrent execution limit reached');
    }

    // Create execution record
    const execution = await this.prisma.execution.create({
      data: {
        id: uuidv4(),
        workflowId,
        userId,
        status: 'QUEUED',
      },
    });

    // Add to queue with priority based on tier
    const priority = this.getTierPriority(user.tier);
    await this.queue.add('execute', {
      executionId: execution.id,
      workflowId,
      userId,
      tier: user.tier,
    }, {
      priority,
    });

    // Notify via WebSocket
    this.wsManager.emitToUser(userId, 'execution:queued', {
      executionId: execution.id,
      position: await this.getQueuePosition(execution.id),
    });

    return execution;
  }

  private setupQueueProcessors() {
    this.queue.process('execute', this.getConcurrency(), async (job: Job) => {
      const { executionId, workflowId, userId, tier } = job.data;

      try {
        // Update status
        await this.updateExecutionStatus(executionId, 'INITIALIZING');

        // Increment concurrent count
        await this.incrementConcurrent(userId);

        // Get workflow details
        const workflow = await this.prisma.workflow.findUnique({
          where: { id: workflowId },
        });

        if (!workflow) {
          throw new Error('Workflow not found');
        }

        // Create Kubernetes job
        const k8sJob = await this.createK8sJob({
          executionId,
          workflow,
          tier,
        });

        // Update status
        await this.updateExecutionStatus(executionId, 'RUNNING', {
          containerId: k8sJob.metadata?.name,
        });

        // Monitor execution
        const result = await this.monitorK8sJob(k8sJob, executionId);

        // Process results
        await this.processExecutionResults(executionId, result);

      } catch (error) {
        logger.error('Execution failed:', error);
        await this.updateExecutionStatus(executionId, 'FAILED', {
          errorMessage: error.message,
        });
        throw error;
      } finally {
        // Decrement concurrent count
        await this.decrementConcurrent(userId);
      }
    });
  }

  private async createK8sJob(config: any) {
    const jobManifest = {
      apiVersion: 'batch/v1',
      kind: 'Job',
      metadata: {
        name: `execution-${config.executionId}`,
        namespace: 'saasit-executions',
        labels: {
          app: 'saasit-executor',
          executionId: config.executionId,
          tier: config.tier,
        },
      },
      spec: {
        template: {
          metadata: {
            labels: {
              app: 'saasit-executor',
              executionId: config.executionId,
            },
          },
          spec: {
            containers: [{
              name: 'executor',
              image: 'saasit/executor:latest',
              resources: this.getResourceLimits(config.tier),
              env: [
                { name: 'EXECUTION_ID', value: config.executionId },
                { name: 'WORKFLOW_CONFIG', value: JSON.stringify(config.workflow) },
                { name: 'CALLBACK_URL', value: `${process.env.API_URL}/internal/execution/${config.executionId}/callback` },
                { name: 'S3_BUCKET', value: process.env.S3_BUCKET },
                {
                  name: 'ANTHROPIC_API_KEY',
                  valueFrom: {
                    secretKeyRef: {
                      name: 'api-keys',
                      key: 'anthropic',
                    },
                  },
                },
                {
                  name: 'GITHUB_TOKEN',
                  valueFrom: {
                    secretKeyRef: {
                      name: 'api-keys',
                      key: 'github',
                    },
                  },
                },
              ],
            }],
            restartPolicy: 'OnFailure',
          },
        },
        backoffLimit: 3,
        activeDeadlineSeconds: this.getMaxRuntime(config.tier),
      },
    };

    const response = await this.k8sApi.createNamespacedJob(
      'saasit-executions',
      jobManifest
    );

    return response.body;
  }

  private async monitorK8sJob(k8sJob: any, executionId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(async () => {
        try {
          const { body: job } = await this.k8sApi.readNamespacedJobStatus(
            k8sJob.metadata.name,
            'saasit-executions'
          );

          // Check completion
          if (job.status?.succeeded) {
            clearInterval(checkInterval);
            resolve({ success: true, job });
          }

          // Check failure
          if (job.status?.failed) {
            clearInterval(checkInterval);
            reject(new Error('Execution failed in Kubernetes'));
          }

        } catch (error) {
          clearInterval(checkInterval);
          reject(error);
        }
      }, 5000); // Check every 5 seconds

      // Set timeout based on tier
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Execution timeout'));
      }, this.getMaxRuntime('STARTER') * 1000);
    });
  }

  private async processExecutionResults(executionId: string, result: any) {
    // Get execution logs from container
    const logs = await this.getContainerLogs(result.job.metadata.name);

    // Upload logs to S3
    const logsUrl = await this.s3Service.uploadLogs(executionId, logs);

    // Get artifacts from S3 (uploaded by executor)
    const artifactsUrl = await this.s3Service.getArtifactsUrl(executionId);

    // Create GitHub repository if configured
    let gitRepoUrl = null;
    if (process.env.CREATE_GIT_REPOS === 'true') {
      gitRepoUrl = await this.githubService.createRepository(executionId);
    }

    // Update execution record
    await this.prisma.execution.update({
      where: { id: executionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        logsUrl,
        artifactsUrl,
        gitRepoUrl,
      },
    });

    // Notify user
    const execution = await this.prisma.execution.findUnique({
      where: { id: executionId },
      include: { workflow: true },
    });

    this.wsManager.emitToUser(execution!.userId, 'execution:completed', {
      executionId,
      artifactsUrl,
      gitRepoUrl,
    });
  }

  private async updateExecutionStatus(executionId: string, status: string, data?: any) {
    await this.prisma.execution.update({
      where: { id: executionId },
      data: {
        status: status as any,
        ...data,
      },
    });

    // Get execution for userId
    const execution = await this.prisma.execution.findUnique({
      where: { id: executionId },
    });

    if (execution) {
      this.wsManager.emitToUser(execution.userId, 'execution:status', {
        executionId,
        status,
      });
    }
  }

  private async checkConcurrentLimit(userId: string, tier: string): Promise<boolean> {
    const current = await this.redis.get(`concurrent:${userId}`);
    const limit = this.getConcurrentLimit(tier);
    return !current || parseInt(current) < limit;
  }

  private async incrementConcurrent(userId: string) {
    await this.redis.incr(`concurrent:${userId}`);
    await this.redis.expire(`concurrent:${userId}`, 86400); // 24h expiry
  }

  private async decrementConcurrent(userId: string) {
    const current = await this.redis.get(`concurrent:${userId}`);
    if (current && parseInt(current) > 0) {
      await this.redis.decr(`concurrent:${userId}`);
    }
  }

  private getConcurrentLimit(tier: string): number {
    const limits: Record<string, number> = {
      STARTER: 1,
      PROFESSIONAL: 3,
      SCALE: 10,
      ENTERPRISE: 50,
    };
    return limits[tier] || 0;
  }

  private getTierPriority(tier: string): number {
    const priorities: Record<string, number> = {
      SCALE: 1,
      PROFESSIONAL: 2,
      STARTER: 3,
      FREE: 4,
    };
    return priorities[tier] || 4;
  }

  private getConcurrency(): number {
    return parseInt(process.env.EXECUTION_CONCURRENCY || '10');
  }

  private getMaxRuntime(tier: string): number {
    const runtimes: Record<string, number> = {
      STARTER: 14400,      // 4 hours
      PROFESSIONAL: 43200, // 12 hours
      SCALE: 172800,       // 48 hours
    };
    return runtimes[tier] || 14400;
  }

  private getResourceLimits(tier: string) {
    const resources: Record<string, any> = {
      STARTER: {
        requests: { memory: '2Gi', cpu: '1' },
        limits: { memory: '4Gi', cpu: '2' },
      },
      PROFESSIONAL: {
        requests: { memory: '4Gi', cpu: '2' },
        limits: { memory: '8Gi', cpu: '4' },
      },
      SCALE: {
        requests: { memory: '8Gi', cpu: '4' },
        limits: { memory: '16Gi', cpu: '8' },
      },
    };
    return resources[tier] || resources.STARTER;
  }

  private async getContainerLogs(jobName: string): Promise<string> {
    // Implementation to get logs from Kubernetes pod
    // This would use the k8s API to fetch pod logs
    return 'Execution logs...';
  }

  private async getQueuePosition(executionId: string): Promise<number> {
    const jobs = await this.queue.getWaiting();
    const position = jobs.findIndex(job => job.data.executionId === executionId);
    return position + 1;
  }
}
```

### 6. WebSocket Server

```typescript
// src/websocket/SocketServer.ts
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import { WorkflowHandler } from './handlers/workflow.handler';
import { ExecutionHandler } from './handlers/execution.handler';
import { ChatHandler } from './handlers/chat.handler';

export class WebSocketManager {
  private static instance: WebSocketManager;
  private io: SocketIOServer;
  private prisma: PrismaClient;
  private userSockets: Map<string, Set<string>> = new Map();

  private constructor() {
    this.prisma = new PrismaClient();
  }

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  initialize(io: SocketIOServer) {
    this.io = io;

    // Authentication middleware
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
        socket.data.userId = payload.userId;

        // Track user socket
        this.addUserSocket(payload.userId, socket.id);

        next();
      } catch (err) {
        next(new Error('Authentication error'));
      }
    });

    // Connection handler
    io.on('connection', (socket: Socket) => {
      logger.info(`User ${socket.data.userId} connected`);

      // Initialize handlers
      new WorkflowHandler(socket, this.prisma);
      new ExecutionHandler(socket, this.prisma);
      new ChatHandler(socket, this.prisma);

      // Disconnect handler
      socket.on('disconnect', () => {
        logger.info(`User ${socket.data.userId} disconnected`);
        this.removeUserSocket(socket.data.userId, socket.id);
      });
    });
  }

  emitToUser(userId: string, event: string, data: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.forEach(socketId => {
        this.io.to(socketId).emit(event, data);
      });
    }
  }

  emitToRoom(room: string, event: string, data: any) {
    this.io.to(room).emit(event, data);
  }

  private addUserSocket(userId: string, socketId: string) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
  }

  private removeUserSocket(userId: string, socketId: string) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }
}

export function initializeSocketServer(io: SocketIOServer) {
  const manager = WebSocketManager.getInstance();
  manager.initialize(io);
}
```

## API Documentation

### OpenAPI/Swagger Setup

```yaml
# swagger.yaml
openapi: 3.0.0
info:
  title: SaasIt.ai API
  version: 1.0.0
  description: API for AI agent workflow orchestration

servers:
  - url: https://api.saasit.ai/v1
    description: Production
  - url: http://localhost:3001/api/v1
    description: Development

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    User:
      type: object
      properties:
        id:
          type: string
        email:
          type: string
        name:
          type: string
        tier:
          type: string
          enum: [FREE, DESIGNER, STARTER, PROFESSIONAL, SCALE]

    Workflow:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        description:
          type: string
        canvasState:
          type: object
        agentCount:
          type: integer
        createdAt:
          type: string
          format: date-time

paths:
  /auth/register:
    post:
      summary: Register new user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
                - password
              properties:
                email:
                  type: string
                password:
                  type: string
                name:
                  type: string
      responses:
        201:
          description: User created successfully

  /workflows:
    get:
      summary: List user workflows
      security:
        - bearerAuth: []
      parameters:
        - in: query
          name: page
          schema:
            type: integer
        - in: query
          name: limit
          schema:
            type: integer
      responses:
        200:
          description: List of workflows
```

## Testing

### Unit Test Example

```typescript
// tests/unit/services/workflow.service.test.ts
import { WorkflowService } from '@/api/v1/workflows/workflow.service';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

jest.mock('@prisma/client');
jest.mock('ioredis');

describe('WorkflowService', () => {
  let service: WorkflowService;
  let prisma: jest.Mocked<PrismaClient>;
  let redis: jest.Mocked<Redis>;

  beforeEach(() => {
    service = new WorkflowService();
    prisma = (service as any).prisma;
    redis = (service as any).redis;
  });

  describe('createWorkflow', () => {
    it('should create workflow for valid user', async () => {
      const userId = 'user-123';
      const workflowData = {
        name: 'Test Workflow',
        description: 'Test description',
      };

      prisma.user.findUnique = jest.fn().mockResolvedValue({
        id: userId,
        tier: 'STARTER',
      });

      prisma.workflow.create = jest.fn().mockResolvedValue({
        id: 'workflow-123',
        ...workflowData,
      });

      const result = await service.createWorkflow(userId, workflowData);

      expect(result.name).toBe(workflowData.name);
      expect(prisma.workflow.create).toHaveBeenCalled();
    });

    it('should enforce FREE tier limits', async () => {
      const userId = 'user-123';
      
      prisma.user.findUnique = jest.fn().mockResolvedValue({
        id: userId,
        tier: 'FREE',
      });

      // Mock that user has already created 3 workflows
      const usageTracker = (service as any).usageTracker;
      usageTracker.getMonthlyWorkflowCount = jest.fn().mockResolvedValue(3);

      await expect(
        service.createWorkflow(userId, { name: 'Test' })
      ).rejects.toThrow('Monthly workflow limit reached');
    });
  });
});
```

### Integration Test Example

```typescript
// tests/integration/api/workflows.test.ts
import request from 'supertest';
import { App } from '@/app';
import { PrismaClient } from '@prisma/client';

describe('Workflow API', () => {
  let app: App;
  let prisma: PrismaClient;
  let authToken: string;

  beforeAll(async () => {
    app = new App();
    prisma = new PrismaClient();
    
    // Create test user and get token
    const response = await request(app.app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Test123!',
      });
    
    authToken = response.body.accessToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/v1/workflows', () => {
    it('should create workflow', async () => {
      const response = await request(app.app)
        .post('/api/v1/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Workflow',
          description: 'Test description',
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Test Workflow');
    });
  });
});
```

## Deployment

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Generate Prisma client
RUN npx prisma generate

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
```

### Environment Variables

```bash
# .env.example
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/saasit

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# AWS
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=us-east-1
S3_BUCKET=saasit-artifacts

# Anthropic
ANTHROPIC_API_KEY=xxx

# GitHub
GITHUB_TOKEN=xxx

# Stripe
STRIPE_SECRET_KEY=xxx
STRIPE_WEBHOOK_SECRET=xxx

# Frontend
FRONTEND_URL=https://saasit.ai

# Kubernetes
K8S_NAMESPACE=saasit-executions
```

## Monitoring

### Health Checks

```typescript
// src/api/health/health.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

export class HealthController {
  private prisma: PrismaClient;
  private redis: Redis;

  constructor() {
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL!);
  }

  async checkHealth(req: Request, res: Response) {
    const checks = {
      database: 'unhealthy',
      redis: 'unhealthy',
      kubernetes: 'unhealthy',
    };

    // Check database
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'healthy';
    } catch (error) {
      // Database is down
    }

    // Check Redis
    try {
      await this.redis.ping();
      checks.redis = 'healthy';
    } catch (error) {
      // Redis is down
    }

    // Check Kubernetes
    try {
      // Check if K8s API is accessible
      checks.kubernetes = 'healthy';
    } catch (error) {
      // K8s is down
    }

    const allHealthy = Object.values(checks).every(status => status === 'healthy');
    
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'unhealthy',
      checks,
      timestamp: new Date().toISOString(),
    });
  }
}
```

This completes the comprehensive backend technical documentation for SaasIt.ai.