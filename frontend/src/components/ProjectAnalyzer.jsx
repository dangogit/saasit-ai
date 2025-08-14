import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { 
  Search, Brain, Zap, Clock, CheckCircle, AlertCircle,
  FileText, GitBranch, Settings, Users, Shield, Target
} from 'lucide-react';

const ProjectAnalyzer = ({ selectedRepo, githubToken, onAnalysisComplete }) => {
  const { user } = useUser();
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (selectedRepo && githubToken) {
      analyzeRepository();
    }
  }, [selectedRepo, githubToken]);

  const analyzeRepository = async () => {
    if (!selectedRepo || !githubToken) return;

    setAnalyzing(true);
    setError(null);

    try {
      const token = await user?.getToken();
      const response = await fetch(`/api/v1/project-intelligence/analyze-repository`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          github_token: githubToken,
          owner: selectedRepo.owner.login,
          repo: selectedRepo.name
        })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const analysisData = await response.json();
      setAnalysis(analysisData);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(analysisData);
      }

    } catch (error) {
      console.error('Repository analysis failed:', error);
      setError(error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const getTechIcon = (techName) => {
    const icons = {
      react: '⚛️',
      vue: '💚',
      angular: '🅰️',
      nextjs: '▲',
      fastapi: '🚀',
      django: '🎸',
      flask: '🌶️',
      nodejs: '💻',
      python: '🐍',
      javascript: '📜',
      typescript: '📘',
      docker: '🐳',
      kubernetes: '☸️'
    };
    return icons[techName] || '⚡';
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (analyzing) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">Analyzing Repository</h3>
          <p className="text-gray-600">Detecting technologies and patterns...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="text-red-600" size={24} />
          <h3 className="text-lg font-semibold text-red-900">Analysis Failed</h3>
        </div>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={analyzeRepository}
          className="btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Search className="text-gray-400" size={48} />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">Ready to Analyze</h3>
          <p className="text-gray-600">Select a repository to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {selectedRepo.full_name}
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <FileText size={14} />
                {analysis.structure.total_files || 0} files
              </span>
              <span className="flex items-center gap-1">
                <GitBranch size={14} />
                {Object.keys(analysis.technologies.detected).length} technologies
              </span>
              <span className="flex items-center gap-1">
                <Brain size={14} />
                {analysis.agent_recommendations.length} agent recommendations
              </span>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${getConfidenceColor(analysis.confidence_score)}`}>
            {Math.round(analysis.confidence_score * 100)}% confidence
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: FileText },
            { id: 'technologies', name: 'Technologies', icon: Settings },
            { id: 'agents', name: 'AI Agents', icon: Users },
            { id: 'suggestions', name: 'Improvements', icon: Target }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon size={16} />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Complexity Score */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Complexity</h3>
                <div className="text-2xl">{analysis.complexity.size_category === 'small' ? '🟢' : 
                                            analysis.complexity.size_category === 'medium' ? '🟡' : 
                                            analysis.complexity.size_category === 'large' ? '🟠' : '🔴'}</div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Size</span>
                  <span className="font-medium capitalize">{analysis.complexity.size_category}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Technologies</span>
                  <span className="font-medium">{analysis.complexity.tech_diversity}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Maintenance Score</span>
                  <span className="font-medium">{Math.round(analysis.complexity.maintenance_score * 100)}%</span>
                </div>
              </div>
            </div>

            {/* Primary Stack */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Primary Stack</h3>
                <Settings className="text-gray-400" size={20} />
              </div>
              <div className="space-y-2">
                {Object.entries(analysis.technologies.primary_stack).map(([category, tech]) => (
                  tech && (
                    <div key={category} className="flex justify-between text-sm">
                      <span className="capitalize">{category}</span>
                      <span className="flex items-center gap-1 font-medium">
                        {getTechIcon(tech)}
                        {tech}
                      </span>
                    </div>
                  )
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Quick Stats</h3>
                <Brain className="text-gray-400" size={20} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Security Score</span>
                  <span className="font-medium">{Math.round(analysis.complexity.security_score * 100)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Has Tests</span>
                  <span className="font-medium">{analysis.code_patterns.testing_patterns?.has_unit_tests ? '✅' : '❌'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Has CI/CD</span>
                  <span className="font-medium">{analysis.code_patterns.file_organization?.has_ci_cd ? '✅' : '❌'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'technologies' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(analysis.technologies.detected)
                .filter(([_, info]) => info.detected)
                .map(([tech, info]) => (
                  <div key={tech} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getTechIcon(tech)}</span>
                        <h4 className="font-semibold capitalize">{tech}</h4>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(info.confidence)}`}>
                        {Math.round(info.confidence * 100)}%
                      </div>
                    </div>
                    <div className="space-y-1">
                      {info.evidence.slice(0, 2).map((evidence, idx) => (
                        <div key={idx} className="text-xs text-gray-600 flex items-start gap-1">
                          <CheckCircle size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{evidence}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === 'agents' && (
          <div className="space-y-4">
            {analysis.agent_recommendations.map((rec, index) => (
              <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-lg capitalize">
                      {rec.agent_id.replace('-', ' ')}
                    </h4>
                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                      {rec.category}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(rec.confidence)}`}>
                      {Math.round(rec.confidence * 100)}% match
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Score: {rec.score}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-gray-700">Why this agent?</h5>
                  <ul className="space-y-1">
                    {rec.reasoning.map((reason, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                        <Zap size={12} className="text-yellow-500 mt-1 flex-shrink-0" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div className="space-y-4">
            {analysis.enhancement_suggestions.map((suggestion, index) => (
              <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-lg">{suggestion.title}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded border ${getPriorityColor(suggestion.priority)}`}>
                        {suggestion.priority}
                      </span>
                    </div>
                    <p className="text-gray-600">{suggestion.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock size={14} />
                      {suggestion.estimated_effort}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-3">
                  {suggestion.agents.map((agentId, idx) => (
                    <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      {agentId.replace('-', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectAnalyzer;