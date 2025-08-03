// Mock data for SaasIt.ai

export const agents = [
  // Engineering Agents
  {
    id: 'rapid-prototyper',
    name: 'Rapid Prototyper',
    category: 'Engineering',
    description: 'MVP creation specialist that builds functional prototypes quickly',
    icon: '🚀',
    color: 'accent-blue',
    capabilities: ['Fast prototyping', 'MVP development', 'Core feature implementation'],
    estimatedTime: '2-4 hours'
  },
  {
    id: 'frontend-developer',
    name: 'Frontend Developer',
    category: 'Engineering',
    description: 'UI implementation expert specializing in modern web interfaces',
    icon: '💻',
    color: 'accent-green',
    capabilities: ['React/Vue development', 'CSS styling', 'Component architecture'],
    estimatedTime: '3-6 hours'
  },
  {
    id: 'backend-architect',
    name: 'Backend Architect',
    category: 'Engineering',
    description: 'API and database design specialist for scalable backends',
    icon: '⚙️',
    color: 'accent-purple',
    capabilities: ['API design', 'Database modeling', 'Server architecture'],
    estimatedTime: '4-8 hours'
  },
  {
    id: 'mobile-app-builder',
    name: 'Mobile App Builder',
    category: 'Engineering',
    description: 'iOS/Android development expert for mobile applications',
    icon: '📱',
    color: 'accent-orange',
    capabilities: ['React Native', 'Native development', 'Mobile optimization'],
    estimatedTime: '6-12 hours'
  },
  {
    id: 'ai-engineer',
    name: 'AI Engineer',
    category: 'Engineering',
    description: 'AI/ML integration specialist for intelligent features',
    icon: '🤖',
    color: 'accent-pink',
    capabilities: ['ML model integration', 'AI API setup', 'Smart features'],
    estimatedTime: '4-8 hours'
  },

  // Design Agents
  {
    id: 'ui-designer',
    name: 'UI Designer',
    category: 'Design',
    description: 'Interface design expert creating beautiful user experiences',
    icon: '🎨',
    color: 'accent-purple',
    capabilities: ['Interface design', 'Component systems', 'Visual hierarchy'],
    estimatedTime: '3-6 hours'
  },
  {
    id: 'ux-researcher',
    name: 'UX Researcher',
    category: 'Design',
    description: 'User research and testing specialist for optimal UX',
    icon: '🔍',
    color: 'accent-blue',
    capabilities: ['User research', 'A/B testing', 'UX optimization'],
    estimatedTime: '2-4 hours'
  },
  {
    id: 'brand-guardian',
    name: 'Brand Guardian',
    category: 'Design',
    description: 'Brand consistency expert ensuring cohesive identity',
    icon: '🛡️',
    color: 'accent-green',
    capabilities: ['Brand guidelines', 'Visual consistency', 'Style systems'],
    estimatedTime: '1-2 hours'
  },

  // Marketing Agents
  {
    id: 'growth-hacker',
    name: 'Growth Hacker',
    category: 'Marketing',
    description: 'Viral mechanics specialist driving user acquisition',
    icon: '📈',
    color: 'accent-orange',
    capabilities: ['Viral features', 'Growth loops', 'User acquisition'],
    estimatedTime: '2-4 hours'
  },
  {
    id: 'content-creator',
    name: 'Content Creator',
    category: 'Marketing',
    description: 'Multi-platform content specialist for marketing campaigns',
    icon: '✍️',
    color: 'accent-pink',
    capabilities: ['Content strategy', 'Copy writing', 'Marketing materials'],
    estimatedTime: '2-3 hours'
  },
  {
    id: 'seo-optimizer',
    name: 'SEO Optimizer',
    category: 'Marketing',
    description: 'Search engine optimization expert for organic growth',
    icon: '🔍',
    color: 'accent-blue',
    capabilities: ['SEO optimization', 'Meta tags', 'Search ranking'],
    estimatedTime: '1-2 hours'
  },

  // Product Agents
  {
    id: 'feedback-synthesizer',
    name: 'Feedback Synthesizer',
    category: 'Product',
    description: 'User feedback analysis expert for product improvements',
    icon: '📊',
    color: 'accent-green',
    capabilities: ['Feedback analysis', 'User insights', 'Feature prioritization'],
    estimatedTime: '1-3 hours'
  },
  {
    id: 'trend-researcher',
    name: 'Trend Researcher',
    category: 'Product',
    description: 'Market opportunity identification specialist',
    icon: '📡',
    color: 'accent-purple',
    capabilities: ['Market research', 'Trend analysis', 'Opportunity mapping'],
    estimatedTime: '2-4 hours'
  },

  // Operations Agents
  {
    id: 'analytics-reporter',
    name: 'Analytics Reporter',
    category: 'Operations',
    description: 'Data insights specialist for business intelligence',
    icon: '📊',
    color: 'accent-orange',
    capabilities: ['Analytics setup', 'Data visualization', 'Performance metrics'],
    estimatedTime: '2-4 hours'
  },
  {
    id: 'devops-automator',
    name: 'DevOps Automator',
    category: 'Operations',
    description: 'Deployment and scaling specialist for production apps',
    icon: '🔧',
    color: 'accent-grey',
    capabilities: ['CI/CD setup', 'Auto deployment', 'Infrastructure'],
    estimatedTime: '4-6 hours'
  },

  // Testing Agents
  {
    id: 'test-writer-fixer',
    name: 'Test Writer & Fixer',
    category: 'Testing',
    description: 'Quality assurance specialist ensuring bug-free applications',
    icon: '🧪',
    color: 'accent-pink',
    capabilities: ['Unit testing', 'Integration tests', 'Bug fixing'],
    estimatedTime: '2-4 hours'
  },
  {
    id: 'performance-benchmarker',
    name: 'Performance Benchmarker',
    category: 'Testing',
    description: 'Speed optimization expert for fast applications',
    icon: '⚡',
    color: 'accent-blue',
    capabilities: ['Performance testing', 'Speed optimization', 'Load testing'],
    estimatedTime: '2-3 hours'
  }
];

