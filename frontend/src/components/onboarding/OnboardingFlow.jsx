import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { 
  ArrowLeft, 
  ArrowRight,
  CheckCircle, 
  Clock,
  SkipForward,
  Sparkles,
  Users,
  Zap,
  Shield,
  Rocket
} from 'lucide-react';

import useOnboardingStore from '../../stores/onboardingStore';
import { useOnboardingPersistence } from '../../services/onboardingPersistence';
import ClaudeCodeDetector from './ClaudeCodeDetector';
import ProjectTypeSelector from './ProjectTypeSelector';
import GitHubIntegration from './GitHubIntegration';
import AIQuestionFlow from './AIQuestionFlow';
import ProjectAnalyzer from './ProjectAnalyzer';
import TemplateRecommender from './TemplateRecommender';
import OnboardingProgress from './OnboardingProgress';

const OnboardingFlow = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  
  const {
    onboardingState,
    setCurrentStep,
    skipCurrentStep,
    goToPreviousStep,
    goToNextStep,
    canProceedFromCurrentStep,
    getProgress,
    getStepStatus,
    startOnboarding,
    completeOnboarding,
    saveProgress,
    loadProgressFromClerk,
    setLoading,
    setError,
    clearError
  } = useOnboardingStore();

  const {
    saveProgress: saveToClerk,
    loadProgress: loadFromClerk,
    hasCompletedOnboarding,
    markComplete
  } = useOnboardingPersistence();

  const [showSkipConfirmation, setShowSkipConfirmation] = useState(false);
  const [skipReason, setSkipReason] = useState('');

  // Initialize onboarding and load saved progress
  useEffect(() => {
    const initializeOnboarding = async () => {
      if (!user) return;

      // Check if user has already completed onboarding
      if (hasCompletedOnboarding()) {
        // Redirect to main app if onboarding is complete
        navigate('/app', { replace: true });
        return;
      }

      // Try to load saved progress
      const savedProgress = await loadFromClerk();
      
      if (savedProgress) {
        // Load saved progress
        loadProgressFromClerk(savedProgress);
        setLoading(false);
      } else if (!onboardingState.onboardingStartTime) {
        // Start fresh onboarding
        startOnboarding();
      }
    };

    initializeOnboarding();
  }, [user, hasCompletedOnboarding, loadFromClerk, loadProgressFromClerk, startOnboarding, navigate, onboardingState.onboardingStartTime]);

  // Auto-save progress whenever state changes
  useEffect(() => {
    const saveProgressWithDelay = async () => {
      if (onboardingState.onboardingStartTime && user) {
        // Debounce saves to avoid too many API calls
        clearTimeout(window.onboardingSaveTimeout);
        window.onboardingSaveTimeout = setTimeout(async () => {
          await saveToClerk(onboardingState);
        }, 2000);
      }
    };

    saveProgressWithDelay();

    // Cleanup timeout on unmount
    return () => {
      if (window.onboardingSaveTimeout) {
        clearTimeout(window.onboardingSaveTimeout);
      }
    };
  }, [onboardingState, saveToClerk, user]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && showSkipConfirmation) {
        setShowSkipConfirmation(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSkipConfirmation]);

  const steps = [
    {
      id: 'welcome',
      title: 'Welcome',
      description: 'Welcome to SaasIt.ai',
      icon: Sparkles,
      component: WelcomeStep
    },
    {
      id: 'detection',
      title: 'Tool Detection',
      description: 'Detect Claude Code',
      icon: Zap,
      component: ClaudeCodeDetector,
      skippable: true
    },
    {
      id: 'project-type',
      title: 'Project Type',
      description: 'New or existing project',
      icon: Rocket,
      component: ProjectTypeSelector,
      skippable: false
    },
    {
      id: 'github',
      title: 'GitHub Integration',
      description: 'Connect your repository',
      icon: Shield,
      component: GitHubIntegration,
      skippable: true
    },
    {
      id: 'questions',
      title: 'AI Questions',
      description: 'Tell us about your project',
      icon: Users,
      component: AIQuestionFlow,
      skippable: true
    },
    {
      id: 'analysis',
      title: 'Project Analysis',
      description: 'Analyze your project',
      icon: CheckCircle,
      component: ProjectAnalyzer,
      skippable: true,
      condition: () => onboardingState.projectType === 'existing'
    },
    {
      id: 'templates',
      title: 'Template Selection',
      description: 'Choose your starting point',
      icon: Clock,
      component: TemplateRecommender,
      skippable: true
    }
  ];

  // Filter steps based on conditions
  const activeSteps = steps.filter(step => 
    !step.condition || step.condition()
  );

  const currentStepIndex = activeSteps.findIndex(step => step.id === onboardingState.currentStep);
  const currentStepData = activeSteps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === activeSteps.length - 1;
  const canProceed = canProceedFromCurrentStep();

  const handleNext = async () => {
    if (isLastStep) {
      await handleComplete();
    } else {
      goToNextStep();
    }
  };

  const handleBack = () => {
    if (isFirstStep) {
      navigate('/');
    } else {
      goToPreviousStep();
    }
  };

  const handleSkip = (reason = '') => {
    if (!currentStepData?.skippable) return;
    
    skipCurrentStep();
    setSkipReason(reason);
    setShowSkipConfirmation(false);
    
    if (isLastStep) {
      handleComplete();
    } else {
      goToNextStep();
    }
  };

  const handleComplete = async () => {
    try {
      setLoading(true, 'Completing setup...');
      
      // Complete onboarding in store
      completeOnboarding();
      
      // Mark as complete in Clerk metadata
      await markComplete();
      
      // Final save to Clerk
      await saveToClerk(onboardingState);
      
      // Navigate to main app with onboarding context
      const projectContext = {
        type: onboardingState.projectType,
        name: onboardingState.projectName,
        template: onboardingState.selectedTemplate,
        repository: onboardingState.selectedRepo,
        analysis: onboardingState.projectAnalysis,
        aiRecommendations: onboardingState.aiRecommendations,
        onboardingComplete: true,
        completedSteps: onboardingState.completedSteps,
        skippedSteps: onboardingState.skippedSteps
      };
      
      navigate('/app', { state: { projectContext }, replace: true });
      
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setError(`Failed to complete setup: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderCurrentStep = () => {
    if (!currentStepData) return null;
    
    const StepComponent = currentStepData.component;
    return <StepComponent onComplete={handleNext} onSkip={handleSkip} />;
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Animated Background */}
      <div className="absolute inset-0">
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
                disabled={onboardingState.isLoading}
              >
                <ArrowLeft size={20} />
              </button>
              <div className="font-mono text-xl font-bold text-white">SaasIt.ai</div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm text-white/90 border border-white/30">
                🚀 Setup Wizard
              </div>
              
              {user && (
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <img 
                    src={user.imageUrl} 
                    alt={user.firstName} 
                    className="w-6 h-6 rounded-full"
                  />
                  <span>{user.firstName}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="relative z-10 px-6 py-4">
        <OnboardingProgress 
          steps={activeSteps}
          currentStep={onboardingState.currentStep}
          completedSteps={onboardingState.completedSteps}
          skippedSteps={onboardingState.skippedSteps}
          progress={getProgress()}
        />
      </div>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 py-8">
        {/* Step Header */}
        {currentStepData && (
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <currentStepData.icon size={32} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">{currentStepData.title}</h1>
            <p className="text-white/80 text-lg max-w-2xl mx-auto">
              {currentStepData.description}
            </p>
          </div>
        )}

        {/* Step Content */}
        <div className="min-h-[500px] flex items-center justify-center">
          {onboardingState.error ? (
            <ErrorDisplay 
              error={onboardingState.error} 
              onRetry={() => {
                clearError();
                // Retry current step
                window.location.reload();
              }}
              onSkip={currentStepData?.skippable ? () => handleSkip('error-encountered') : null}
            />
          ) : (
            renderCurrentStep()
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-12">
          <button
            onClick={handleBack}
            disabled={onboardingState.isLoading}
            className="px-6 py-3 text-white/80 hover:text-white transition-all duration-200 hover:bg-white/10 rounded-lg backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
          
          <div className="flex items-center gap-4">
            {/* Skip Button */}
            {currentStepData?.skippable && (
              <button
                onClick={() => setShowSkipConfirmation(true)}
                disabled={onboardingState.isLoading}
                className="px-6 py-3 text-white/60 hover:text-white/80 transition-all duration-200 hover:bg-white/10 rounded-lg backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <SkipForward size={16} />
                Skip
              </button>
            )}
            
            {/* Next/Complete Button */}
            <button
              onClick={handleNext}
              disabled={!canProceed || onboardingState.isLoading}
              className={`
                px-8 py-3 rounded-xl font-medium transition-all duration-300
                flex items-center gap-2 backdrop-blur-sm border
                ${canProceed && !onboardingState.isLoading
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-white/30 hover:scale-105 shadow-lg hover:shadow-xl'
                  : 'bg-gray-600/50 text-gray-300 cursor-not-allowed border-gray-500/30'
                }
              `}
            >
              {onboardingState.isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  {onboardingState.loadingMessage || 'Loading...'}
                </>
              ) : (
                <>
                  {isLastStep ? 'Complete Setup' : 'Continue'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* Skip Confirmation Modal */}
      {showSkipConfirmation && (
        <SkipConfirmationModal
          stepName={currentStepData?.title}
          onConfirm={handleSkip}
          onCancel={() => setShowSkipConfirmation(false)}
        />
      )}
    </div>
  );
};

// Welcome Step Component
const WelcomeStep = ({ onComplete }) => {
  const { user } = useUser();
  
  return (
    <div className="max-w-2xl mx-auto text-center">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-4">
          Welcome{user?.firstName ? `, ${user.firstName}` : ''}! 👋
        </h2>
        <p className="text-white/80 text-lg leading-relaxed mb-8">
          Let's set up your AI-powered development experience in just a few minutes. 
          We'll help you configure the perfect team of AI agents for your project.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <div className="w-12 h-12 bg-blue-500/30 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Zap size={24} className="text-blue-300" />
          </div>
          <h3 className="font-semibold text-white mb-2">Quick Setup</h3>
          <p className="text-white/70 text-sm">
            Get started in minutes with intelligent defaults
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <div className="w-12 h-12 bg-purple-500/30 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Users size={24} className="text-purple-300" />
          </div>
          <h3 className="font-semibold text-white mb-2">AI Agents</h3>
          <p className="text-white/70 text-sm">
            40+ specialized agents ready to build with you
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <div className="w-12 h-12 bg-green-500/30 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Shield size={24} className="text-green-300" />
          </div>
          <h3 className="font-semibold text-white mb-2">Secure</h3>
          <p className="text-white/70 text-sm">
            Your code stays private and secure
          </p>
        </div>
      </div>

      <button
        onClick={onComplete}
        className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto"
      >
        Let's Get Started
        <ArrowRight size={20} />
      </button>
    </div>
  );
};

// Error Display Component
const ErrorDisplay = ({ error, onRetry, onSkip }) => (
  <div className="max-w-md mx-auto text-center">
    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
      <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
        <span className="text-white text-sm">!</span>
      </div>
    </div>
    
    <h3 className="text-xl font-semibold text-white mb-4">Something went wrong</h3>
    <p className="text-white/80 mb-6">{error}</p>
    
    <div className="flex gap-4 justify-center">
      <button
        onClick={onRetry}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
      >
        Try Again
      </button>
      {onSkip && (
        <button
          onClick={onSkip}
          className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
        >
          Skip This Step
        </button>
      )}
    </div>
  </div>
);

// Skip Confirmation Modal
const SkipConfirmationModal = ({ stepName, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-8 max-w-md mx-auto">
      <h3 className="text-xl font-semibold text-white mb-4">Skip {stepName}?</h3>
      <p className="text-white/80 mb-6">
        You can always come back to this step later, but skipping might limit some features.
      </p>
      
      <div className="flex gap-4">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm('user-skipped')}
          className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Skip Step
        </button>
      </div>
    </div>
  </div>
);

export default OnboardingFlow;