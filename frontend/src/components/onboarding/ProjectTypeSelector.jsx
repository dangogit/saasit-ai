import React, { useState } from 'react';
import { 
  Rocket, 
  FolderOpen, 
  ArrowRight,
  Sparkles,
  Code,
  GitBranch,
  Users,
  Zap,
  Star,
  Clock,
  CheckCircle
} from 'lucide-react';

import useOnboardingStore from '../../stores/onboardingStore';

const ProjectTypeSelector = ({ onComplete, onSkip }) => {
  const { 
    onboardingState, 
    setProjectType, 
    updateProjectInfo 
  } = useOnboardingStore();
  
  const [selectedType, setSelectedType] = useState(onboardingState.projectType);
  const [projectName, setProjectName] = useState(onboardingState.projectName || '');
  const [showNameInput, setShowNameInput] = useState(false);

  const projectTypes = [
    {
      id: 'new',
      title: 'New Project',
      subtitle: 'Start fresh with AI agents',
      description: 'Create a brand new project from scratch with our AI team guiding you through every step.',
      icon: Rocket,
      gradient: 'from-blue-500 to-cyan-500',
      features: [
        'AI-powered project setup',
        'Template recommendations',
        'Architecture guidance',
        'Best practices included'
      ],
      benefits: [
        'Zero boilerplate setup',
        'Proven project structure',
        'Integrated AI workflow',
        'Production-ready foundation'
      ],
      timeEstimate: '5-15 minutes',
      complexity: 'Beginner friendly'
    },
    {
      id: 'existing',
      title: 'Existing Project',
      subtitle: 'Enhance what you have',
      description: 'Analyze your current codebase and get AI agents to help improve, scale, or add new features.',
      icon: FolderOpen,
      gradient: 'from-purple-500 to-pink-500',
      features: [
        'Codebase analysis',
        'CLAUDE.md integration',
        'Technology detection',
        'Incremental improvements'
      ],
      benefits: [
        'Preserve existing work',
        'Gradual enhancement',
        'Code quality insights',
        'Smart agent recommendations'
      ],
      timeEstimate: '3-10 minutes',
      complexity: 'Any skill level'
    }
  ];

  const handleTypeSelection = (type) => {
    setSelectedType(type);
    setProjectType(type);
    
    if (type === 'new') {
      setShowNameInput(true);
    } else {
      // For existing projects, we can proceed immediately
      handleContinue();
    }
  };

  const handleContinue = () => {
    if (selectedType === 'new' && projectName.trim()) {
      updateProjectInfo({ projectName: projectName.trim() });
    }
    
    onComplete?.();
  };

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (projectName.trim()) {
      handleContinue();
    }
  };

  if (showNameInput && selectedType === 'new') {
    return (
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Rocket size={32} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">What's your project name?</h2>
          <p className="text-white/80 text-lg">
            Give your amazing project a name that inspires you
          </p>
        </div>

        <form onSubmit={handleNameSubmit} className="space-y-6">
          <div className="relative">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g., My Awesome SaaS"
              className="w-full px-6 py-4 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg text-white placeholder-white/60 transition-all duration-300"
              autoFocus
              required
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

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setShowNameInput(false)}
              className="flex-1 px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={!projectName.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2 justify-center"
            >
              Continue
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-white mb-4">What type of project are you working on?</h2>
        <p className="text-white/80 text-lg max-w-3xl mx-auto">
          Choose your path and we'll customize the AI experience for your specific needs
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {projectTypes.map((type) => (
          <div
            key={type.id}
            onClick={() => handleTypeSelection(type.id)}
            className={`
              group relative p-8 rounded-3xl cursor-pointer transition-all duration-500
              hover:scale-105 hover:shadow-2xl backdrop-blur-sm border
              ${selectedType === type.id 
                ? 'bg-white/20 border-white/40 shadow-xl ring-2 ring-white/30' 
                : 'bg-white/10 border-white/20 hover:bg-white/15 hover:border-white/30'
              }
            `}
          >
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${type.gradient} opacity-10 rounded-3xl`}></div>
            
            {/* Selection Indicator */}
            {selectedType === type.id && (
              <div className="absolute top-6 right-6">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <CheckCircle size={20} className="text-green-500" />
                </div>
              </div>
            )}

            <div className="relative z-10">
              {/* Icon and Title */}
              <div className="flex items-start gap-6 mb-6">
                <div className={`w-16 h-16 bg-gradient-to-br ${type.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <type.icon size={32} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-2">{type.title}</h3>
                  <p className="text-lg text-white/80 font-medium">{type.subtitle}</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-white/70 mb-6 leading-relaxed">
                {type.description}
              </p>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/10 rounded-xl p-3 border border-white/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock size={14} className="text-white/60" />
                    <span className="text-white/80 text-sm font-medium">Time</span>
                  </div>
                  <div className="text-white text-sm">{type.timeEstimate}</div>
                </div>
                <div className="bg-white/10 rounded-xl p-3 border border-white/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Users size={14} className="text-white/60" />
                    <span className="text-white/80 text-sm font-medium">Level</span>
                  </div>
                  <div className="text-white text-sm">{type.complexity}</div>
                </div>
              </div>

              {/* Features */}
              <div className="mb-6">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Code size={16} />
                  What you get:
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {type.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-white/80 text-sm">
                      <div className="w-1.5 h-1.5 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"></div>
                      {feature}
                    </div>
                  ))}
                </div>
              </div>

              {/* Benefits */}
              <div className="mb-6">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Zap size={16} />
                  Key benefits:
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {type.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-white/80 text-sm">
                      <div className="w-1.5 h-1.5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"></div>
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleTypeSelection(type.id);
                }}
                className={`
                  w-full py-3 px-6 rounded-xl font-medium transition-all duration-300
                  flex items-center justify-center gap-2
                  ${selectedType === type.id
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg'
                    : `bg-gradient-to-r ${type.gradient} hover:scale-105 text-white shadow-lg hover:shadow-xl`
                  }
                `}
              >
                {selectedType === type.id ? (
                  <>
                    <CheckCircle size={18} />
                    Selected
                  </>
                ) : (
                  <>
                    Choose {type.title}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison Note */}
      <div className="mt-12 text-center">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-3 justify-center">
            <GitBranch size={20} className="text-blue-300" />
            <h3 className="text-lg font-semibold text-white">Not sure which to choose?</h3>
          </div>
          <p className="text-white/80 leading-relaxed">
            <strong>New Project</strong> is perfect if you're starting from scratch and want AI to guide your architecture decisions. 
            <strong> Existing Project</strong> is ideal if you already have code and want AI to help enhance, refactor, or add features.
          </p>
          <div className="mt-4 text-white/60 text-sm">
            You can always change this later or work on multiple projects
          </div>
        </div>
      </div>

      {/* Continue Button for Existing Projects */}
      {selectedType === 'existing' && (
        <div className="flex justify-center mt-8">
          <button
            onClick={handleContinue}
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            Continue with Existing Project
            <ArrowRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ProjectTypeSelector;