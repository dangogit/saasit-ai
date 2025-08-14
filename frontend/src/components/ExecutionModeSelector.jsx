import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { 
  Computer, Cloud, Sync, Download, ExternalLink, 
  Clock, Shield, Zap, Github, CheckCircle 
} from 'lucide-react';

const ExecutionModeSelector = ({ 
  onModeSelected, 
  workflowData, 
  selectedRepo, 
  githubToken 
}) => {
  const { user } = useUser();
  const [selectedMode, setSelectedMode] = useState('cloud');
  const [loading, setLoading] = useState(false);
  const [modes, setModes] = useState([]);
  const [setupResult, setSetupResult] = useState(null);
  const [error, setError] = useState(null);

  // Fetch available execution modes
  useEffect(() => {
    fetchExecutionModes();
  }, []);

  const fetchExecutionModes = async () => {
    try {
      const response = await fetch('/api/v1/execution-modes/modes');
      const data = await response.json();
      setModes(data.modes);
    } catch (error) {
      console.error('Failed to fetch execution modes:', error);
      setError('Failed to load execution modes');
    }
  };

  const handleModeSelection = async () => {
    if (!workflowData || !selectedMode) return;

    setLoading(true);
    setError(null);

    try {
      const result = await setupExecutionMode(selectedMode);
      setSetupResult(result);
      onModeSelected(selectedMode, result);
    } catch (error) {
      console.error('Failed to setup execution mode:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const setupExecutionMode = async (mode) => {
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const token = await user?.getToken();

    let endpoint;
    let requestData;

    switch (mode) {
      case 'local':
        endpoint = `${baseUrl}/api/v1/execution-modes/local`;
        requestData = {
          workflow_data: workflowData,
          workspace_dir: '${PROJECT_ROOT}',
          github_repo: selectedRepo,
          user_preferences: {
            privacy_mode: true,
            max_memory: '4GB'
          }
        };
        break;

      case 'cloud':
        if (!selectedRepo) {
          throw new Error('GitHub repository is required for cloud execution');
        }
        if (!githubToken) {
          throw new Error('GitHub token is required for cloud execution');
        }

        endpoint = `${baseUrl}/api/v1/execution-modes/cloud`;
        requestData = {
          workflow_data: workflowData,
          github_repo: selectedRepo,
          github_token: githubToken,
          execution_config: {
            timeout: '60m',
            resources: 'standard'
          }
        };
        break;

      case 'hybrid':
        if (!selectedRepo || !githubToken) {
          throw new Error('GitHub repository and token are required for hybrid mode');
        }

        endpoint = `${baseUrl}/api/v1/execution-modes/hybrid`;
        requestData = {
          workflow_data: workflowData,
          workspace_dir: './my-project',
          github_repo: selectedRepo,
          github_token: githubToken,
          sync_settings: {
            auto_commit: true,
            branch_strategy: 'feature-branch',
            sync_interval: 30
          }
        };
        break;

      default:
        throw new Error(`Unknown execution mode: ${mode}`);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to setup execution mode');
    }

    return await response.json();
  };

  const downloadConfig = async (downloadUrl) => {
    try {
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'saasit-mcp-config.json';
      
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download config:', error);
      setError('Failed to download configuration file');
    }
  };

  const getModeIcon = (modeId) => {
    switch (modeId) {
      case 'local': return <Computer size={24} />;
      case 'cloud': return <Cloud size={24} />;
      case 'hybrid': return <Sync size={24} />;
      default: return <Zap size={24} />;
    }
  };

  const getModeColor = (modeId) => {
    switch (modeId) {
      case 'local': return 'border-purple-200 bg-purple-50 hover:border-purple-300';
      case 'cloud': return 'border-blue-200 bg-blue-50 hover:border-blue-300';
      case 'hybrid': return 'border-green-200 bg-green-50 hover:border-green-300';
      default: return 'border-gray-200 bg-gray-50 hover:border-gray-300';
    }
  };

  const isValidForMode = (modeId) => {
    if (modeId === 'cloud' || modeId === 'hybrid') {
      return selectedRepo && githubToken;
    }
    return true;
  };

  if (setupResult) {
    return (
      <div className="space-y-6">
        {/* Success Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1)} Mode Ready!
          </h3>
          <p className="text-gray-600">
            Estimated time: {setupResult.estimated_duration}
          </p>
        </div>

        {/* Mode-specific instructions */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium mb-3">Next Steps:</h4>
          <ol className="space-y-2">
            {setupResult.instructions.map((instruction, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <span className="text-gray-700">{instruction}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          {setupResult.download_url && (
            <button
              onClick={() => downloadConfig(setupResult.download_url)}
              className="btn-primary flex items-center gap-2"
            >
              <Download size={16} />
              Download Config
            </button>
          )}
          
          {setupResult.execution_id && (
            <button
              onClick={() => window.open(`/executions/${setupResult.execution_id}`, '_blank')}
              className="btn-secondary flex items-center gap-2"
            >
              <ExternalLink size={16} />
              View Execution
            </button>
          )}
          
          {selectedRepo && (
            <button
              onClick={() => window.open(selectedRepo.html_url, '_blank')}
              className="btn-secondary flex items-center gap-2"
            >
              <Github size={16} />
              View Repository
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Choose Execution Mode
        </h3>
        <p className="text-gray-600">
          Select how you want your AI agents to execute
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Mode Selection */}
      <div className="grid gap-4">
        {modes.map((mode) => (
          <div
            key={mode.id}
            onClick={() => isValidForMode(mode.id) && setSelectedMode(mode.id)}
            className={`
              p-4 rounded-lg border cursor-pointer transition-colors
              ${selectedMode === mode.id ? 'border-blue-500 bg-blue-50' : getModeColor(mode.id)}
              ${!isValidForMode(mode.id) ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className={`
                p-2 rounded-lg
                ${selectedMode === mode.id ? 'bg-blue-100 text-blue-600' : 'bg-white text-gray-600'}
              `}>
                {getModeIcon(mode.id)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900">{mode.name}</h4>
                  {!isValidForMode(mode.id) && (
                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                      Requires GitHub
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-gray-600 mb-3">
                  {mode.description}
                </p>

                {/* Features */}
                <div className="mb-3">
                  <h5 className="text-xs font-medium text-gray-700 mb-1">Features:</h5>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {mode.features.slice(0, 3).map((feature, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-green-500 mt-0.5">•</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Best for */}
                <div className="text-xs">
                  <span className="font-medium text-gray-700">Best for: </span>
                  <span className="text-gray-600">{mode.best_for}</span>
                </div>
              </div>

              {/* Selection indicator */}
              {selectedMode === mode.id && (
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Requirements for selected mode */}
      {selectedMode && modes.find(m => m.id === selectedMode) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <h5 className="text-sm font-medium text-yellow-800 mb-2">Requirements:</h5>
          <ul className="text-sm text-yellow-700 space-y-1">
            {modes.find(m => m.id === selectedMode).requirements.map((req, index) => (
              <li key={index} className="flex items-start gap-1">
                <span className="text-yellow-600 mt-0.5">•</span>
                {req}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-center">
        <button
          onClick={handleModeSelection}
          disabled={loading || !selectedMode || !isValidForMode(selectedMode)}
          className="btn-primary px-8 flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Setting up...
            </>
          ) : (
            <>
              <Zap size={16} />
              Start {selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1)} Execution
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ExecutionModeSelector;