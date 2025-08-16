import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle, 
  Rocket, 
  FolderOpen, 
  Github,
  ExternalLink,
  Brain,
  Zap,
  ChevronRight,
  Loader,
  MessageSquare,
  Star,
  Users,
  Code,
  Sparkles
} from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import GitHubConnector from './GitHubConnector';
import ProjectAnalyzer from './ProjectAnalyzer';

const ProjectSetupFlow = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  
  // Get project type from navigation state or URL params
  const projectType = location.state?.projectType || 
                     new URLSearchParams(location.search).get('type') || 
                     'new';
  
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [githubToken, setGithubToken] = useState(null);
  const [projectAnalysis, setProjectAnalysis] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [skippedGitHub, setSkippedGitHub] = useState(false);

  // Template options for new projects
  const templates = [
    {
      id: 'choose-later',
      name: 'Choose Later',
      description: 'Start with a conversation and build as we go',
      icon: '💬',
      gradient: 'from-purple-500 to-pink-500',
      techStack: ['Ask our AI assistant'],
      agents: ['Let AI recommend'],
      isSpecial: true,
      benefits: ['AI-guided setup', 'Personalized recommendations', 'Learn as you build']
    },
    {
      id: 'saas-starter',
      name: 'SaaS Starter',
      description: 'Full-stack SaaS with auth, payments, and dashboard',
      icon: '🚀',
      gradient: 'from-blue-500 to-cyan-500',
      techStack: ['React', 'Node.js', 'PostgreSQL', 'Stripe'],
      agents: ['rapid-prototyper', 'ui-designer', 'backend-architect', 'devops-automator'],
      benefits: ['Production-ready auth', 'Payment integration', 'Admin dashboard']
    },
    {
      id: 'ai-app',
      name: 'AI-Powered App',
      description: 'Modern AI application with vector database',
      icon: '🤖',
      gradient: 'from-green-500 to-teal-500',
      techStack: ['Next.js', 'FastAPI', 'Pinecone', 'OpenAI'],
      agents: ['ai-engineer', 'frontend-developer', 'backend-architect'],
      benefits: ['Vector search', 'AI model integration', 'Smart features']
    },
    {
      id: 'mobile-first',
      name: 'Mobile-First PWA',
      description: 'Progressive Web App optimized for mobile',
      icon: '📱',
      gradient: 'from-orange-500 to-red-500',
      techStack: ['React Native', 'Expo', 'Firebase'],
      agents: ['mobile-app-builder', 'ui-designer', 'performance-optimizer'],
      benefits: ['Native feel', 'Offline support', 'App store ready']
    },
    {
      id: 'e-commerce',
      name: 'E-commerce Store',
      description: 'Complete online store with cart and checkout',
      icon: '🛒',
      gradient: 'from-indigo-500 to-purple-500',
      techStack: ['Next.js', 'Stripe', 'Prisma', 'Vercel'],
      agents: ['frontend-developer', 'backend-architect', 'ui-designer', 'test-writer-fixer'],
      benefits: ['Shopping cart', 'Payment processing', 'Inventory management']
    },
    {
      id: 'blank',
      name: 'Blank Canvas',
      description: 'Start from scratch with full control',
      icon: '🎨',
      gradient: 'from-gray-500 to-slate-600',
      techStack: ['Your choice'],
      agents: ['rapid-prototyper', 'ui-designer', 'backend-architect'],
      benefits: ['Complete freedom', 'Custom architecture', 'No constraints']
    }
  ];

  const steps = projectType === 'new' 
    ? [
        { id: 1, title: 'Project Details', icon: Rocket },
        { id: 2, title: 'Choose Template', icon: FolderOpen },
        { id: 3, title: 'Ready to Build', icon: CheckCircle }
      ]
    : [
        { id: 1, title: 'Connect Repository', icon: Github },
        { id: 2, title: 'Analyze Project', icon: Brain },
        { id: 3, title: 'Ready to Enhance', icon: CheckCircle }
      ];

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate('/');
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      // Skip analysis step if GitHub was skipped
      if (projectType === 'existing' && currentStep === 1 && skippedGitHub) {
        setCurrentStep(3); // Skip to final step
      } else {
        setCurrentStep(currentStep + 1);
      }
    } else {
      // Navigate to WorkflowDesigner with project context
      const projectContext = projectType === 'new' 
        ? {
            type: 'new',
            name: projectName,
            template: selectedTemplate
          }
        : {
            type: 'existing',
            repository: selectedRepo,
            analysis: projectAnalysis,
            skippedGitHub: skippedGitHub
          };
      
      navigate('/app', { state: { projectContext } });
    }
  };

  const handleSkipGitHub = () => {
    setSkippedGitHub(true);
    setSelectedRepo(null);
    setGithubToken(null);
    setProjectAnalysis(null);
  };

  const canProceed = () => {
    if (projectType === 'new') {
      switch (currentStep) {
        case 1: return projectName.trim().length > 0;
        case 2: return selectedTemplate !== null; // Allow proceeding with any template including "choose-later"
        case 3: return true;
        default: return false;
      }
    } else {
      switch (currentStep) {
        case 1: return selectedRepo !== null || skippedGitHub; // Allow proceeding if repo selected OR GitHub was skipped
        case 2: return projectAnalysis !== null || skippedGitHub; // Skip analysis if GitHub was skipped
        case 3: return true;
        default: return false;
      }
    }
  };

  const StepIndicator = ({ steps, currentStep }) => (
    <div className="flex items-center justify-center mb-16">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center">
            <div className={`
              w-16 h-16 rounded-full flex items-center justify-center
              transition-all duration-500 border-2 backdrop-blur-sm relative
              ${currentStep >= step.id 
                ? 'bg-gradient-to-br from-blue-400 to-purple-500 border-white/30 text-white shadow-lg' 
                : 'bg-white/10 border-white/20 text-white/60'
              }
            `}>
              <step.icon size={24} />
              {currentStep >= step.id && (
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 opacity-20 animate-pulse"></div>
              )}
            </div>
            <span className={`
              text-sm mt-3 font-medium transition-all duration-300
              ${currentStep >= step.id ? 'text-white' : 'text-white/60'}
            `}>
              {step.title}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={`
              w-20 h-1 mx-6 mt-8 rounded-full transition-all duration-500
              ${currentStep > step.id 
                ? 'bg-gradient-to-r from-blue-400 to-purple-500' 
                : 'bg-white/20'
              }
            `} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderNewProjectStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Rocket size={32} className="text-white" />
              </div>
              <h2 className="text-4xl font-bold text-white mb-4">What's your project name?</h2>
              <p className="text-white/80 text-lg">
                Give your amazing project a name that inspires you
              </p>
            </div>
            <div className="space-y-6">
              <div className="relative">
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., My Awesome SaaS"
                  className="w-full px-6 py-4 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg text-white placeholder-white/60 transition-all duration-300"
                  autoFocus
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <Sparkles size={20} className="text-white/60" />
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <p className="text-white/80 text-sm flex items-center gap-2">
                  <Star size={16} className="text-yellow-400" />
                  Don't worry, you can change this later. This helps us personalize your experience.
                </p>
              </div>
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <FolderOpen size={32} className="text-white" />
              </div>
              <h2 className="text-4xl font-bold text-white mb-4">Choose your starting point</h2>
              <p className="text-white/80 text-lg max-w-2xl mx-auto">
                Pick a template to get started quickly, or choose to let our AI guide you through a personalized setup
              </p>
            </div>
            
            <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-6">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`
                    group relative p-6 rounded-2xl cursor-pointer transition-all duration-300
                    hover:scale-105 hover:shadow-2xl backdrop-blur-sm border
                    ${selectedTemplate?.id === template.id 
                      ? 'bg-white/20 border-white/40 shadow-xl' 
                      : 'bg-white/10 border-white/20 hover:bg-white/15 hover:border-white/30'
                    }
                    ${template.isSpecial ? 'ring-2 ring-purple-400/50' : ''}
                  `}
                >
                  {/* Special Badge for "Choose Later" */}
                  {template.isSpecial && (
                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                      Recommended
                    </div>
                  )}
                  
                  {/* Gradient Background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${template.gradient} opacity-10 rounded-2xl`}></div>
                  
                  <div className="relative z-10">
                    <div className="text-5xl mb-4">{template.icon}</div>
                    <h3 className="text-xl font-semibold mb-3 text-white">{template.name}</h3>
                    <p className="text-white/80 mb-4 leading-relaxed">{template.description}</p>
                    
                    <div className="space-y-4">
                      <div>
                        <span className="text-sm font-medium text-white/90 flex items-center gap-2">
                          <Code size={14} />
                          Tech Stack:
                        </span>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.techStack.map((tech, idx) => (
                            <span key={idx} className="px-2 py-1 bg-white/20 text-white/90 text-xs rounded-lg backdrop-blur-sm border border-white/20">
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-sm font-medium text-white/90 flex items-center gap-2">
                          <Users size={14} />
                          AI Agents:
                        </span>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Array.isArray(template.agents) ? template.agents.map((agent, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-500/30 text-blue-100 text-xs rounded-lg backdrop-blur-sm border border-blue-400/30">
                              {agent}
                            </span>
                          )) : (
                            <span className="px-2 py-1 bg-purple-500/30 text-purple-100 text-xs rounded-lg backdrop-blur-sm border border-purple-400/30">
                              {template.agents}
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-sm font-medium text-white/90 flex items-center gap-2">
                          <Zap size={14} />
                          Key Benefits:
                        </span>
                        <div className="mt-2 space-y-1">
                          {template.benefits.map((benefit, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs text-white/80">
                              <div className="w-1 h-1 bg-white/60 rounded-full"></div>
                              {benefit}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Selection Indicator */}
                    {selectedTemplate?.id === template.id && (
                      <div className="absolute top-4 right-4">
                        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                          <CheckCircle size={16} className="text-green-500" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="max-w-lg mx-auto text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
              <CheckCircle size={40} className="text-white" />
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">Ready to build!</h2>
            <p className="text-white/80 text-lg mb-8 leading-relaxed">
              Your project "{projectName}" is set up{selectedTemplate?.id !== 'choose-later' ? ` with the ${selectedTemplate?.name} template` : ' and ready for AI-guided development'}.
              {selectedTemplate?.id === 'choose-later' 
                ? " Our AI assistant will help you design the perfect team through conversation."
                : " Let's start building with your AI team!"
              }
            </p>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 mb-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white/90 flex items-center gap-2">
                    <Rocket size={16} />
                    Project:
                  </span>
                  <span className="text-white font-semibold">{projectName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white/90 flex items-center gap-2">
                    <FolderOpen size={16} />
                    Template:
                  </span>
                  <span className="text-white font-semibold">{selectedTemplate?.name}</span>
                </div>
                {selectedTemplate?.id !== 'choose-later' && (
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white/90 flex items-center gap-2">
                      <Users size={16} />
                      Agents:
                    </span>
                    <span className="text-white font-semibold">{selectedTemplate?.agents?.length || 0}</span>
                  </div>
                )}
              </div>
            </div>

            {selectedTemplate?.id === 'choose-later' && (
              <div className="bg-purple-500/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-400/30">
                <div className="flex items-center gap-3 mb-3">
                  <MessageSquare size={20} className="text-purple-300" />
                  <h3 className="text-lg font-semibold text-white">What happens next?</h3>
                </div>
                <p className="text-white/90 text-sm leading-relaxed">
                  You'll start with our AI assistant who will ask you questions about your project goals, 
                  preferences, and requirements. Based on your answers, we'll recommend the perfect AI agents 
                  and help you build exactly what you envision.
                </p>
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  const renderExistingProjectStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Github size={32} className="text-white" />
              </div>
              <h2 className="text-4xl font-bold text-white mb-4">Connect your repository</h2>
              <p className="text-white/80 text-lg max-w-2xl mx-auto">
                Connect your GitHub repository so our AI can analyze your code and suggest the perfect enhancement team
              </p>
            </div>
            <GitHubConnector 
              onRepoSelected={(repo, token) => {
                setSelectedRepo(repo);
                setGithubToken(token);
                setSkippedGitHub(false); // Reset skip state if repo is selected
              }}
              selectedRepo={selectedRepo}
              onSkip={handleSkipGitHub}
            />
          </div>
        );
      
      case 2:
        return (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8">Analyzing your project</h2>
            {selectedRepo && githubToken ? (
              <ProjectAnalyzer
                selectedRepo={selectedRepo}
                githubToken={githubToken}
                onAnalysisComplete={(analysis) => setProjectAnalysis(analysis)}
              />
            ) : (
              <div className="text-center">
                <Loader className="animate-spin mx-auto mb-4" size={32} />
                <p>Setting up analysis...</p>
              </div>
            )}
          </div>
        );
      
      case 3:
        return (
          <div className="max-w-lg mx-auto text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
              <CheckCircle size={32} className="text-white" />
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">Ready to enhance!</h2>
            <p className="text-white/80 text-lg mb-8 leading-relaxed">
              {skippedGitHub 
                ? "You can always connect GitHub later. Let's start building with AI agents!"
                : "Your project has been analyzed. Let's build AI agents to enhance your codebase!"
              }
            </p>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 mb-8">
              <div className="space-y-4">
                {!skippedGitHub && selectedRepo && (
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white/90 flex items-center gap-2">
                      <Github size={16} />
                      Repository:
                    </span>
                    <span className="text-white font-semibold">{selectedRepo.name}</span>
                  </div>
                )}
                {projectAnalysis?.primary_technology && (
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white/90 flex items-center gap-2">
                      <Code size={16} />
                      Main Tech:
                    </span>
                    <span className="text-white font-semibold">{projectAnalysis.primary_technology}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white/90 flex items-center gap-2">
                    <Users size={16} />
                    {skippedGitHub ? 'Available Agents:' : 'Recommended Agents:'}
                  </span>
                  <span className="text-white font-semibold">
                    {skippedGitHub ? '40+' : (projectAnalysis?.recommended_agents?.length || '40+')}
                  </span>
                </div>
              </div>
            </div>

            {skippedGitHub && (
              <div className="bg-blue-500/20 backdrop-blur-sm rounded-2xl p-6 border border-blue-400/30">
                <div className="flex items-center gap-3 mb-3">
                  <Github size={20} className="text-blue-300" />
                  <h3 className="text-lg font-semibold text-white">Connect GitHub anytime</h3>
                </div>
                <p className="text-white/90 text-sm leading-relaxed">
                  You can connect your GitHub repository later from the main app to get personalized 
                  agent recommendations and code analysis. For now, explore our full library of AI agents!
                </p>
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(120,119,198,0.3),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_40%,rgba(120,119,198,0.2),transparent_50%)]"></div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-48 h-48 bg-purple-400/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-1/2 left-10 w-24 h-24 bg-pink-400/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '4s' }}></div>

      {/* Header */}
      <header className="relative z-10 backdrop-blur-sm bg-white/10 border-b border-white/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200 text-white/80 hover:text-white"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="font-mono text-xl font-bold text-white">SaasIt.ai</div>
            </div>
            
            <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm text-white/90 border border-white/30">
              {projectType === 'new' ? '🚀 New Project Setup' : '📂 Existing Project Setup'}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 py-12">
        <StepIndicator steps={steps} currentStep={currentStep} />
        
        <div className="min-h-[500px] flex items-center justify-center">
          {projectType === 'new' ? renderNewProjectStep() : renderExistingProjectStep()}
        </div>
        
        {/* Navigation */}
        <div className="flex justify-between items-center mt-12">
          <button
            onClick={handleBack}
            className="px-6 py-3 text-white/80 hover:text-white transition-all duration-200 hover:bg-white/10 rounded-lg backdrop-blur-sm"
          >
            Back
          </button>
          
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={`
              px-8 py-3 rounded-xl font-medium transition-all duration-300
              flex items-center gap-2 backdrop-blur-sm border
              ${canProceed()
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-white/30 hover:scale-105 shadow-lg hover:shadow-xl'
                : 'bg-gray-600/50 text-gray-300 cursor-not-allowed border-gray-500/30'
              }
            `}
          >
            {currentStep === steps.length ? 'Start Building' : 'Continue'}
            <ChevronRight size={16} />
          </button>
        </div>
      </main>
    </div>
  );
};

export default ProjectSetupFlow;