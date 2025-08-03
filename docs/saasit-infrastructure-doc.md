# SaasIt.ai - Infrastructure Technical Documentation

## Overview

The SaasIt.ai infrastructure is designed for scalability, reliability, and cost-efficiency. Built on Kubernetes for container orchestration, with PostgreSQL for data persistence, Redis for caching/queuing, and S3 for artifact storage. The infrastructure supports auto-scaling, multi-region deployment, and zero-downtime updates.

## Infrastructure Stack

```yaml
Cloud Provider: AWS (primary) / GCP (secondary)
Container Orchestration: Kubernetes 1.28
Container Runtime: Docker 24.0
Service Mesh: Istio 1.19
Ingress: NGINX Ingress Controller
Load Balancer: AWS ALB / CloudFlare
Database: PostgreSQL 15 (RDS)
Cache/Queue: Redis 7.2 (ElastiCache)
Object Storage: AWS S3 / MinIO
CI/CD: GitHub Actions + ArgoCD
Monitoring: Prometheus + Grafana
Logging: ELK Stack (Elasticsearch, Logstash, Kibana)
Secrets: Kubernetes Secrets + AWS Secrets Manager
DNS: CloudFlare
CDN: CloudFlare
SSL: Let's Encrypt + cert-manager
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         CloudFlare                           │
│                    (CDN, DDoS Protection)                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    AWS Load Balancer                         │
│                         (ALB)                                │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                  Kubernetes Cluster                          │
│  ┌────────────────────────────────────────────────────┐     │
│  │              Ingress Controller (NGINX)             │     │
│  └──────┬─────────────┬─────────────┬─────────────────┘     │
│         │             │             │                        │
│  ┌──────▼──────┐ ┌───▼────┐ ┌─────▼──────┐                │
│  │  Frontend    │ │Backend │ │ WebSocket  │                 │
│  │   (Next.js)  │ │  API   │ │   Server   │                 │
│  │   Pods       │ │  Pods  │ │   Pods     │                 │
│  └──────────────┘ └───┬────┘ └────────────┘                │
│                       │                                      │
│  ┌────────────────────▼────────────────────┐                │
│  │         Execution Containers            │                │
│  │         (Claude Code SDK)               │                │
│  └──────────────────────────────────────────┘                │
└───────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼──────┐  ┌────────▼──────┐  ┌───────▼──────┐
│  PostgreSQL  │  │     Redis     │  │   S3/MinIO   │
│     (RDS)    │  │ (ElastiCache) │  │   Storage    │
└──────────────┘  └───────────────┘  └──────────────┘
```

## Kubernetes Configuration

### 1. Namespace Setup

```yaml
# k8s/namespaces.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: saasit-production
  labels:
    name: saasit-production
    istio-injection: enabled
---
apiVersion: v1
kind: Namespace
metadata:
  name: saasit-staging
  labels:
    name: saasit-staging
    istio-injection: enabled
---
apiVersion: v1
kind: Namespace
metadata:
  name: saasit-executions
  labels:
    name: saasit-executions
    istio-injection: disabled  # Executions don't need service mesh
```

### 2. Frontend Deployment

```yaml
# k8s/frontend/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: saasit-production
  labels:
    app: frontend
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
        version: v1
    spec:
      containers:
      - name: frontend
        image: saasit/frontend:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        - name: NEXT_PUBLIC_API_URL
          value: "https://api.saasit.ai"
        - name: NEXT_PUBLIC_WS_URL
          value: "wss://ws.saasit.ai"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  namespace: saasit-production
spec:
  selector:
    app: frontend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
```

### 3. Backend API Deployment

```yaml
# k8s/backend/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
  namespace: saasit-production
  labels:
    app: backend-api
spec:
  replicas: 5
  selector:
    matchLabels:
      app: backend-api
  template:
    metadata:
      labels:
        app: backend-api
    spec:
      serviceAccountName: backend-service-account
      containers:
      - name: backend
        image: saasit/backend:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3001
          name: http
        - containerPort: 3002
          name: websocket
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: secret
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: anthropic-secret
              key: api-key
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: saasit-production
spec:
  selector:
    app: backend-api
  ports:
  - name: http
    protocol: TCP
    port: 80
    targetPort: 3001
  - name: websocket
    protocol: TCP
    port: 3002
    targetPort: 3002
  type: ClusterIP
```

