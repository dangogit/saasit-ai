import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

const useOnboardingStore = create()(
  devtools(
    persist(
      immer((set, get) => ({
        // Onboarding State
        onboardingState: {
          // User Profile
          hasClaudeCode: null, // null | true | false
          claudeCodeVersion: null, // string | null
          claudeCodeStatus: 'checking', // 'checking' | 'found' | 'not-found' | 'error'
          userExperience: null, // 'beginner' | 'intermediate' | 'expert' | null
          
          // Project Information
          projectType: null, // 'new' | 'existing' | null
          projectName: '',
          projectDescription: '',
          projectGoals: [],
          targetUsers: '',
          timeframe: null, // 'asap' | 'weeks' | 'months' | 'flexible'
          
          // GitHub Status & Integration
          hasGitHub: null, // null | true | false
          githubConnected: false,
          githubToken: null,
          selectedRepo: null,
          repoCreationPreference: null, // 'create' | 'connect' | 'local-only' | null
          workMode: null, // 'cloud' | 'local' | 'hybrid' | null
          
          // Project Analysis
          claudeMdContent: null,
          claudeMdAnalysis: null,
          projectAnalysis: null,
          detectedTechnologies: [],
          existingAgents: [],
          projectComplexity: null, // 'simple' | 'moderate' | 'complex'
          
          // AI Conversation Flow
          currentStep: 'welcome', // 'welcome' | 'detection' | 'project-type' | 'github' | 'questions' | 'analysis' | 'templates' | 'complete'
          questionHistory: [],
          currentQuestion: null,
          questionQueue: [],
          questionsAnswered: 0,
          totalQuestions: 0,
          aiRecommendations: null,
          conversationContext: {},
          
          // Templates & Recommendations
          recommendedTemplates: [],
          selectedTemplate: null,
          templateConfidence: 0,
          customTemplate: null,
          
          // Progress Tracking
          completedSteps: [],
          skippedSteps: [],
          onboardingComplete: false,
          onboardingStartTime: null,
          onboardingEndTime: null,
          
          // UI State
          isLoading: false,
          loadingMessage: '',
          error: null,
          showSkipOptions: true,
          
          // Persistence
          lastSavedAt: null,
          resumeToken: null
        },

        // Navigation Actions
        setCurrentStep: (step) =>
          set((state) => {
            state.onboardingState.currentStep = step;
            if (!state.onboardingState.completedSteps.includes(step)) {
              state.onboardingState.completedSteps.push(state.onboardingState.currentStep);
            }
          }),

        skipCurrentStep: () =>
          set((state) => {
            const currentStep = state.onboardingState.currentStep;
            if (!state.onboardingState.skippedSteps.includes(currentStep)) {
              state.onboardingState.skippedSteps.push(currentStep);
            }
            state.onboardingState.completedSteps.push(currentStep);
          }),

        goToPreviousStep: () =>
          set((state) => {
            const steps = ['welcome', 'detection', 'project-type', 'github', 'questions', 'analysis', 'templates', 'complete'];
            const currentIndex = steps.indexOf(state.onboardingState.currentStep);
            if (currentIndex > 0) {
              state.onboardingState.currentStep = steps[currentIndex - 1];
            }
          }),

        goToNextStep: () =>
          set((state) => {
            const steps = ['welcome', 'detection', 'project-type', 'github', 'questions', 'analysis', 'templates', 'complete'];
            const currentIndex = steps.indexOf(state.onboardingState.currentStep);
            if (currentIndex < steps.length - 1) {
              state.onboardingState.currentStep = steps[currentIndex + 1];
            }
          }),

        // Claude Code Detection Actions
        setClaudeCodeStatus: (status, version = null) =>
          set((state) => {
            state.onboardingState.claudeCodeStatus = status;
            state.onboardingState.hasClaudeCode = status === 'found';
            state.onboardingState.claudeCodeVersion = version;
          }),

        // User Profile Actions
        setUserExperience: (experience) =>
          set((state) => {
            state.onboardingState.userExperience = experience;
          }),

        // Project Information Actions
        setProjectType: (type) =>
          set((state) => {
            state.onboardingState.projectType = type;
            // Reset project-specific state when type changes
            if (type === 'new') {
              state.onboardingState.selectedRepo = null;
              state.onboardingState.projectAnalysis = null;
              state.onboardingState.claudeMdContent = null;
            }
          }),

        updateProjectInfo: (info) =>
          set((state) => {
            Object.assign(state.onboardingState, info);
          }),

        setProjectGoals: (goals) =>
          set((state) => {
            state.onboardingState.projectGoals = goals;
          }),

        // GitHub Actions
        setGitHubStatus: (hasGitHub) =>
          set((state) => {
            state.onboardingState.hasGitHub = hasGitHub;
          }),

        setGitHubConnection: (connected, token = null) =>
          set((state) => {
            state.onboardingState.githubConnected = connected;
            state.onboardingState.githubToken = token;
          }),

        setSelectedRepo: (repo) =>
          set((state) => {
            state.onboardingState.selectedRepo = repo;
          }),

        setRepoPreference: (preference) =>
          set((state) => {
            state.onboardingState.repoCreationPreference = preference;
          }),

        setWorkMode: (mode) =>
          set((state) => {
            state.onboardingState.workMode = mode;
          }),

        // Project Analysis Actions
        setClaudeMdContent: (content, analysis = null) =>
          set((state) => {
            state.onboardingState.claudeMdContent = content;
            state.onboardingState.claudeMdAnalysis = analysis;
          }),

        setProjectAnalysis: (analysis) =>
          set((state) => {
            state.onboardingState.projectAnalysis = analysis;
            state.onboardingState.detectedTechnologies = analysis?.technologies || [];
            state.onboardingState.projectComplexity = analysis?.complexity || null;
          }),

        // AI Conversation Actions
        setCurrentQuestion: (question) =>
          set((state) => {
            state.onboardingState.currentQuestion = question;
          }),

        addQuestionToHistory: (question, answer) =>
          set((state) => {
            state.onboardingState.questionHistory.push({
              question,
              answer,
              timestamp: new Date().toISOString(),
              stepIndex: state.onboardingState.questionsAnswered
            });
            state.onboardingState.questionsAnswered += 1;
          }),

        setQuestionQueue: (questions) =>
          set((state) => {
            state.onboardingState.questionQueue = questions;
            state.onboardingState.totalQuestions = questions.length;
          }),

        getNextQuestion: () => {
          const state = get();
          const queue = state.onboardingState.questionQueue;
          const answered = state.onboardingState.questionsAnswered;
          
          if (answered < queue.length) {
            return queue[answered];
          }
          return null;
        },

        updateConversationContext: (context) =>
          set((state) => {
            state.onboardingState.conversationContext = {
              ...state.onboardingState.conversationContext,
              ...context
            };
          }),

        // Template Actions
        setRecommendedTemplates: (templates, confidence = 0) =>
          set((state) => {
            state.onboardingState.recommendedTemplates = templates;
            state.onboardingState.templateConfidence = confidence;
          }),

        selectTemplate: (template) =>
          set((state) => {
            state.onboardingState.selectedTemplate = template;
          }),

        setAIRecommendations: (recommendations) =>
          set((state) => {
            state.onboardingState.aiRecommendations = recommendations;
          }),

        // UI State Actions
        setLoading: (isLoading, message = '') =>
          set((state) => {
            state.onboardingState.isLoading = isLoading;
            state.onboardingState.loadingMessage = message;
          }),

        setError: (error) =>
          set((state) => {
            state.onboardingState.error = error;
          }),

        clearError: () =>
          set((state) => {
            state.onboardingState.error = null;
          }),

        // Progress Actions
        completeOnboarding: () =>
          set((state) => {
            state.onboardingState.onboardingComplete = true;
            state.onboardingState.onboardingEndTime = new Date().toISOString();
            state.onboardingState.currentStep = 'complete';
          }),

        startOnboarding: () =>
          set((state) => {
            state.onboardingState.onboardingStartTime = new Date().toISOString();
            state.onboardingState.onboardingComplete = false;
            state.onboardingState.currentStep = 'welcome';
          }),

        // Persistence Actions
        saveProgress: async () => {
          // This will be called by the persistence service
          set((state) => {
            state.onboardingState.lastSavedAt = new Date().toISOString();
            state.onboardingState.resumeToken = `resume_${Date.now()}`;
          });
        },

        loadProgressFromClerk: (savedData) =>
          set((state) => {
            if (savedData && savedData.version === '1.0') {
              // Merge saved data with current state
              Object.assign(state.onboardingState, {
                ...savedData,
                // Reset UI state
                isLoading: false,
                loadingMessage: '',
                error: null,
                showSkipOptions: true
              });
            }
          }),

        // Reset Actions
        resetOnboarding: () =>
          set((state) => {
            // Keep user profile info but reset everything else
            const { hasClaudeCode, claudeCodeVersion, userExperience } = state.onboardingState;
            
            state.onboardingState = {
              // Preserve user profile
              hasClaudeCode,
              claudeCodeVersion,
              claudeCodeStatus: hasClaudeCode ? 'found' : 'not-found',
              userExperience,
              
              // Reset everything else to defaults
              projectType: null,
              projectName: '',
              projectDescription: '',
              projectGoals: [],
              targetUsers: '',
              timeframe: null,
              hasGitHub: null,
              githubConnected: false,
              githubToken: null,
              selectedRepo: null,
              repoCreationPreference: null,
              workMode: null,
              claudeMdContent: null,
              claudeMdAnalysis: null,
              projectAnalysis: null,
              detectedTechnologies: [],
              existingAgents: [],
              projectComplexity: null,
              currentStep: 'project-type', // Skip detection if we already know
              questionHistory: [],
              currentQuestion: null,
              questionQueue: [],
              questionsAnswered: 0,
              totalQuestions: 0,
              aiRecommendations: null,
              conversationContext: {},
              recommendedTemplates: [],
              selectedTemplate: null,
              templateConfidence: 0,
              customTemplate: null,
              completedSteps: ['welcome', 'detection'],
              skippedSteps: [],
              onboardingComplete: false,
              onboardingStartTime: new Date().toISOString(),
              onboardingEndTime: null,
              isLoading: false,
              loadingMessage: '',
              error: null,
              showSkipOptions: true,
              lastSavedAt: null,
              resumeToken: null
            };
          }),

        // Utility Actions
        canProceedFromCurrentStep: () => {
          const state = get().onboardingState;
          
          switch (state.currentStep) {
            case 'welcome':
              return true; // Always can proceed from welcome
            case 'detection':
              return state.claudeCodeStatus !== 'checking';
            case 'project-type':
              return state.projectType !== null;
            case 'github':
              return state.repoCreationPreference !== null || state.skippedSteps.includes('github');
            case 'questions':
              return state.questionsAnswered >= state.totalQuestions || state.skippedSteps.includes('questions');
            case 'analysis':
              return (state.projectAnalysis !== null && state.recommendedTemplates.length > 0) || state.skippedSteps.includes('analysis');
            case 'templates':
              return state.selectedTemplate !== null || state.skippedSteps.includes('templates');
            case 'complete':
              return true;
            default:
              return false;
          }
        },

        getProgress: () => {
          const state = get().onboardingState;
          const totalSteps = 7; // welcome, detection, project-type, github, questions, analysis, templates
          const completedCount = state.completedSteps.length;
          return Math.min((completedCount / totalSteps) * 100, 100);
        },

        getStepStatus: (step) => {
          const state = get().onboardingState;
          if (state.completedSteps.includes(step)) return 'completed';
          if (state.skippedSteps.includes(step)) return 'skipped';
          if (state.currentStep === step) return 'current';
          return 'pending';
        }
      })),
      {
        name: 'saasit-onboarding',
        partialize: (state) => ({
          onboardingState: {
            // Only persist essential state, not UI state
            hasClaudeCode: state.onboardingState.hasClaudeCode,
            claudeCodeVersion: state.onboardingState.claudeCodeVersion,
            userExperience: state.onboardingState.userExperience,
            projectType: state.onboardingState.projectType,
            projectName: state.onboardingState.projectName,
            projectDescription: state.onboardingState.projectDescription,
            questionHistory: state.onboardingState.questionHistory,
            completedSteps: state.onboardingState.completedSteps,
            skippedSteps: state.onboardingState.skippedSteps,
            onboardingComplete: state.onboardingState.onboardingComplete,
            lastSavedAt: state.onboardingState.lastSavedAt
          }
        })
      }
    )
  )
);

export default useOnboardingStore;