export const agentCategories = [
  { id: 'all', name: 'All Agents', count: agents.length },
  { id: 'engineering', name: 'Engineering', count: agents.filter(a => a.category === 'Engineering').length },
  { id: 'design', name: 'Design', count: agents.filter(a => a.category === 'Design').length },
  { id: 'marketing', name: 'Marketing', count: agents.filter(a => a.category === 'Marketing').length },
  { id: 'product', name: 'Product', count: agents.filter(a => a.category === 'Product').length },
  { id: 'operations', name: 'Operations', count: agents.filter(a => a.category === 'Operations').length },
  { id: 'testing', name: 'Testing', count: agents.filter(a => a.category === 'Testing').length }
];

export const pricingTiers = [
  {
    id: 'free',
    name: 'Explorer',
    subtitle: 'Perfect for testing',
    price: 0,
    period: '/month',
    description: 'Get started with basic workflow design',
    features: [
      '3 workflows per month',
      '10 chat messages per workflow',
      '10 agents max per workflow',
      'Export to Claude Code config'
    ],
    limitations: [
      'No cloud execution',
      'Limited agent library'
    ],
    cta: 'Start Free',
    popular: false,
    color: 'accent-grey'
  },
  {
    id: 'designer',
    name: 'Architect',
    subtitle: 'For Claude Code users',
    price: 20,
    period: '/month',
    description: 'Unlimited workflow design with full agent access',
    features: [
      'UNLIMITED workflows',
      'UNLIMITED chat messages',
      'UNLIMITED agents per workflow',
      'Custom agent creation',
      'All templates access',
      'Version history (30 days)'
    ],
    limitations: [
      'No cloud execution'
    ],
    cta: 'Get Architect',
    popular: false,
    color: 'accent-blue'
  },
  {
    id: 'starter',
    name: 'Builder',
    subtitle: 'Cloud execution included',
    price: 100,
    period: '/month',
    description: 'Everything you need to build and deploy apps',
    features: [
      'Everything in Designer',
      '1 concurrent cloud execution',
      'UNLIMITED executions per month',
      '4-hour max runtime per execution',
      'Git repository delivery',
      'Execution logs (7 days)'
    ],
    limitations: [],
    cta: 'Start Building',
    popular: true,
    color: 'accent-green'
  },
  {
    id: 'professional',
    name: 'Shipper',
    subtitle: 'For scaling teams',
    price: 299,
    period: '/month',
    description: 'Advanced features for professional development',
    features: [
      'Everything in Starter',
      '3 concurrent executions',
      'Priority queue',
      '12-hour max runtime',
      'API access (100 calls/day)',
      'Team seats (3 included)'
    ],
    limitations: [],
    cta: 'Scale Up',
    popular: false,
    color: 'accent-orange'
  },
  {
    id: 'scale',
    name: 'Studio',
    subtitle: 'Enterprise-grade',
    price: 799,
    period: '/month',
    description: 'Full-scale development studio capabilities',
    features: [
      'Everything in Professional',
      '10 concurrent executions',
      'Dedicated queue',
      '48-hour max runtime',
      'API access (1000 calls/day)',
      'Team seats (10 included)'
    ],
    limitations: [],
    cta: 'Go Enterprise',
    popular: false,
    color: 'accent-purple'
  }
];