### 4. Horizontal Pod Autoscaler

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: frontend-hpa
  namespace: saasit-production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: frontend
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: saasit-production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend-api
  minReplicas: 5
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
```

### 5. Ingress Configuration

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: saasit-ingress
  namespace: saasit-production
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
spec:
  tls:
  - hosts:
    - saasit.ai
    - api.saasit.ai
    - ws.saasit.ai
    secretName: saasit-tls
  rules:
  - host: saasit.ai
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
  - host: api.saasit.ai
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 80
  - host: ws.saasit.ai
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 3002
```

### 6. Execution Job Template

```yaml
# k8s/execution/job-template.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: execution-job-template
  namespace: saasit-executions
data:
  template.yaml: |
    apiVersion: batch/v1
    kind: Job
    metadata:
      name: execution-{{EXECUTION_ID}}
      namespace: saasit-executions
      labels:
        app: saasit-executor
        executionId: "{{EXECUTION_ID}}"
        tier: "{{TIER}}"
    spec:
      ttlSecondsAfterFinished: 3600  # Clean up after 1 hour
      activeDeadlineSeconds: {{MAX_RUNTIME}}
      backoffLimit: 3
      template:
        metadata:
          labels:
            app: saasit-executor
            executionId: "{{EXECUTION_ID}}"
        spec:
          serviceAccountName: executor-service-account
          containers:
          - name: executor
            image: saasit/executor:latest
            imagePullPolicy: Always
            env:
            - name: EXECUTION_ID
              value: "{{EXECUTION_ID}}"
            - name: WORKFLOW_CONFIG
              value: "{{WORKFLOW_CONFIG}}"
            - name: CALLBACK_URL
              value: "{{CALLBACK_URL}}"
            - name: S3_BUCKET
              value: "{{S3_BUCKET}}"
            - name: ANTHROPIC_API_KEY
              valueFrom:
                secretKeyRef:
                  name: api-keys
                  key: anthropic
            - name: GITHUB_TOKEN
              valueFrom:
                secretKeyRef:
                  name: api-keys
                  key: github
            resources:
              requests:
                memory: "{{MEMORY_REQUEST}}"
                cpu: "{{CPU_REQUEST}}"
              limits:
                memory: "{{MEMORY_LIMIT}}"
                cpu: "{{CPU_LIMIT}}"
            volumeMounts:
            - name: workspace
              mountPath: /workspace
            - name: docker-sock
              mountPath: /var/run/docker.sock
          volumes:
          - name: workspace
            emptyDir:
              sizeLimit: 10Gi
          - name: docker-sock
            hostPath:
              path: /var/run/docker.sock
              type: Socket
          restartPolicy: OnFailure
          nodeSelector:
            workload: execution
          tolerations:
          - key: "execution"
            operator: "Equal"
            value: "true"
            effect: "NoSchedule"
```

## Database Setup

### PostgreSQL RDS Configuration

```terraform
# terraform/rds.tf
resource "aws_db_instance" "saasit_db" {
  identifier     = "saasit-production"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.xlarge"
  
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_type          = "gp3"
  storage_encrypted     = true
  
  db_name  = "saasit"
  username = var.db_username
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.saasit.name
  
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "Mon:04:00-Mon:05:00"
  
  multi_az               = true
  publicly_accessible    = false
  deletion_protection    = true
  skip_final_snapshot    = false
  
  performance_insights_enabled = true
  monitoring_interval          = 60
  monitoring_role_arn         = aws_iam_role.rds_monitoring.arn
  
  tags = {
    Name        = "saasit-production"
    Environment = "production"
  }
}

# Read Replica
resource "aws_db_instance" "saasit_db_replica" {
  identifier             = "saasit-production-replica"
  replicate_source_db    = aws_db_instance.saasit_db.identifier
  instance_class         = "db.r6g.large"
  publicly_accessible    = false
  auto_minor_version_upgrade = false
  
  tags = {
    Name        = "saasit-production-replica"
    Environment = "production"
  }
}
```

### Redis ElastiCache Configuration

