import React, { useState, useMemo } from 'react';
import { Search, Plus, Filter, Grid, List, Clock, Users, Grip } from 'lucide-react';
import { agents, agentCategories } from '../data/mock';
import useWorkflowStore from '../lib/stores/workflowStore';

const AgentLibrary = ({ activeTab, templates, onLoadTemplate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // Changed default to list for more compact view

  const { nodes } = useWorkflowStore();

  const filteredAgents = useMemo(() => {
    let filtered = agents;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(agent => 
        agent.category.toLowerCase() === selectedCategory
      );
    }

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

  const isAgentInCanvas = (agentId) => {
    return nodes.some(node => node.data.id === agentId);
  };

  const handleDragStart = (event, agent) => {
    event.dataTransfer.setData('application/json', JSON.stringify(agent));
    event.dataTransfer.effectAllowed = 'move';
  };

  const AgentCard = ({ agent, variant = 'grid' }) => {
    const isInCanvas = isAgentInCanvas(agent.id);
    
    if (variant === 'list') {
      return (
        <div 
          className={`voice-card ${agent.color} flex items-center gap-3 p-3 ${
            isInCanvas ? 'opacity-60 ring-2 ring-green-300' : 'hover-lift cursor-grab active:cursor-grabbing'
          }`}
          draggable={!isInCanvas}
          onDragStart={(e) => !isInCanvas && handleDragStart(e, agent)}
          title={agent.description}
        >
          <Grip size={14} className="text-gray-400 flex-shrink-0" />
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-lg flex-shrink-0 border border-gray-300/50">
            {agent.icon}
          </div>
          
          <div className="flex-1 min-w-0 flex items-center justify-between">
            <div className="flex items-center justify-between w-full">
              <div>
                <h3 className="font-medium text-sm truncate">{agent.name}</h3>
                <span className="text-xs text-gray-500">{agent.category}</span>
              </div>
              {isInCanvas && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span>✓</span>
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div 
        className={`voice-card ${agent.color} p-3 ${
          isInCanvas 
            ? 'opacity-60 ring-2 ring-green-300 cursor-default' 
            : 'hover-lift cursor-grab active:cursor-grabbing'
        } transition-all duration-200`}
        draggable={!isInCanvas}
        onDragStart={(e) => !isInCanvas && handleDragStart(e, agent)}
        title={`${agent.name} - ${agent.description}`}
      >
        <div className="flex items-start gap-2">
          <Grip size={12} className="text-gray-400 mt-1" />
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xl border border-gray-300/50">
                  {agent.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-sm leading-tight mb-1">{agent.name}</h3>
                  <p className="text-xs text-gray-500 line-clamp-1">{agent.description}</p>
                </div>
              </div>
              {isInCanvas && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span>✓</span> Added
                </span>
              )}
            </div>
            <p className="text-xs opacity-70 line-clamp-2">{agent.description}</p>
          </div>
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
      
      <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
        <div className="flex items-center gap-1">
          <span>🤖</span>
          <span>{template.agents.length} agents</span>
        </div>
        <div className="flex items-center gap-1">
          <span>✨</span>
          <span>Ready to use</span>
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
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-shrink-0 p-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
          <h3 className="font-medium mb-3">Workflow Templates</h3>
          <p className="text-sm opacity-70">
            Pre-configured agent teams for common use cases
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 min-h-0">
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
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b" style={{ borderColor: 'var(--border-light)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm">Agents</h3>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {filteredAgents.length}
            </span>
          </div>
          {nodes.length > 0 && (
            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
              <span>✓</span> {nodes.length} selected
            </span>
          )}
        </div>
        
        {/* Search */}
        <div className="relative mb-2">
          <Search size={14} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 opacity-50" />
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border rounded-md text-sm"
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
          
          <div className="text-xs text-gray-500">
            Drag agents to canvas
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex-shrink-0 p-3 border-b overflow-x-auto" style={{ borderColor: 'var(--border-light)' }}>
        <div className="flex gap-1.5 min-w-max">
          {agentCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-2 py-1 text-xs font-mono uppercase tracking-wider rounded-md transition-colors ${
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
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 min-h-0">
        {filteredAgents.length === 0 ? (
          <div className="text-center py-12">
            <Search size={48} className="mx-auto mb-4 opacity-30" />
            <h3 className="font-medium mb-2">No agents found</h3>
            <p className="text-sm opacity-70">
              Try adjusting your search or category filter
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3 text-xs bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2">
                <span className="text-blue-600">💫</span>
                <span className="font-medium text-gray-700">Drag & drop to add agents</span>
              </div>
            </div>
            <div className={viewMode === 'grid' ? 'grid gap-3' : 'space-y-2'}>
              {filteredAgents.map((agent) => (
                <AgentCard 
                  key={agent.id} 
                  agent={agent} 
                  variant={viewMode}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AgentLibrary;