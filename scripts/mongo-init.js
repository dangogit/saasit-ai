// MongoDB initialization script for testing
// This script runs when the MongoDB container starts for the first time

// Switch to test database
db = db.getSiblingDB('saasit_test');

// Create test user with read/write permissions
db.createUser({
    user: 'testuser',
    pwd: 'testpassword',
    roles: [
        {
            role: 'readWrite',
            db: 'saasit_test'
        }
    ]
});

// Create collections with indexes for better test performance
print('Creating test collections...');

// Onboarding progress collection
db.createCollection('onboarding_progress');
db.onboarding_progress.createIndex({ 'user_id': 1 }, { unique: true });
db.onboarding_progress.createIndex({ 'saved_at': 1 });
db.onboarding_progress.createIndex({ 'current_step': 1 });

// Users collection (if needed for testing)
db.createCollection('users');
db.users.createIndex({ 'user_id': 1 }, { unique: true });
db.users.createIndex({ 'email': 1 }, { unique: true });
db.users.createIndex({ 'tier': 1 });

// Workflow executions collection
db.createCollection('workflow_executions');
db.workflow_executions.createIndex({ 'execution_id': 1 }, { unique: true });
db.workflow_executions.createIndex({ 'user_id': 1 });
db.workflow_executions.createIndex({ 'created_at': 1 });
db.workflow_executions.createIndex({ 'status': 1 });

// Execution steps collection
db.createCollection('execution_steps');
db.execution_steps.createIndex({ 'execution_id': 1 });
db.execution_steps.createIndex({ 'step_number': 1 });
db.execution_steps.createIndex({ 'status': 1 });

// Terminal output collection
db.createCollection('terminal_output');
db.terminal_output.createIndex({ 'execution_id': 1 });
db.terminal_output.createIndex({ 'timestamp': 1 });
// TTL index to automatically clean up old terminal logs
db.terminal_output.createIndex({ 'timestamp': 1 }, { expireAfterSeconds: 604800 }); // 7 days

// Insert sample test data
print('Inserting sample test data...');

// Sample onboarding progress
db.onboarding_progress.insertOne({
    user_id: 'test_user_sample',
    progress_data: {
        current_step: 'welcome',
        completed_steps: [],
        project_type: null,
        claude_code_detected: false,
        github_connected: false
    },
    saved_at: new Date(),
    version: '1.0'
});

// Sample user
db.users.insertOne({
    user_id: 'test_user_free',
    email: 'test+free@saasit.ai',
    tier: 'free',
    created_at: new Date(),
    last_login: new Date(),
    metadata: {
        onboarding_completed: false,
        preferred_agents: []
    }
});

db.users.insertOne({
    user_id: 'test_user_premium',
    email: 'test+premium@saasit.ai', 
    tier: 'architect',
    created_at: new Date(),
    last_login: new Date(),
    metadata: {
        onboarding_completed: true,
        preferred_agents: ['rapid-prototyper', 'frontend-developer']
    }
});

// Sample workflow execution
db.workflow_executions.insertOne({
    execution_id: 'test_execution_sample',
    user_id: 'test_user_premium',
    workflow_config: {
        agents: ['rapid-prototyper'],
        project_type: 'new',
        description: 'Sample test project'
    },
    status: 'completed',
    created_at: new Date(),
    completed_at: new Date(),
    total_steps: 3,
    completed_steps: 3
});

print('MongoDB test database initialized successfully!');
print('Collections created:');
print('- onboarding_progress');
print('- users');
print('- workflow_executions');
print('- execution_steps');
print('- terminal_output');
print('');
print('Test users created:');
print('- test_user_free (tier: free)');
print('- test_user_premium (tier: architect)');
print('');
print('Database ready for testing!');