```terraform
# terraform/elasticache.tf
resource "aws_elasticache_replication_group" "saasit_redis" {
  replication_group_id       = "saasit-redis"
  replication_group_description = "Redis cluster for SaasIt.ai"
  
  engine               = "redis"
  engine_version       = "7.2"
  node_type           = "cache.r6g.xlarge"
  number_cache_clusters = 3
  
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = var.redis_auth_token
  
  subnet_group_name = aws_elasticache_subnet_group.saasit.name
  security_group_ids = [aws_security_group.redis_sg.id]
  
  snapshot_retention_limit = 7
  snapshot_window         = "03:00-05:00"
  maintenance_window      = "sun:05:00-sun:07:00"
  
  tags = {
    Name        = "saasit-redis"
    Environment = "production"
  }
}
```

## Storage Configuration

### S3 Bucket Setup

```terraform
# terraform/s3.tf
resource "aws_s3_bucket" "artifacts" {
  bucket = "saasit-artifacts"
  
  tags = {
    Name        = "saasit-artifacts"
    Environment = "production"
  }
}

resource "aws_s3_bucket_versioning" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  
  rule {
    id     = "delete-old-artifacts"
    status = "Enabled"
    
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
    
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
    
    expiration {
      days = 365
    }
  }
}

resource "aws_s3_bucket_public_access_block" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  ECR_REGISTRY: ${{ secrets.AWS_ECR_REGISTRY }}
  EKS_CLUSTER_NAME: saasit-production
  AWS_REGION: us-east-1

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Run E2E tests
      run: npm run test:e2e

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    strategy:
      matrix:
        service: [frontend, backend, executor]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}
    
    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v1
    
    - name: Build and push Docker image
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        IMAGE_TAG: ${{ github.sha }}
      run: |
        docker build -t $ECR_REGISTRY/saasit-${{ matrix.service }}:$IMAGE_TAG -f docker/${{ matrix.service }}/Dockerfile .
        docker push $ECR_REGISTRY/saasit-${{ matrix.service }}:$IMAGE_TAG
        docker tag $ECR_REGISTRY/saasit-${{ matrix.service }}:$IMAGE_TAG $ECR_REGISTRY/saasit-${{ matrix.service }}:latest
        docker push $ECR_REGISTRY/saasit-${{ matrix.service }}:latest

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}
    
    - name: Update kubeconfig
      run: |
        aws eks update-kubeconfig --region ${{ env.AWS_REGION }} --name ${{ env.EKS_CLUSTER_NAME }}
    
    - name: Deploy to Kubernetes
      run: |
        kubectl set image deployment/frontend frontend=saasit/frontend:${{ github.sha }} -n saasit-production
        kubectl set image deployment/backend-api backend=saasit/backend:${{ github.sha }} -n saasit-production
        kubectl rollout status deployment/frontend -n saasit-production
        kubectl rollout status deployment/backend-api -n saasit-production
```

### ArgoCD Application

```yaml
# argocd/application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: saasit-production
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/saasit/infrastructure
    targetRevision: main
    path: k8s/production
  destination:
    server: https://kubernetes.default.svc
    namespace: saasit-production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
```

## Monitoring Stack

### Prometheus Configuration

```yaml
# monitoring/prometheus-values.yaml
prometheus:
  prometheusSpec:
    retention: 30d
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: gp3
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 100Gi
    
    serviceMonitorSelector:
      matchLabels:
        prometheus: kube-prometheus
    
    resources:
      requests:
        memory: 2Gi
        cpu: 1
      limits:
        memory: 4Gi
        cpu: 2
    
    additionalScrapeConfigs:
    - job_name: 'kubernetes-pods'
      kubernetes_sd_configs:
      - role: pod
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
```

### Grafana Dashboards

```json
// monitoring/dashboards/saasit-overview.json
{
  "dashboard": {
    "title": "SaasIt.ai Overview",
    "panels": [
      {
        "title": "Active Executions",
        "targets": [
          {
            "expr": "sum(saasit_executions_active)"
          }
        ]
      },
      {
        "title": "API Request Rate",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m])) by (route)"
          }
        ]
      },
      {
        "title": "Execution Success Rate",
        "targets": [
          {
            "expr": "sum(rate(saasit_executions_completed[1h])) / sum(rate(saasit_executions_total[1h]))"
          }
        ]
      },
      {
        "title": "P95 Response Time",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ]
      }
    ]
  }
}
```