export const workflowTemplates = [
  {
    id: 'saas-mvp',
    name: 'SaaS MVP',
    description: 'Complete SaaS application with authentication, payments, and core features',
    agents: ['rapid-prototyper', 'frontend-developer', 'backend-architect', 'ui-designer', 'test-writer-fixer'],
    estimatedTime: '12-24 hours',
    category: 'Web App',
    color: 'accent-blue'
  },
  {
    id: 'mobile-app',
    name: 'Mobile App',
    description: 'Native mobile application with modern UI and API integration',
    agents: ['mobile-app-builder', 'ui-designer', 'backend-architect', 'performance-benchmarker'],
    estimatedTime: '16-32 hours',
    category: 'Mobile',
    color: 'accent-green'
  },
  {
    id: 'ai-powered-tool',
    name: 'AI-Powered Tool',
    description: 'Intelligent application with AI/ML features and smart automation',
    agents: ['ai-engineer', 'frontend-developer', 'backend-architect', 'ui-designer'],
    estimatedTime: '20-40 hours',
    category: 'AI/ML',
    color: 'accent-purple'
  },
  {
    id: 'marketing-website',
    name: 'Marketing Website',
    description: 'Conversion-optimized marketing site with SEO and analytics',
    agents: ['frontend-developer', 'ui-designer', 'content-creator', 'seo-optimizer'],
    estimatedTime: '8-16 hours',
    category: 'Marketing',
    color: 'accent-orange'
  }
];

export const chatMessages = [
  {
    id: 1,
    type: 'ai',
    content: 'Hi! I\'m your AI workflow designer. Describe the app you want to build and I\'ll suggest the perfect team of agents.',
    timestamp: new Date()
  },
  {
    id: 2,
    type: 'user',
    content: 'I want to build a task management app with team collaboration features',
    timestamp: new Date()
  },
  {
    id: 3,
    type: 'ai',
    content: 'Great idea! For a task management app with team collaboration, I recommend this agent team:\n\n• **Rapid Prototyper** - Build core task management features\n• **Frontend Developer** - Create collaborative UI\n• **Backend Architect** - Design real-time sync system\n• **UI Designer** - Optimize user experience\n• **Test Writer & Fixer** - Ensure reliability\n\nShould I add these agents to your canvas?',
    timestamp: new Date()
  }
];

export const executionSteps = [
  { id: 1, name: 'Analyzing Requirements', status: 'completed', agent: 'system', duration: '30s' },
  { id: 2, name: 'Setting up Project Structure', status: 'completed', agent: 'rapid-prototyper', duration: '2m' },
  { id: 3, name: 'Designing Database Schema', status: 'running', agent: 'backend-architect', duration: '1m 45s' },
  { id: 4, name: 'Creating UI Components', status: 'pending', agent: 'frontend-developer', duration: '0s' },
  { id: 5, name: 'Implementing Authentication', status: 'pending', agent: 'backend-architect', duration: '0s' },
  { id: 6, name: 'Testing & Quality Assurance', status: 'pending', agent: 'test-writer-fixer', duration: '0s' }
];