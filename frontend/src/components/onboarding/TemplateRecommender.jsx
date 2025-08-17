import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  CheckCircle, 
  Code, 
  Users,
  Zap,
  Clock,
  ArrowRight,
  Star,
  GitBranch,
  Target,
  Brain,
  Rocket
} from 'lucide-react';

import useOnboardingStore from '../../stores/onboardingStore';

const TemplateRecommender = ({ onComplete, onSkip }) => {
  const {
    onboardingState,
    selectTemplate,
    setRecommendedTemplates
  } = useOnboardingStore();

  const [selectedTemplate, setSelectedTemplate] = useState(onboardingState.selectedTemplate);

  // Generate template recommendations based on collected data
  useEffect(() => {
    generateRecommendations();
  }, []);

  const generateRecommendations = () => {
    // Generate templates based on user's answers and analysis
    const recommendations = getTemplateRecommendations();
    setRecommendedTemplates(recommendations, 0.9);
  };

  const getTemplateRecommendations = () => {
    const context = {
      projectType: onboardingState.projectType,
      projectAnalysis: onboardingState.projectAnalysis,
      aiRecommendations: onboardingState.aiRecommendations,
      questionHistory: onboardingState.questionHistory,
      hasClaudeCode: onboardingState.hasClaudeCode,
      workMode: onboardingState.workMode
    };

    // Base templates
    let templates = [
      {
        id: 'ai-guided',
        name: 'AI-Guided Development',
        subtitle: 'Let AI design your workflow',
        description: 'Start with a conversation and let our AI assistant create the perfect agent workflow for your specific needs.',
        icon: '🤖',
        gradient: 'from-purple-500 to-pink-500',
        confidence: 0.95,
        reasons: ['Based on your detailed answers', 'Fully personalized experience'],
        techStack: ['AI-recommended stack'],
        agents: ['Dynamically selected based on your needs'],
        benefits: [
          'Completely personalized',
          'AI-optimized workflow',
          'Learns from your preferences',
          'Adaptive to your project'
        ],
        timeEstimate: '2-5 minutes',
        complexity: 'Adaptive',
        recommended: true
      }
    ];

    // Add project-type specific templates
    if (context.projectType === 'new') {
      templates.push(
        {
          id: 'saas-starter',
          name: 'SaaS Starter',
          subtitle: 'Full-stack SaaS foundation',
          description: 'Complete SaaS application with authentication, payments, dashboard, and user management.',
          icon: '🚀',
          gradient: 'from-blue-500 to-cyan-500',
          confidence: 0.85,
          reasons: ['Great for new projects', 'Proven SaaS architecture'],
          techStack: ['React', 'Node.js', 'PostgreSQL', 'Stripe'],
          agents: ['rapid-prototyper', 'ui-designer', 'backend-architect', 'devops-automator'],
          benefits: [
            'Production-ready auth',
            'Payment integration',
            'Admin dashboard',
            'Scalable architecture'
          ],
          timeEstimate: '10-15 minutes',
          complexity: 'Intermediate'
        },
        {
          id: 'ai-app',
          name: 'AI-Powered Application',
          subtitle: 'Modern AI application',
          description: 'AI-first application with vector database, language models, and intelligent features.',
          icon: '🧠',
          gradient: 'from-green-500 to-teal-500',
          confidence: 0.80,
          reasons: ['AI-focused development', 'Modern tech stack'],
          techStack: ['Next.js', 'FastAPI', 'Pinecone', 'OpenAI'],
          agents: ['ai-engineer', 'frontend-developer', 'backend-architect'],
          benefits: [
            'Vector search ready',
            'AI model integration',
            'Smart features',
            'Future-proof stack'
          ],
          timeEstimate: '15-20 minutes',
          complexity: 'Advanced'
        }
      );
    } else {
      // Existing project templates
      templates.push(
        {
          id: 'enhancement-workflow',
          name: 'Project Enhancement',
          subtitle: 'Improve existing codebase',
          description: 'Optimize and enhance your existing project with code quality improvements and new features.',
          icon: '⚡',
          gradient: 'from-orange-500 to-red-500',
          confidence: 0.90,
          reasons: ['Perfect for existing projects', 'Code quality focus'],
          techStack: ['Your existing stack'],
          agents: ['backend-architect', 'test-writer-fixer', 'performance-benchmarker'],
          benefits: [
            'Code quality improvements',
            'Performance optimization',
            'Better test coverage',
            'Gradual enhancement'
          ],
          timeEstimate: '5-10 minutes',
          complexity: 'Beginner'
        },
        {
          id: 'modernization',
          name: 'Legacy Modernization',
          subtitle: 'Modernize your tech stack',
          description: 'Upgrade and modernize legacy code with modern patterns, tools, and best practices.',
          icon: '🔄',
          gradient: 'from-indigo-500 to-purple-500',
          confidence: 0.75,
          reasons: ['Legacy improvement', 'Modern patterns'],
          techStack: ['Modern alternatives to your current stack'],
          agents: ['backend-architect', 'frontend-developer', 'devops-automator'],
          benefits: [
            'Modern tech stack',
            'Improved maintainability',
            'Better performance',
            'Future-ready code'
          ],
          timeEstimate: '20-30 minutes',
          complexity: 'Advanced'
        }
      );
    }

    // Analyze user's answers to boost template scores
    const answers = context.questionHistory.map(h => h.answer.toLowerCase()).join(' ');
    
    // Boost AI template if user mentioned AI/ML
    if (answers.includes('ai') || answers.includes('machine learning') || answers.includes('intelligent')) {
      const aiTemplate = templates.find(t => t.id === 'ai-app');
      if (aiTemplate) aiTemplate.confidence += 0.1;
    }

    // Boost SaaS template if user mentioned subscription, users, etc.
    if (answers.includes('saas') || answers.includes('subscription') || answers.includes('users')) {
      const saasTemplate = templates.find(t => t.id === 'saas-starter');
      if (saasTemplate) saasTemplate.confidence += 0.1;
    }

    // Sort by confidence
    templates.sort((a, b) => b.confidence - a.confidence);

    return templates;
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    selectTemplate(template);
  };

  const handleContinue = () => {
    if (selectedTemplate) {
      onComplete?.();
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Sparkles size={32} className="text-white" />
        </div>
        <h2 className="text-4xl font-bold text-white mb-4">Perfect Templates Found! ✨</h2>
        <p className="text-white/80 text-lg max-w-3xl mx-auto">
          Based on your answers and project analysis, here are my top recommendations to get you started quickly.
        </p>
      </div>

      {/* Template Grid */}
      <div className="grid lg:grid-cols-2 gap-8">
        {onboardingState.recommendedTemplates.map((template) => (
          <div
            key={template.id}
            onClick={() => handleTemplateSelect(template)}
            className={`
              group relative p-8 rounded-3xl cursor-pointer transition-all duration-500
              hover:scale-105 hover:shadow-2xl backdrop-blur-sm border
              ${selectedTemplate?.id === template.id 
                ? 'bg-white/20 border-white/40 shadow-xl ring-2 ring-white/30' 
                : 'bg-white/10 border-white/20 hover:bg-white/15 hover:border-white/30'
              }
              ${template.recommended ? 'ring-2 ring-purple-400/50' : ''}
            `}
          >
            {/* Recommended Badge */}
            {template.recommended && (
              <div className="absolute -top-3 -right-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-1">
                <Star size={14} />
                Recommended
              </div>
            )}

            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${template.gradient} opacity-10 rounded-3xl`}></div>
            
            {/* Selection Indicator */}
            {selectedTemplate?.id === template.id && (
              <div className="absolute top-6 right-6">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <CheckCircle size={20} className="text-green-500" />
                </div>
              </div>
            )}

            <div className="relative z-10">
              {/* Icon and Title */}
              <div className="flex items-start gap-6 mb-6">
                <div className="text-6xl">{template.icon}</div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-2">{template.name}</h3>
                  <p className="text-lg text-white/80 font-medium">{template.subtitle}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="px-2 py-1 bg-green-500/30 text-green-200 text-xs rounded-lg">
                      {Math.round(template.confidence * 100)}% match
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-white/70 mb-6 leading-relaxed">
                {template.description}
              </p>

              {/* Why Recommended */}
              <div className="mb-6">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Brain size={16} />
                  Why this fits:
                </h4>
                <div className="space-y-1">
                  {template.reasons.map((reason, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-white/80 text-sm">
                      <div className="w-1.5 h-1.5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"></div>
                      {reason}
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/10 rounded-xl p-3 border border-white/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock size={14} className="text-white/60" />
                    <span className="text-white/80 text-sm font-medium">Setup Time</span>
                  </div>
                  <div className="text-white text-sm">{template.timeEstimate}</div>
                </div>
                <div className="bg-white/10 rounded-xl p-3 border border-white/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Target size={14} className="text-white/60" />
                    <span className="text-white/80 text-sm font-medium">Complexity</span>
                  </div>
                  <div className="text-white text-sm">{template.complexity}</div>
                </div>
              </div>

              {/* Tech Stack */}
              <div className="mb-6">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Code size={16} />
                  Tech Stack:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {template.techStack.map((tech, idx) => (
                    <span key={idx} className="px-2 py-1 bg-white/20 text-white/90 text-xs rounded-lg border border-white/20">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* AI Agents */}
              <div className="mb-6">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Users size={16} />
                  AI Agents:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {template.agents.map((agent, idx) => (
                    <span key={idx} className="px-2 py-1 bg-blue-500/30 text-blue-100 text-xs rounded-lg border border-blue-400/30">
                      {agent}
                    </span>
                  ))}
                </div>
              </div>

              {/* Benefits */}
              <div className="mb-6">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Zap size={16} />
                  Key Benefits:
                </h4>
                <div className="grid grid-cols-2 gap-1">
                  {template.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-white/80 text-sm">
                      <div className="w-1.5 h-1.5 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"></div>
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleTemplateSelect(template);
                }}
                className={`
                  w-full py-3 px-6 rounded-xl font-medium transition-all duration-300
                  flex items-center justify-center gap-2
                  ${selectedTemplate?.id === template.id
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg'
                    : `bg-gradient-to-r ${template.gradient} hover:scale-105 text-white shadow-lg hover:shadow-xl`
                  }
                `}
              >
                {selectedTemplate?.id === template.id ? (
                  <>
                    <CheckCircle size={18} />
                    Selected
                  </>
                ) : (
                  <>
                    Choose Template
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-center mt-12">
        <div className="flex gap-4">
          <button
            onClick={() => onSkip?.('template-skipped')}
            className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
          >
            Skip Templates
          </button>
          
          <button
            onClick={handleContinue}
            disabled={!selectedTemplate}
            className={`
              px-8 py-4 rounded-xl font-medium transition-all duration-300
              flex items-center gap-2
              ${selectedTemplate
                ? 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white hover:scale-105 shadow-lg hover:shadow-xl'
                : 'bg-gray-600/50 text-gray-300 cursor-not-allowed'
              }
            `}
          >
            Complete Setup
            <Rocket size={20} />
          </button>
        </div>
      </div>

      {/* Template Explanation */}
      <div className="mt-12 text-center">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-3 justify-center">
            <GitBranch size={20} className="text-blue-300" />
            <h3 className="text-lg font-semibold text-white">What happens next?</h3>
          </div>
          <p className="text-white/80 leading-relaxed">
            Once you select a template, I'll create a customized AI agent workflow based on your choices. 
            You can always modify the workflow, add more agents, or switch templates later.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TemplateRecommender;