## Logging Stack

### ELK Configuration

```yaml
# logging/elasticsearch.yaml
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: saasit-elasticsearch
  namespace: elastic-system
spec:
  version: 8.11.0
  nodeSets:
  - name: master
    count: 3
    config:
      node.roles: ["master"]
    podTemplate:
      spec:
        containers:
        - name: elasticsearch
          resources:
            requests:
              memory: 2Gi
              cpu: 1
            limits:
              memory: 4Gi
              cpu: 2
    volumeClaimTemplates:
    - metadata:
        name: elasticsearch-data
      spec:
        accessModes:
        - ReadWriteOnce
        resources:
          requests:
            storage: 10Gi
        storageClassName: gp3
  
  - name: data
    count: 5
    config:
      node.roles: ["data", "ingest"]
    podTemplate:
      spec:
        containers:
        - name: elasticsearch
          resources:
            requests:
              memory: 4Gi
              cpu: 2
            limits:
              memory: 8Gi
              cpu: 4
    volumeClaimTemplates:
    - metadata:
        name: elasticsearch-data
      spec:
        accessModes:
        - ReadWriteOnce
        resources:
          requests:
            storage: 100Gi
        storageClassName: gp3
```

### Fluentd Configuration

```yaml
# logging/fluentd-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: kube-system
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/containers/*.log
      pos_file /var/log/fluentd-containers.log.pos
      tag kubernetes.*
      read_from_head true
      <parse>
        @type json
        time_format %Y-%m-%dT%H:%M:%S.%NZ
      </parse>
    </source>
    
    <filter kubernetes.**>
      @type kubernetes_metadata
      @id filter_kube_metadata
      kubernetes_url "#{ENV['FLUENT_FILTER_KUBERNETES_URL'] || 'https://' + ENV.fetch('KUBERNETES_SERVICE_HOST') + ':' + ENV.fetch('KUBERNETES_SERVICE_PORT') + '/api'}"
      verify_ssl "#{ENV['KUBERNETES_VERIFY_SSL'] || true}"
    </filter>
    
    <match **>
      @type elasticsearch
      @id out_es
      @log_level info
      include_tag_key true
      host "#{ENV['FLUENT_ELASTICSEARCH_HOST']}"
      port "#{ENV['FLUENT_ELASTICSEARCH_PORT']}"
      path "#{ENV['FLUENT_ELASTICSEARCH_PATH']}"
      scheme "#{ENV['FLUENT_ELASTICSEARCH_SCHEME'] || 'http'}"
      ssl_verify "#{ENV['FLUENT_ELASTICSEARCH_SSL_VERIFY'] || 'true'}"
      ssl_version "#{ENV['FLUENT_ELASTICSEARCH_SSL_VERSION'] || 'TLSv1_2'}"
      user "#{ENV['FLUENT_ELASTICSEARCH_USER']}"
      password "#{ENV['FLUENT_ELASTICSEARCH_PASSWORD']}"
      reload_connections "#{ENV['FLUENT_ELASTICSEARCH_RELOAD_CONNECTIONS'] || 'false'}"
      reconnect_on_error true
      reload_on_failure true
      log_es_400_reason false
      logstash_prefix "#{ENV['FLUENT_ELASTICSEARCH_LOGSTASH_PREFIX'] || 'logstash'}"
      logstash_dateformat "#{ENV['FLUENT_ELASTICSEARCH_LOGSTASH_DATEFORMAT'] || '%Y.%m.%d'}"
      logstash_format "#{ENV['FLUENT_ELASTICSEARCH_LOGSTASH_FORMAT'] || 'true'}"
      target_index_key "#{ENV['FLUENT_ELASTICSEARCH_TARGET_INDEX_KEY'] || use_nil}"
      include_timestamp "#{ENV['FLUENT_ELASTICSEARCH_INCLUDE_TIMESTAMP'] || 'false'}"
      template_name "#{ENV['FLUENT_ELASTICSEARCH_TEMPLATE_NAME'] || use_nil}"
      template_file "#{ENV['FLUENT_ELASTICSEARCH_TEMPLATE_FILE'] || use_nil}"
      template_overwrite "#{ENV['FLUENT_ELASTICSEARCH_TEMPLATE_OVERWRITE'] || use_default}"
      sniffer_class_name "#{ENV['FLUENT_SNIFFER_CLASS_NAME'] || 'Fluent::Plugin::ElasticsearchSimpleSniffer'}"
      request_timeout "#{ENV['FLUENT_ELASTICSEARCH_REQUEST_TIMEOUT'] || '5s'}"
      <buffer>
        flush_thread_count "#{ENV['FLUENT_ELASTICSEARCH_BUFFER_FLUSH_THREAD_COUNT'] || '8'}"
        flush_interval "#{ENV['FLUENT_ELASTICSEARCH_BUFFER_FLUSH_INTERVAL'] || '5s'}"
        chunk_limit_size "#{ENV['FLUENT_ELASTICSEARCH_BUFFER_CHUNK_LIMIT_SIZE'] || '2M'}"
        queue_limit_length "#{ENV['FLUENT_ELASTICSEARCH_BUFFER_QUEUE_LIMIT_LENGTH'] || '32'}"
        retry_max_interval "#{ENV['FLUENT_ELASTICSEARCH_BUFFER_RETRY_MAX_INTERVAL'] || '30'}"
        retry_forever true
      </buffer>
    </match>
```

