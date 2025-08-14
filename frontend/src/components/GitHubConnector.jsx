import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Github, ExternalLink, Plus, FolderOpen, GitBranch, Brain, ChevronDown, ChevronUp } from 'lucide-react';
import ProjectAnalyzer from './ProjectAnalyzer';

const GitHubConnector = ({ onRepoSelected, selectedRepo }) => {
  const { user } = useUser();
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateRepo, setShowCreateRepo] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [githubToken, setGithubToken] = useState(null);

  // Check if user has GitHub connected
  const githubAccount = user?.externalAccounts?.find(account => 
    account.provider === 'oauth_github'
  );

  const connectGitHub = async () => {
    try {
      // Use Clerk's built-in GitHub OAuth
      await user.createExternalAccount({
        provider: 'oauth_github',
        redirectUrl: window.location.href
      });
    } catch (error) {
      console.error('Failed to connect GitHub:', error);
      setError('Failed to connect to GitHub');
    }
  };

  const fetchRepositories = async () => {
    if (!githubAccount) return;

    setLoading(true);
    setError(null);

    try {
      // Get GitHub token from Clerk
      const token = await githubAccount.getToken();
      setGithubToken(token);
      
      // Fetch user's repositories
      const response = await fetch('https://api.github.com/user/repos', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        },
        params: new URLSearchParams({
          sort: 'updated',
          per_page: 100
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch repositories');
      }

      const repos = await response.json();
      setRepositories(repos);
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
      setError('Failed to fetch repositories');
    } finally {
      setLoading(false);
    }
  };

  const createRepository = async () => {
    if (!githubAccount || !newRepoName.trim()) return;

    setLoading(true);
    try {
      const token = await githubAccount.getToken();
      
      const response = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          name: newRepoName.trim(),
          private: newRepoPrivate,
          auto_init: true,
          description: `Created via SaasIt.ai for AI agent development`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create repository');
      }

      const newRepo = await response.json();
      setRepositories(prev => [newRepo, ...prev]);
      setNewRepoName('');
      setShowCreateRepo(false);
      onRepoSelected(newRepo);
    } catch (error) {
      console.error('Failed to create repository:', error);
      setError('Failed to create repository');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (githubAccount) {
      fetchRepositories();
    }
  }, [githubAccount]);

  if (!githubAccount) {
    return (
      <div className="p-6 border rounded-lg border-gray-200 bg-gray-50">
        <div className="text-center">
          <Github className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Connect your GitHub account
          </h3>
          <p className="text-gray-600 mb-4">
            Connect GitHub to manage repositories and sync your projects with AI agents
          </p>
          <button
            onClick={connectGitHub}
            className="btn-primary flex items-center gap-2 mx-auto"
          >
            <Github size={16} />
            Connect GitHub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Github size={20} className="text-gray-600" />
          <h3 className="font-medium">GitHub Repositories</h3>
          <span className="text-sm text-gray-500">
            ({repositories.length} repos)
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={fetchRepositories}
            disabled={loading}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Refresh
          </button>
          
          <button
            onClick={() => setShowCreateRepo(true)}
            className="btn-secondary text-sm flex items-center gap-1"
          >
            <Plus size={14} />
            New Repo
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Create New Repository Form */}
      {showCreateRepo && (
        <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
          <h4 className="font-medium mb-3">Create New Repository</h4>
          
          <div className="space-y-3">
            <div>
              <input
                type="text"
                placeholder="Repository name"
                value={newRepoName}
                onChange={(e) => setNewRepoName(e.target.value)}
                className="w-full px-3 py-2 border rounded text-sm"
                disabled={loading}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="private"
                checked={newRepoPrivate}
                onChange={(e) => setNewRepoPrivate(e.target.checked)}
                disabled={loading}
              />
              <label htmlFor="private" className="text-sm text-gray-600">
                Private repository
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={createRepository}
                disabled={loading || !newRepoName.trim()}
                className="btn-primary text-sm"
              >
                {loading ? 'Creating...' : 'Create Repository'}
              </button>
              
              <button
                onClick={() => setShowCreateRepo(false)}
                className="btn-secondary text-sm"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Repository List */}
      {loading && repositories.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Loading repositories...
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {repositories.map((repo) => (
            <div
              key={repo.id}
              onClick={() => onRepoSelected(repo)}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedRepo?.id === repo.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FolderOpen size={16} className="text-gray-500" />
                    <span className="font-medium text-sm truncate">
                      {repo.name}
                    </span>
                    {repo.private && (
                      <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                        Private
                      </span>
                    )}
                  </div>
                  
                  {repo.description && (
                    <p className="text-xs text-gray-600 mt-1 truncate">
                      {repo.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    {repo.language && (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        {repo.language}
                      </span>
                    )}
                    
                    <span className="flex items-center gap-1">
                      <GitBranch size={12} />
                      {repo.default_branch}
                    </span>
                    
                    <span>
                      Updated {new Date(repo.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <ExternalLink 
                  size={14} 
                  className="text-gray-400 hover:text-gray-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(repo.html_url, '_blank');
                  }}
                />
              </div>
            </div>
          ))}
          
          {repositories.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              <FolderOpen size={24} className="mx-auto mb-2 text-gray-400" />
              <p>No repositories found</p>
              <p className="text-sm">Create your first repository to get started</p>
            </div>
          )}
        </div>
      )}
      
      {/* Selected Repository Info */}
      {selectedRepo && (
        <div className="space-y-4">
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-800">
                  Connected to {selectedRepo.name}
                </span>
              </div>
              
              <button
                onClick={() => setShowAnalysis(!showAnalysis)}
                className="flex items-center gap-1 text-sm text-green-700 hover:text-green-800"
              >
                <Brain size={14} />
                Analyze
                {showAnalysis ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
            <p className="text-xs text-green-700 mt-1">
              AI agents will work with this repository
            </p>
          </div>

          {/* Project Analysis */}
          {showAnalysis && (
            <div className="border rounded-lg bg-white">
              <ProjectAnalyzer
                selectedRepo={selectedRepo}
                githubToken={githubToken}
                onAnalysisComplete={(analysis) => {
                  // Pass analysis data up to parent component
                  if (onRepoSelected) {
                    onRepoSelected(selectedRepo, analysis);
                  }
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GitHubConnector;