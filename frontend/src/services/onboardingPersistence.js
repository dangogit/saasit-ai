import React from 'react';
import { useUser } from '@clerk/clerk-react';

/**
 * Service for persisting onboarding progress to Clerk user metadata
 * This allows users to resume onboarding across sessions and devices
 */

export const useOnboardingPersistence = () => {
  const { user } = useUser();

  /**
   * Save onboarding progress to Clerk user metadata
   */
  const saveProgress = async (onboardingState) => {
    if (!user) {
      console.warn('Cannot save onboarding progress: user not authenticated');
      return false;
    }

    try {
      // Extract only the essential state to save
      const progressData = {
        // User Profile
        hasClaudeCode: onboardingState.hasClaudeCode,
        claudeCodeVersion: onboardingState.claudeCodeVersion,
        userExperience: onboardingState.userExperience,
        
        // Project Information
        projectType: onboardingState.projectType,
        projectName: onboardingState.projectName,
        projectDescription: onboardingState.projectDescription,
        projectGoals: onboardingState.projectGoals,
        targetUsers: onboardingState.targetUsers,
        timeframe: onboardingState.timeframe,
        
        // GitHub Status
        hasGitHub: onboardingState.hasGitHub,
        repoCreationPreference: onboardingState.repoCreationPreference,
        workMode: onboardingState.workMode,
        
        // Progress Tracking
        currentStep: onboardingState.currentStep,
        completedSteps: onboardingState.completedSteps,
        skippedSteps: onboardingState.skippedSteps,
        onboardingComplete: onboardingState.onboardingComplete,
        onboardingStartTime: onboardingState.onboardingStartTime,
        onboardingEndTime: onboardingState.onboardingEndTime,
        
        // Question History (simplified)
        questionHistory: onboardingState.questionHistory.map(item => ({
          question: item.question?.question || item.question,
          answer: item.answer,
          timestamp: item.timestamp
        })),
        
        // Template Selection
        selectedTemplate: onboardingState.selectedTemplate ? {
          id: onboardingState.selectedTemplate.id,
          name: onboardingState.selectedTemplate.name,
          confidence: onboardingState.selectedTemplate.confidence
        } : null,
        
        // Metadata
        lastSavedAt: new Date().toISOString(),
        version: '1.0' // For future compatibility
      };

      // Save to Clerk user metadata
      await user.update({
        publicMetadata: {
          ...user.publicMetadata,
          onboarding: progressData
        }
      });

      console.log('Onboarding progress saved successfully');
      return true;

    } catch (error) {
      console.error('Failed to save onboarding progress:', error);
      return false;
    }
  };

  /**
   * Load onboarding progress from Clerk user metadata
   */
  const loadProgress = async () => {
    if (!user) {
      console.warn('Cannot load onboarding progress: user not authenticated');
      return null;
    }

    try {
      const onboardingData = user.publicMetadata?.onboarding;
      
      if (!onboardingData) {
        console.log('No saved onboarding progress found');
        return null;
      }

      // Check if the saved data is recent (within 30 days)
      const savedAt = new Date(onboardingData.lastSavedAt);
      const daysSinceSaved = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceSaved > 30) {
        console.log('Saved onboarding progress is too old, starting fresh');
        await clearProgress(); // Clean up old data
        return null;
      }

      console.log('Loaded onboarding progress from', onboardingData.lastSavedAt);
      return onboardingData;

    } catch (error) {
      console.error('Failed to load onboarding progress:', error);
      return null;
    }
  };

  /**
   * Clear onboarding progress from Clerk user metadata
   */
  const clearProgress = async () => {
    if (!user) {
      console.warn('Cannot clear onboarding progress: user not authenticated');
      return false;
    }

    try {
      const updatedMetadata = { ...user.publicMetadata };
      delete updatedMetadata.onboarding;

      await user.update({
        publicMetadata: updatedMetadata
      });

      console.log('Onboarding progress cleared successfully');
      return true;

    } catch (error) {
      console.error('Failed to clear onboarding progress:', error);
      return false;
    }
  };

  /**
   * Check if user has completed onboarding
   */
  const hasCompletedOnboarding = () => {
    if (!user?.publicMetadata?.onboarding) {
      return false;
    }

    return user.publicMetadata.onboarding.onboardingComplete === true;
  };

  /**
   * Get onboarding completion percentage
   */
  const getCompletionPercentage = () => {
    const onboardingData = user?.publicMetadata?.onboarding;
    
    if (!onboardingData) {
      return 0;
    }

    if (onboardingData.onboardingComplete) {
      return 100;
    }

    const totalSteps = 7; // welcome, detection, project-type, github, questions, analysis, templates
    const completedCount = onboardingData.completedSteps?.length || 0;
    
    return Math.min((completedCount / totalSteps) * 100, 100);
  };

  /**
   * Mark onboarding as complete
   */
  const markComplete = async () => {
    if (!user) {
      return false;
    }

    try {
      const currentOnboarding = user.publicMetadata?.onboarding || {};
      
      await user.update({
        publicMetadata: {
          ...user.publicMetadata,
          onboarding: {
            ...currentOnboarding,
            onboardingComplete: true,
            onboardingEndTime: new Date().toISOString(),
            lastSavedAt: new Date().toISOString()
          }
        }
      });

      console.log('Onboarding marked as complete');
      return true;

    } catch (error) {
      console.error('Failed to mark onboarding as complete:', error);
      return false;
    }
  };

  return {
    saveProgress,
    loadProgress,
    clearProgress,
    hasCompletedOnboarding,
    getCompletionPercentage,
    markComplete,
    isAuthenticated: !!user
  };
};

/**
 * Hook to automatically persist onboarding state changes
 */
export const useOnboardingAutoSave = (onboardingState, enabled = true) => {
  const { saveProgress } = useOnboardingPersistence();

  // Debounced save function
  const debouncedSave = React.useCallback(
    debounce(async (state) => {
      if (enabled && state.onboardingStartTime) {
        await saveProgress(state);
      }
    }, 2000), // Save after 2 seconds of inactivity
    [saveProgress, enabled]
  );

  // Auto-save when state changes
  React.useEffect(() => {
    debouncedSave(onboardingState);
  }, [onboardingState, debouncedSave]);
};

/**
 * Utility function for debouncing saves
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default useOnboardingPersistence;