## Security Configuration

### Network Policies

```yaml
# k8s/network-policies.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-network-policy
  namespace: saasit-production
spec:
  podSelector:
    matchLabels:
      app: backend-api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    - podSelector:
        matchLabels:
          app: nginx-ingress
    ports:
    - protocol: TCP
      port: 3001
    - protocol: TCP
      port: 3002
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
  - to:
    - namespaceSelector:
        matchLabels:
          name: saasit-executions
    ports:
    - protocol: TCP
      port: 443
```

### RBAC Configuration

```yaml
# k8s/rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: backend-service-account
  namespace: saasit-production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: backend-role
  namespace: saasit-production
rules:
- apiGroups: [""]
  resources: ["pods", "services"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["batch"]
  resources: ["jobs"]
  verbs: ["create", "get", "list", "watch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: backend-rolebinding
  namespace: saasit-production
subjects:
- kind: ServiceAccount
  name: backend-service-account
  namespace: saasit-production
roleRef:
  kind: Role
  name: backend-role
  apiGroup: rbac.authorization.k8s.io
---
# Executor service account for saasit-executions namespace
apiVersion: v1
kind: ServiceAccount
metadata:
  name: executor-service-account
  namespace: saasit-executions
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: executor-role
  namespace: saasit-executions
rules:
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get"]
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: executor-rolebinding
  namespace: saasit-executions
subjects:
- kind: ServiceAccount
  name: executor-service-account
  namespace: saasit-executions
roleRef:
  kind: Role
  name: executor-role
  apiGroup: rbac.authorization.k8s.io
```

## Backup and Disaster Recovery

### Database Backup Strategy

```bash
#!/bin/bash
# scripts/backup-database.sh

#!/bin/bash
set -e

# Configuration
DB_HOST="${DB_HOST}"
DB_NAME="${DB_NAME}"
DB_USER="${DB_USER}"
DB_PASSWORD="${DB_PASSWORD}"
S3_BUCKET="saasit-backups"
BACKUP_NAME="saasit-db-$(date +%Y%m%d-%H%M%S).sql.gz"

# Create backup
echo "Starting database backup..."
PGPASSWORD=$DB_PASSWORD pg_dump \
  -h $DB_HOST \
  -U $DB_USER \
  -d $DB_NAME \
  --verbose \
  --no-owner \
  --no-privileges \
  | gzip > /tmp/$BACKUP_NAME

# Upload to S3
echo "Uploading to S3..."
aws s3 cp /tmp/$BACKUP_NAME s3://$S3_BUCKET/postgres/$BACKUP_NAME \
  --storage-class STANDARD_IA

# Clean up
rm /tmp/$BACKUP_NAME

# Verify backup
aws s3 ls s3://$S3_BUCKET/postgres/$BACKUP_NAME

echo "Backup completed: $BACKUP_NAME"
```

