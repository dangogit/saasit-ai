import React, { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { Github, ExternalLink, Plus, FolderOpen, GitBranch, Brain, ChevronDown, ChevronUp, Shield, Lock, CheckCircle2, Clock } from 'lucide-react';
import ProjectAnalyzer from './ProjectAnalyzer';

const GitHubConnector = ({ onRepoSelected, selectedRepo, onSkip }) => {
  const { user } = useUser();
  const clerk = useClerk();
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
      setLoading(true);
      setError(null);
      
      // Use Clerk's proper OAuth flow with redirectToSignIn
      await clerk.authenticateWithRedirect({
        strategy: 'oauth_github',
        redirectUrl: window.location.href,
        redirectUrlComplete: window.location.href
      });
    } catch (error) {
      console.error('Failed to connect GitHub:', error);
      setError('Failed to connect to GitHub');
      setLoading(false);
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
      <div className="space-y-6">
        {/* Main Connection Card */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
          <div className="text-center">
            <button
              onClick={connectGitHub}
              disabled={loading}
              className="bg-gradient-to-r from-gray-700 to-black hover:from-gray-600 hover:to-gray-900 text-white px-8 py-4 rounded-xl font-medium transition-all duration-300 flex items-center gap-3 mx-auto hover:scale-105 shadow-lg border border-white/20 mb-4"
            >
              <Github size={20} />
              {loading ? 'Connecting...' : 'CONNECT GITHUB'}
            </button>
            
            {/* Trust Indicators */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-white/20">
              <div className="text-center">
                <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Lock size={16} className="text-green-400" />
                </div>
                <p className="text-xs text-white/80">Secure OAuth</p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Shield size={16} className="text-blue-400" />
                </div>
                <p className="text-xs text-white/80">Read-only Access</p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 size={16} className="text-purple-400" />
                </div>
                <p className="text-xs text-white/80">SOC 2 Compliant</p>
              </div>
            </div>
            
            {error && (
              <div className="mt-4 bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-xl p-4">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Safety Information */}
        <div className="bg-green-500/10 backdrop-blur-sm border border-green-400/30 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-green-500/30 rounded-full flex items-center justify-center mt-0.5">
              <Shield size={14} className="text-green-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-green-100 mb-1">Why is this safe?</h4>
              <ul className="text-xs text-green-200/90 space-y-1">
                <li>• We only request read-only access to analyze your code</li>
                <li>• No modifications are made without your explicit permission</li>
                <li>• Your code stays private and secure on GitHub</li>
                <li>• Enterprise-grade security with SOC 2 compliance</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Skip Option */}
        <div className="text-center">
          <button
            onClick={() => onSkip && onSkip()}
            className="text-white/60 hover:text-white/80 text-sm transition-colors duration-200 flex items-center gap-2 mx-auto"
          >
            <Clock size={14} />
            Do this later, proceed without GitHub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
              <Github size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">GitHub Repositories</h3>
              <span className="text-sm text-white/60">
                {repositories.length} repositories found
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={fetchRepositories}
              disabled={loading}
              className="px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 disabled:opacity-50"
            >
              Refresh
            </button>
            
            <button
              onClick={() => setShowCreateRepo(true)}
              className="px-4 py-2 bg-blue-500/30 hover:bg-blue-500/40 text-blue-100 text-sm rounded-lg flex items-center gap-2 transition-all duration-200 border border-blue-400/30"
            >
              <Plus size={14} />
              New Repo
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-xl p-4">
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      {/* Create New Repository Form */}
      {showCreateRepo && (
        <div className="bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 rounded-2xl p-6">
          <h4 className="font-semibold text-white mb-4">Create New Repository</h4>
          
          <div className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Repository name"
                value={newRepoName}
                onChange={(e) => setNewRepoName(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400"
                disabled={loading}
              />
            </div>
            
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="private"
                checked={newRepoPrivate}
                onChange={(e) => setNewRepoPrivate(e.target.checked)}
                disabled={loading}
                className="w-4 h-4 text-blue-400 bg-white/10 border-white/30 rounded focus:ring-blue-400"
              />
              <label htmlFor="private" className="text-sm text-white/90">
                Private repository
              </label>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={createRepository}
                disabled={loading || !newRepoName.trim()}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Repository'}
              </button>
              
              <button
                onClick={() => setShowCreateRepo(false)}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all duration-200 border border-white/30"
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
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Github size={24} className="text-white/60" />
          </div>
          <p className="text-white/60">Loading repositories...</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {repositories.map((repo) => (
            <div
              key={repo.id}
              onClick={() => onRepoSelected(repo, githubToken)}
              className={`group p-4 backdrop-blur-sm border rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                selectedRepo?.id === repo.id
                  ? 'bg-blue-500/30 border-blue-400/50 shadow-lg'
                  : 'bg-white/10 border-white/20 hover:bg-white/15 hover:border-white/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg flex items-center justify-center">
                      <FolderOpen size={16} className="text-white" />
                    </div>
                    <span className="font-semibold text-white truncate">
                      {repo.name}
                    </span>
                    {repo.private && (
                      <span className="text-xs bg-yellow-500/30 text-yellow-100 px-2 py-1 rounded-lg border border-yellow-400/30">
                        Private
                      </span>
                    )}
                    {selectedRepo?.id === repo.id && (
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </div>
                  
                  {repo.description && (
                    <p className="text-sm text-white/80 mb-2 truncate">
                      {repo.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-white/60">
                    {repo.language && (
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-purple-500"></span>
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