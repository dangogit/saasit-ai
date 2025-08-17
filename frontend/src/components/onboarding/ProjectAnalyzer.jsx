import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  CheckCircle, 
  Code, 
  FileText,
  GitBranch,
  Search,
  Zap,
  AlertCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';

import useOnboardingStore from '../../stores/onboardingStore';

const ProjectAnalyzer = ({ onComplete, onSkip }) => {
  const { getToken } = useAuth();
  const {
    onboardingState,
    setProjectAnalysis,
    setClaudeMdContent,
    setRecommendedTemplates,
    setLoading,
    setError,
    clearError
  } = useOnboardingStore();

  const [analysisStep, setAnalysisStep] = useState('start'); // 'start' | 'analyzing' | 'complete'
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [claudeMdFile, setClaudeMdFile] = useState(null);

  // Auto-start analysis if we have a selected repo
  useEffect(() => {
    if (onboardingState.selectedRepo && analysisStep === 'start') {
      startAnalysis();
    }
  }, [onboardingState.selectedRepo]);

  const startAnalysis = async () => {
    setAnalysisStep('analyzing');
    setAnalysisProgress(0);
    clearError();

    try {
      setLoading(true, 'Analyzing project...');

      // Simulate analysis steps
      const steps = [
        { name: 'Scanning repository structure', duration: 1000 },
        { name: 'Detecting technologies', duration: 1500 },
        { name: 'Analyzing CLAUDE.md', duration: 1000 },
        { name: 'Generating recommendations', duration: 2000 }
      ];

      for (const [index, step] of steps.entries()) {
        setLoading(true, step.name);
        setAnalysisProgress(((index + 1) / steps.length) * 100);
        await new Promise(resolve => setTimeout(resolve, step.duration));
      }

      // Perform actual analysis
      const analysis = await analyzeProject();
      setAnalysisResults(analysis);
      setProjectAnalysis(analysis);

      setAnalysisStep('complete');
      setAnalysisProgress(100);

    } catch (error) {
      console.error('Analysis failed:', error);
      setError(`Analysis failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const analyzeProject = async () => {
    // Mock analysis - in real implementation, this would call the backend
    // and analyze the actual repository
    
    const mockAnalysis = {
      technologies: ['React', 'Node.js', 'TypeScript', 'Tailwind CSS'],
      framework: 'React',
      projectType: 'Web Application',
      complexity: 'moderate',
      structure: {
        hasTests: true,
        hasDocumentation: true,
        hasCICD: false,
        packageManager: 'npm'
      },
      recommendations: [
        'Add frontend-developer agent for React optimization',
        'Use backend-architect for API improvements',
        'Consider test-writer-fixer for better test coverage',
        'Add devops-automator for CI/CD setup'
      ],
      agents: [
        {
          name: 'frontend-developer',
          confidence: 0.95,
          reason: 'React-based project needs frontend expertise'
        },
        {
          name: 'backend-architect',
          confidence: 0.85,
          reason: 'Node.js backend could benefit from architectural guidance'
        },
        {
          name: 'test-writer-fixer',
          confidence: 0.75,
          reason: 'Existing tests need enhancement and expansion'
        }
      ]
    };

    // If there's a CLAUDE.md file, analyze it
    if (onboardingState.selectedRepo) {
      try {
        await analyzeClaudeMd();
      } catch (error) {
        console.log('No CLAUDE.md found or error analyzing it:', error);
      }
    }

    return mockAnalysis;
  };

  const analyzeClaudeMd = async () => {
    if (!onboardingState.githubToken || !onboardingState.selectedRepo) {
      return;
    }

    try {
      // Try to fetch CLAUDE.md from the repository
      const response = await fetch(
        `https://api.github.com/repos/${onboardingState.selectedRepo.full_name}/contents/CLAUDE.md`,
        {
          headers: {
            'Authorization': `Bearer ${onboardingState.githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (response.ok) {
        const fileData = await response.json();
        const content = atob(fileData.content); // Decode base64
        
        setClaudeMdContent(content);
        
        // Analyze CLAUDE.md content via API
        const token = await getToken();
        const analysisResponse = await fetch('/api/v1/onboarding/analyze-claude-md', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            content,
            repo_url: onboardingState.selectedRepo.html_url
          })
        });

        if (analysisResponse.ok) {
          const claudeAnalysis = await analysisResponse.json();
          return claudeAnalysis;
        }
      }
    } catch (error) {
      console.log('CLAUDE.md analysis error:', error);
      // Not a critical error, continue without it
    }

    return null;
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.name.toLowerCase().includes('claude')) {
      setClaudeMdFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        setClaudeMdContent(content);
      };
      reader.readAsText(file);
    }
  };

  const renderStartState = () => (
    <div className="max-w-2xl mx-auto text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
        <Brain size={32} className="text-white" />
      </div>
      
      <h2 className="text-3xl font-bold text-white mb-4">Project Analysis</h2>
      <p className="text-white/80 text-lg mb-8">
        Let me analyze your project to recommend the perfect AI agents and templates.
      </p>

      {onboardingState.selectedRepo ? (
        <div className="bg-blue-500/20 backdrop-blur-sm rounded-2xl p-6 border border-blue-400/30 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <GitBranch size={20} className="text-blue-300" />
            <h3 className="font-semibold text-blue-100">Connected Repository</h3>
          </div>
          <p className="text-blue-200/90 mb-4">{onboardingState.selectedRepo.name}</p>
          <p className="text-blue-200/70 text-sm">
            I'll analyze the code structure, technologies, and any CLAUDE.md file to understand your project.
          </p>
        </div>
      ) : (
        <div className="space-y-6 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <FileText size={20} />
              Upload CLAUDE.md (Optional)
            </h3>
            <p className="text-white/70 mb-4 text-sm">
              If you have a CLAUDE.md file describing your project, upload it for better recommendations.
            </p>
            <input
              type="file"
              accept=".md,.txt"
              onChange={handleFileUpload}
              className="w-full text-white/80 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            />
          </div>
        </div>
      )}

      <div className="flex gap-4 justify-center">
        <button
          onClick={() => onSkip?.('analysis-skipped')}
          className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
        >
          Skip Analysis
        </button>
        
        <button
          onClick={startAnalysis}
          disabled={onboardingState.isLoading}
          className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          {onboardingState.isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Analyzing...
            </>
          ) : (
            <>
              <Search size={20} />
              Start Analysis
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderAnalyzing = () => (
    <div className="max-w-2xl mx-auto text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
      
      <h2 className="text-3xl font-bold text-white mb-4">Analyzing Your Project</h2>
      <p className="text-white/80 text-lg mb-8">
        {onboardingState.loadingMessage || 'Scanning your project...'}
      </p>

      {/* Progress Bar */}
      <div className="bg-white/20 rounded-full h-3 mb-8">
        <div 
          className="bg-gradient-to-r from-blue-400 to-purple-500 h-3 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${analysisProgress}%` }}
        ></div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <Code size={16} className="text-blue-300" />
            <span className="text-white/90 text-sm font-medium">Technology Detection</span>
          </div>
          <p className="text-white/70 text-xs">Identifying frameworks and languages</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={16} className="text-purple-300" />
            <span className="text-white/90 text-sm font-medium">Code Structure</span>
          </div>
          <p className="text-white/70 text-xs">Analyzing project organization</p>
        </div>
      </div>
    </div>
  );

  const renderComplete = () => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <CheckCircle size={32} className="text-white" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">Analysis Complete! 🎉</h2>
        <p className="text-white/80 text-lg">
          I've analyzed your project and have some great recommendations.
        </p>
      </div>

      {analysisResults && (
        <div className="space-y-6">
          {/* Technology Summary */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Code size={20} />
              Technologies Detected
            </h3>
            <div className="flex flex-wrap gap-2">
              {analysisResults.technologies.map((tech, index) => (
                <span 
                  key={index}
                  className="px-3 py-1 bg-blue-500/30 text-blue-100 text-sm rounded-lg border border-blue-400/30"
                >
                  {tech}
                </span>
              ))}
            </div>
            <div className="mt-4 grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-white/60">Primary Framework:</span>
                <span className="text-white ml-2">{analysisResults.framework}</span>
              </div>
              <div>
                <span className="text-white/60">Project Type:</span>
                <span className="text-white ml-2">{analysisResults.projectType}</span>
              </div>
            </div>
          </div>

          {/* Recommended Agents */}
          <div className="bg-green-500/20 backdrop-blur-sm rounded-2xl p-6 border border-green-400/30">
            <h3 className="font-semibold text-green-100 mb-4 flex items-center gap-2">
              <Zap size={20} />
              Recommended AI Agents
            </h3>
            <div className="space-y-3">
              {analysisResults.agents.map((agent, index) => (
                <div key={index} className="bg-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white">{agent.name}</span>
                    <span className="text-green-300 text-sm">{Math.round(agent.confidence * 100)}% match</span>
                  </div>
                  <p className="text-white/70 text-sm">{agent.reason}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-500/20 backdrop-blur-sm rounded-2xl p-6 border border-blue-400/30">
            <h3 className="font-semibold text-blue-100 mb-4 flex items-center gap-2">
              <ArrowRight size={20} />
              What's Next
            </h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="bg-white/10 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={16} className="text-blue-300" />
                  <span className="text-blue-100 font-medium">Template Selection</span>
                </div>
                <p className="text-blue-200/80">Choose from recommended templates based on your project</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={16} className="text-blue-300" />
                  <span className="text-blue-100 font-medium">Workflow Design</span>
                </div>
                <p className="text-blue-200/80">Create your AI agent workflow with our recommendations</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center mt-8">
        <button
          onClick={onComplete}
          className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          Continue to Templates
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );

  // Main render logic
  if (onboardingState.error) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={32} className="text-red-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-4">Analysis Error</h3>
        <p className="text-white/80 mb-6">{onboardingState.error}</p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => onSkip?.('analysis-error')}
            className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
          >
            Skip Analysis
          </button>
          <button
            onClick={startAnalysis}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  switch (analysisStep) {
    case 'analyzing':
      return renderAnalyzing();
    case 'complete':
      return renderComplete();
    default:
      return renderStartState();
  }
};

export default ProjectAnalyzer;