### Kubernetes Backup with Velero

```yaml
# velero/backup-schedule.yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  template:
    ttl: 720h  # 30 days retention
    includedNamespaces:
    - saasit-production
    - saasit-executions
    excludedResources:
    - events
    - events.events.k8s.io
    storageLocation: default
    volumeSnapshotLocations:
    - default
```

## Cost Optimization

### Spot Instance Configuration

```yaml
# k8s/spot-instances.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: aws-auth
  namespace: kube-system
data:
  mapRoles: |
    - rolearn: arn:aws:iam::123456789012:role/eksctl-saasit-nodegroup-spot-NodeInstanceRole
      username: system:node:{{EC2PrivateDNSName}}
      groups:
        - system:bootstrappers
        - system:nodes
---
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig
metadata:
  name: saasit-production
  region: us-east-1
managedNodeGroups:
  - name: on-demand-nodes
    instanceTypes: ["t3.medium", "t3.large"]
    minSize: 3
    maxSize: 10
    desiredCapacity: 5
    volumeSize: 100
    
  - name: spot-nodes
    instanceTypes: ["t3.medium", "t3.large", "t3a.medium", "t3a.large"]
    spot: true
    minSize: 5
    maxSize: 50
    desiredCapacity: 10
    volumeSize: 100
    taints:
      - key: spot
        value: "true"
        effect: NoSchedule
    labels:
      workload: spot
```

### Reserved Instance Planning

```python
# scripts/calculate-ri-savings.py
import boto3
import pandas as pd
from datetime import datetime, timedelta

def calculate_ri_savings():
    ce = boto3.client('cost-explorer')
    
    # Get current usage
    response = ce.get_cost_and_usage(
        TimePeriod={
            'Start': (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'),
            'End': datetime.now().strftime('%Y-%m-%d')
        },
        Granularity='MONTHLY',
        Metrics=['UnblendedCost'],
        GroupBy=[
            {'Type': 'DIMENSION', 'Key': 'INSTANCE_TYPE'},
            {'Type': 'DIMENSION', 'Key': 'SERVICE'}
        ]
    )
    
    # Calculate potential savings with RIs
    on_demand_cost = 0
    ri_cost = 0
    
    for result in response['ResultsByTime']:
        for group in result['Groups']:
            instance_type = group['Keys'][0]
            service = group['Keys'][1]
            cost = float(group['Metrics']['UnblendedCost']['Amount'])
            
            if service == 'Amazon Elastic Compute Cloud - Compute':
                on_demand_cost += cost
                # Assume 40% discount with 1-year RIs
                ri_cost += cost * 0.6
    
    savings = on_demand_cost - ri_cost
    print(f"Current monthly on-demand cost: ${on_demand_cost:.2f}")
    print(f"Estimated RI cost: ${ri_cost:.2f}")
    print(f"Potential monthly savings: ${savings:.2f}")
    print(f"Annual savings: ${savings * 12:.2f}")

if __name__ == "__main__":
    calculate_ri_savings()
```

## Monitoring Alerts

### Alertmanager Configuration

```yaml
# monitoring/alertmanager-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alertmanager-config
  namespace: monitoring
data:
  alertmanager.yml: |
    global:
      slack_api_url: '${SLACK_WEBHOOK_URL}'
      pagerduty_url: 'https://events.pagerduty.com/v2/enqueue'
    
    route:
      group_by: ['alertname', 'cluster', 'service']
      group_wait: 10s
      group_interval: 10s
      repeat_interval: 12h
      receiver: 'default'
      routes:
      - match:
          severity: critical
        receiver: pagerduty
      - match:
          severity: warning
        receiver: slack
    
    receivers:
    - name: 'default'
      slack_configs:
      - channel: '#alerts'
        title: 'SaasIt Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
    
    - name: 'pagerduty'
      pagerduty_configs:
      - service_key: '${PAGERDUTY_SERVICE_KEY}'
        description: '{{ .GroupLabels.alertname }}'
    
    - name: 'slack'
      slack_configs:
      - channel: '#alerts'
        title: 'Warning: {{ .GroupLabels.alertname }}'
        text: '{{ .CommonAnnotations.description }}'
```

### Alert Rules

