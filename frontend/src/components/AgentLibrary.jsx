import React, { useState, useMemo } from 'react';
import { Search, Plus, Filter, Grid, List, Clock, Users } from 'lucide-react';
import { agents, agentCategories } from '../data/mock';

const AgentLibrary = ({ onAddAgent, selectedAgents, activeTab, templates, onLoadTemplate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  const filteredAgents = useMemo(() => {
    let filtered = agents;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(agent => 
        agent.category.toLowerCase() === selectedCategory
      );
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(agent =>
        agent.name.toLowerCase().includes(query) ||
        agent.description.toLowerCase().includes(query) ||
        agent.capabilities?.some(cap => cap.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [searchQuery, selectedCategory]);

  const isAgentSelected = (agentId) => {
    return selectedAgents.some(agent => agent.id === agentId);
  };

  const handleAddAgent = (agent) => {
    if (!isAgentSelected(agent.id)) {
      onAddAgent(agent);
    }
  };

  const AgentCard = ({ agent, variant = 'grid' }) => {
    const isSelected = isAgentSelected(agent.id);
    
    if (variant === 'list') {
      return (
        <div 
          className={`voice-card ${agent.color} flex items-center gap-4 ${
            isSelected ? 'opacity-60 ring-2 ring-green-300' : 'hover-lift cursor-pointer'
          }`}
          onClick={() => !isSelected && handleAddAgent(agent)}
        >
          <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center text-xl">
            {agent.icon}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium">{agent.name}</h3>
              <span className="text-xs font-mono uppercase tracking-wider opacity-70">
                {agent.category}
              </span>
            </div>
            <p className="text-sm opacity-80 mb-2">{agent.description}</p>
            <div className="flex items-center gap-3 text-xs opacity-70">
              <div className="flex items-center gap-1">
                <Clock size={12} />
                <span>{agent.estimatedTime}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{agent.capabilities?.length || 0} capabilities</span>
              </div>
            </div>
          </div>
          
          <button
            className={`btn-secondary ${isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isSelected}
            onClick={(e) => {
              e.stopPropagation();
              !isSelected && handleAddAgent(agent);
            }}
          >
            {isSelected ? 'Added' : <Plus size={16} />}
          </button>
        </div>
      );
    }

    return (
      <div 
        className={`voice-card ${agent.color} ${
          isSelected ? 'opacity-60 ring-2 ring-green-300' : 'hover-lift cursor-pointer'
        }`}
        onClick={() => !isSelected && handleAddAgent(agent)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-xl">
            {agent.icon}
          </div>
          <button
            className={`btn-secondary p-2 ${isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isSelected}
            onClick={(e) => {
              e.stopPropagation();
              !isSelected && handleAddAgent(agent);
            }}
          >
            {isSelected ? 'Added' : <Plus size={16} />}
          </button>
        </div>
        
        <h3 className="font-medium mb-1">{agent.name}</h3>
        <p className="text-xs font-mono uppercase tracking-wider opacity-70 mb-2">
          {agent.category}
        </p>
        <p className="text-sm mb-3 leading-relaxed">{agent.description}</p>
        
        <div className="flex items-center gap-2 text-xs opacity-70">
          <Clock size={12} />
          <span>{agent.estimatedTime}</span>
        </div>
      </div>
    );
  };

  const TemplateCard = ({ template }) => (
    <div className={`voice-card ${template.color} hover-lift cursor-pointer`}
         onClick={() => onLoadTemplate(template)}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-medium mb-1">{template.name}</h3>
          <p className="text-xs font-mono uppercase tracking-wider opacity-70 mb-2">
            {template.category}
          </p>
        </div>
        <button
          className="btn-secondary p-2"
          onClick={(e) => {
            e.stopPropagation();
            onLoadTemplate(template);
          }}
        >
          <Plus size={16} />
        </button>
      </div>
      
      <p className="text-sm mb-3 leading-relaxed">{template.description}</p>
      
      <div className="flex items-center gap-4 text-xs opacity-70 mb-3">
        <div className="flex items-center gap-1">
          <Users size={12} />
          <span>{template.agents.length} agents</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock size={12} />
          <span>{template.estimatedTime}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {template.agents.slice(0, 3).map((agentId, index) => {
          const agent = agents.find(a => a.id === agentId);
          return agent ? (
            <span
              key={index}
              className="text-xs px-2 py-1 rounded-full"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                border: '1px solid rgba(0, 0, 0, 0.1)'
              }}
            >
              {agent.name}
            </span>
          ) : null;
        })}
        {template.agents.length > 3 && (
          <span className="text-xs px-2 py-1 rounded-full opacity-70">
            +{template.agents.length - 3} more
          </span>
        )}
      </div>
    </div>
  );

  if (activeTab === 'templates') {
    return (
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
          <h3 className="font-medium mb-3">Workflow Templates</h3>
          <p className="text-sm opacity-70">
            Pre-configured agent teams for common use cases
          </p>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          <div className="grid gap-4">
            {templates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-medium">Agent Library</h3>
          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
            {filteredAgents.length} agents
          </span>
        </div>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 opacity-50" />
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
            style={{ 
              borderColor: 'var(--border-input)',
              backgroundColor: 'var(--bg-card)'
            }}
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
            >
              <List size={16} />
            </button>
          </div>
          
          <button className="flex items-center gap-2 text-sm opacity-70 hover:opacity-100">
            <Filter size={14} />
            Filter
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="p-4 border-b overflow-x-auto" style={{ borderColor: 'var(--border-light)' }}>
        <div className="flex gap-2 min-w-max">
          {agentCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-full transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category.name} ({category.count})
            </button>
          ))}
        </div>
      </div>

      {/* Agents Grid/List */}
      <div className="flex-1 overflow-auto p-4">
        {filteredAgents.length === 0 ? (
          <div className="text-center py-12">
            <Search size={48} className="mx-auto mb-4 opacity-30" />
            <h3 className="font-medium mb-2">No agents found</h3>
            <p className="text-sm opacity-70">
              Try adjusting your search or category filter
            </p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid gap-4' : 'space-y-3'}>
            {filteredAgents.map((agent) => (
              <AgentCard 
                key={agent.id} 
                agent={agent} 
                variant={viewMode}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentLibrary;