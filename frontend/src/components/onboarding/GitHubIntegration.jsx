import React, { useState, useEffect } from 'react';
import { 
  Github, 
  CheckCircle, 
  XCircle,
  Globe,
  Monitor,
  Cloud,
  Shield,
  ArrowRight,
  Plus,
  FolderOpen,
  Settings,
  Users,
  Lock,
  Eye,
  Clock,
  AlertCircle
} from 'lucide-react';

import useOnboardingStore from '../../stores/onboardingStore';
import GitHubConnector from '../GitHubConnector';

const GitHubIntegration = ({ onComplete, onSkip }) => {
  const {
    onboardingState,
    setGitHubStatus,
    setGitHubConnection,
    setSelectedRepo,
    setRepoPreference,
    setWorkMode,
    setProjectAnalysis,
    updateProjectInfo
  } = useOnboardingStore();

  const [currentView, setCurrentView] = useState('choice'); // 'choice' | 'connect' | 'create' | 'local'
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Check if user already made choices
  useEffect(() => {
    if (onboardingState.repoCreationPreference && onboardingState.workMode) {
      // User has already made choices, proceed accordingly
      if (onboardingState.repoCreationPreference === 'local-only') {
        setCurrentView('local');
      } else if (onboardingState.repoCreationPreference === 'create') {
        setCurrentView('create');
      } else {
        setCurrentView('connect');
      }
    }
  }, [onboardingState.repoCreationPreference, onboardingState.workMode]);

  const workModeOptions = [
    {
      id: 'cloud',
      title: 'Cloud Development',
      subtitle: 'GitHub + Cloud Execution',
      description: 'Run AI agents in the cloud with automatic GitHub integration',
      icon: Cloud,
      gradient: 'from-blue-500 to-cyan-500',
      features: [
        'Automatic GitHub syncing',
        'Cloud-based execution',
        'Collaboration ready',
        'No local setup required'
      ],
      benefits: [
        'Works on any device',
        'Team collaboration',
        'Automatic backups',
        'Scalable resources'
      ],
      timeEstimate: '2-5 minutes',
      complexity: 'Easiest'
    },
    {
      id: 'hybrid',
      title: 'Hybrid Development',
      subtitle: 'Local + GitHub Sync',
      description: 'Develop locally with GitHub backup and optional cloud features',
      icon: Monitor,
      gradient: 'from-purple-500 to-pink-500',
      features: [
        'Local development speed',
        'GitHub backup & sync',
        'Cloud execution option',
        'Full control & privacy'
      ],
      benefits: [
        'Best of both worlds',
        'Flexible execution',
        'Version control',
        'Privacy + collaboration'
      ],
      timeEstimate: '3-8 minutes',
      complexity: 'Intermediate'
    },
    {
      id: 'local',
      title: 'Local Only',
      subtitle: 'Maximum Privacy',
      description: 'Work entirely on your machine with optional GitHub connection later',
      icon: Shield,
      gradient: 'from-green-500 to-emerald-500',
      features: [
        'Complete privacy',
        'No cloud dependencies',
        'Local execution only',
        'Connect GitHub later'
      ],
      benefits: [
        'Maximum security',
        'No internet required',
        'Full data control',
        'Enterprise compliant'
      ],
      timeEstimate: '1-3 minutes',
      complexity: 'Advanced'
    }
  ];

  const repoOptions = [
    {
      id: 'connect',
      title: 'Connect Existing Repository',
      subtitle: 'Enhance your current project',
      description: 'Connect an existing GitHub repository to analyze and enhance with AI agents',
      icon: FolderOpen,
      gradient: 'from-blue-500 to-purple-500',
      condition: () => onboardingState.projectType === 'existing'
    },
    {
      id: 'create',
      title: 'Create New Repository',
      subtitle: 'Fresh start with best practices',
      description: 'Create a new GitHub repository with AI-optimized structure and workflows',
      icon: Plus,
      gradient: 'from-green-500 to-teal-500',
      condition: () => onboardingState.projectType === 'new'
    },
    {
      id: 'local-only',
      title: 'Work Locally Only',
      subtitle: 'No GitHub needed right now',
      description: 'Skip GitHub integration and work locally. You can connect a repository later',
      icon: Monitor,
      gradient: 'from-gray-500 to-slate-600',
      condition: () => true
    }
  ];

  const handleWorkModeSelection = (mode) => {
    setWorkMode(mode);
    
    if (mode === 'local') {
      setRepoPreference('local-only');
      setGitHubStatus(false);
      setCurrentView('local');
    } else {
      setGitHubStatus(true);
      setCurrentView('choice');
    }
  };

  const handleRepoOptionSelection = (option) => {
    setRepoPreference(option);
    
    if (option === 'local-only') {
      setWorkMode('local');
      setCurrentView('local');
    } else {
      setCurrentView(option);
    }
  };

  const handleRepoSelected = (repo, token, analysis = null) => {
    setSelectedRepo(repo);
    setGitHubConnection(true, token);
    
    if (analysis) {
      setProjectAnalysis(analysis);
    }
    
    updateProjectInfo({ 
      githubConnected: true,
      selectedRepo: repo
    });
    
    onComplete?.();
  };

  const handleLocalOnlyComplete = () => {
    setGitHubStatus(false);
    setGitHubConnection(false);
    setWorkMode('local');
    setRepoPreference('local-only');
    
    updateProjectInfo({
      githubConnected: false,
      workMode: 'local'
    });
    
    onComplete?.();
  };

  const renderWorkModeSelection = () => (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-white mb-4">How would you like to work?</h2>
        <p className="text-white/80 text-lg max-w-3xl mx-auto">
          Choose your preferred development environment. You can change this later.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {workModeOptions.map((mode) => (
          <div
            key={mode.id}
            onClick={() => handleWorkModeSelection(mode.id)}
            className="group relative p-8 rounded-3xl cursor-pointer transition-all duration-500 hover:scale-105 hover:shadow-2xl backdrop-blur-sm border bg-white/10 border-white/20 hover:bg-white/15 hover:border-white/30"
          >
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${mode.gradient} opacity-10 rounded-3xl`}></div>
            
            <div className="relative z-10">
              {/* Icon and Title */}
              <div className="flex items-start gap-6 mb-6">
                <div className={`w-16 h-16 bg-gradient-to-br ${mode.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <mode.icon size={32} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-2">{mode.title}</h3>
                  <p className="text-lg text-white/80 font-medium">{mode.subtitle}</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-white/70 mb-6 leading-relaxed">
                {mode.description}
              </p>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/10 rounded-xl p-3 border border-white/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock size={14} className="text-white/60" />
                    <span className="text-white/80 text-sm font-medium">Setup Time</span>
                  </div>
                  <div className="text-white text-sm">{mode.timeEstimate}</div>
                </div>
                <div className="bg-white/10 rounded-xl p-3 border border-white/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Users size={14} className="text-white/60" />
                    <span className="text-white/80 text-sm font-medium">Complexity</span>
                  </div>
                  <div className="text-white text-sm">{mode.complexity}</div>
                </div>
              </div>

              {/* Features */}
              <div className="mb-6">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Settings size={16} />
                  Features:
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {mode.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-white/80 text-sm">
                      <div className="w-1.5 h-1.5 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"></div>
                      {feature}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleWorkModeSelection(mode.id);
                }}
                className={`w-full py-3 px-6 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 bg-gradient-to-r ${mode.gradient} hover:scale-105 text-white shadow-lg hover:shadow-xl`}
              >
                Choose {mode.title}
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRepoChoice = () => {
    const availableOptions = repoOptions.filter(option => option.condition());
    
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">GitHub Repository</h2>
          <p className="text-white/80 text-lg">
            {onboardingState.projectType === 'new' 
              ? 'Create a new repository or work locally for now'
              : 'Connect your existing repository or work locally'
            }
          </p>
        </div>

        <div className="grid gap-6">
          {availableOptions.map((option) => (
            <div
              key={option.id}
              onClick={() => handleRepoOptionSelection(option.id)}
              className="group relative p-6 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-105 backdrop-blur-sm border bg-white/10 border-white/20 hover:bg-white/15 hover:border-white/30"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${option.gradient} opacity-10 rounded-2xl`}></div>
              
              <div className="relative z-10 flex items-center gap-6">
                <div className={`w-14 h-14 bg-gradient-to-br ${option.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                  <option.icon size={24} className="text-white" />
                </div>
                
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">{option.title}</h3>
                  <p className="text-white/80 mb-2">{option.subtitle}</p>
                  <p className="text-white/60 text-sm">{option.description}</p>
                </div>
                
                <ArrowRight size={20} className="text-white/60 group-hover:text-white transition-colors" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => setCurrentView('mode')}
            className="text-white/60 hover:text-white/80 text-sm transition-colors"
          >
            ← Back to work mode selection
          </button>
        </div>
      </div>
    );
  };

  const renderGitHubConnector = () => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-4">
          {currentView === 'create' ? 'Create New Repository' : 'Connect Existing Repository'}
        </h2>
        <p className="text-white/80">
          {currentView === 'create' 
            ? 'Create a new GitHub repository for your project'
            : 'Select an existing repository to analyze and enhance'
          }
        </p>
      </div>

      <GitHubConnector
        onRepoSelected={handleRepoSelected}
        selectedRepo={onboardingState.selectedRepo}
        onSkip={() => handleRepoOptionSelection('local-only')}
      />

      <div className="mt-8 text-center">
        <button
          onClick={() => setCurrentView('choice')}
          className="text-white/60 hover:text-white/80 text-sm transition-colors"
        >
          ← Back to repository options
        </button>
      </div>
    </div>
  );

  const renderLocalOnly = () => (
    <div className="max-w-2xl mx-auto text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
        <Shield size={32} className="text-white" />
      </div>
      
      <h2 className="text-3xl font-bold text-white mb-4">Local Development Setup</h2>
      <p className="text-white/80 text-lg mb-8">
        Perfect! You'll work locally with maximum privacy and control.
      </p>

      <div className="bg-green-500/20 backdrop-blur-sm rounded-2xl p-6 border border-green-400/30 mb-8">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-green-100 mb-3 flex items-center gap-2">
              <Shield size={18} />
              Privacy & Security
            </h4>
            <ul className="text-green-200/90 text-sm space-y-1 text-left">
              <li>• All work stays on your machine</li>
              <li>• No cloud data storage</li>
              <li>• Enterprise-grade privacy</li>
              <li>• Air-gapped development option</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-green-100 mb-3 flex items-center gap-2">
              <Settings size={18} />
              What You Can Do
            </h4>
            <ul className="text-green-200/90 text-sm space-y-1 text-left">
              <li>• Design AI agent workflows</li>
              <li>• Generate project templates</li>
              <li>• Get architectural guidance</li>
              <li>• Connect GitHub anytime later</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-blue-500/20 backdrop-blur-sm rounded-xl p-4 border border-blue-400/30 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Github size={18} className="text-blue-300" />
          <span className="font-medium text-blue-100">Connect GitHub Later</span>
        </div>
        <p className="text-blue-200/80 text-sm">
          You can always connect a GitHub repository later from the main app for collaboration and backup.
        </p>
      </div>

      <div className="flex gap-4 justify-center">
        <button
          onClick={() => setCurrentView('choice')}
          className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
        >
          Back
        </button>
        
        <button
          onClick={handleLocalOnlyComplete}
          className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          Continue Locally
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );

  // Main render logic
  switch (currentView) {
    case 'mode':
      return renderWorkModeSelection();
    case 'choice':
      return renderRepoChoice();
    case 'connect':
    case 'create':
      return renderGitHubConnector();
    case 'local':
      return renderLocalOnly();
    default:
      // Default to work mode selection if no work mode is set
      if (!onboardingState.workMode) {
        return renderWorkModeSelection();
      }
      // Otherwise show repo choice
      return renderRepoChoice();
  }
};

export default GitHubIntegration;