```yaml
# monitoring/alert-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: saasit-alerts
  namespace: monitoring
spec:
  groups:
  - name: saasit.rules
    interval: 30s
    rules:
    - alert: HighErrorRate
      expr: |
        sum(rate(http_requests_total{status=~"5.."}[5m])) 
        / 
        sum(rate(http_requests_total[5m])) > 0.05
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High error rate detected"
        description: "Error rate is above 5% for 5 minutes"
    
    - alert: PodMemoryUsage
      expr: |
        container_memory_usage_bytes{pod!=""} 
        / 
        container_spec_memory_limit_bytes{pod!=""} > 0.9
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Pod memory usage high"
        description: "Pod {{ $labels.pod }} memory usage above 90%"
    
    - alert: ExecutionQueueBacklog
      expr: |
        saasit_execution_queue_length > 100
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Execution queue backlog"
        description: "More than 100 executions waiting in queue"
    
    - alert: DatabaseConnectionPoolExhausted
      expr: |
        pg_stat_database_numbackends 
        / 
        pg_settings_max_connections > 0.8
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Database connection pool near limit"
        description: "Database connection usage above 80%"
```

## Performance Tuning

### Kubernetes Resource Optimization

```yaml
# k8s/vertical-pod-autoscaler.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: backend-vpa
  namespace: saasit-production
spec:
  targetRef:
    apiVersion: "apps/v1"
    kind: Deployment
    name: backend-api
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: backend
      minAllowed:
        cpu: 250m
        memory: 256Mi
      maxAllowed:
        cpu: 2
        memory: 2Gi
```

### Database Performance Tuning

```sql
-- Database indexes
CREATE INDEX CONCURRENTLY idx_workflows_user_id ON workflows(user_id);
CREATE INDEX CONCURRENTLY idx_workflows_created_at ON workflows(created_at DESC);
CREATE INDEX CONCURRENTLY idx_executions_user_status ON executions(user_id, status);
CREATE INDEX CONCURRENTLY idx_executions_status ON executions(status) WHERE status IN ('QUEUED', 'RUNNING');
CREATE INDEX CONCURRENTLY idx_execution_logs_execution_id ON execution_logs(execution_id, timestamp DESC);

-- Partitioning for large tables
CREATE TABLE execution_logs_2024_01 PARTITION OF execution_logs
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE execution_logs_2024_02 PARTITION OF execution_logs
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Vacuum and analyze
VACUUM ANALYZE workflows;
VACUUM ANALYZE executions;
```

## Operational Runbooks

### Incident Response

```markdown
# Incident Response Runbook

## Severity Levels
- **P1**: Complete service outage
- **P2**: Significant degradation
- **P3**: Minor issues
- **P4**: Cosmetic issues

## P1 Response Process
1. **Alert received** (PagerDuty)
2. **Acknowledge within 5 minutes**
3. **Join incident channel** (#incident-YYYY-MM-DD)
4. **Assess impact**
   ```bash
   kubectl get pods -n saasit-production
   kubectl top nodes
   kubectl logs -n saasit-production deployment/backend-api --tail=100
   ```
5. **Implement fix or rollback**
   ```bash
   # Rollback deployment
   kubectl rollout undo deployment/backend-api -n saasit-production
   ```
6. **Verify resolution**
7. **Post-mortem within 48 hours**

## Common Issues

### High Memory Usage
```bash
# Check memory usage
kubectl top pods -n saasit-production

# Restart pods if needed
kubectl rollout restart deployment/backend-api -n saasit-production
```

### Database Connection Issues
```bash
# Check connection pool
psql -h $DB_HOST -U $DB_USER -d saasit -c "SELECT count(*) FROM pg_stat_activity;"

# Kill idle connections
psql -h $DB_HOST -U $DB_USER -d saasit -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND state_change < now() - interval '10 minutes';"
```

### Execution Queue Backed Up
```bash
# Check queue length
redis-cli -h $REDIS_HOST LLEN execution-queue

# Scale up workers if needed
kubectl scale deployment backend-api --replicas=10 -n saasit-production
```
```

This completes the comprehensive infrastructure technical documentation for SaasIt.ai, covering all aspects of deployment, scaling, monitoring, and operations.