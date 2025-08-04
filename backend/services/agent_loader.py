import os
import yaml
from pathlib import Path
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class AgentLoader:
    """Loads and parses agent definitions from markdown files"""
    
    def __init__(self, agents_dir: Optional[Path] = None):
        if agents_dir is None:
            # Default to agents directory relative to backend
            self.agents_dir = Path(__file__).parent.parent.parent / "agents"
        else:
            self.agents_dir = Path(agents_dir)
            
        self.agents_cache = {}
        self._load_all_agents()
    
    def _load_all_agents(self):
        """Load all agent definitions from the agents directory"""
        if not self.agents_dir.exists():
            logger.warning(f"Agents directory not found: {self.agents_dir}")
            return
            
        # Scan all subdirectories for .md files
        for category_dir in self.agents_dir.iterdir():
            if category_dir.is_dir() and not category_dir.name.startswith('.'):
                for agent_file in category_dir.glob("*.md"):
                    try:
                        agent_data = self._parse_agent_file(agent_file)
                        if agent_data:
                            agent_id = agent_file.stem
                            agent_data['id'] = agent_id
                            agent_data['category'] = category_dir.name
                            self.agents_cache[agent_id] = agent_data
                    except Exception as e:
                        logger.error(f"Error loading agent {agent_file}: {e}")
    
    def _parse_agent_file(self, file_path: Path) -> Optional[Dict]:
        """Parse a single agent markdown file"""
        try:
            content = file_path.read_text(encoding='utf-8')
            
            # Split frontmatter and content
            parts = content.split('---', 2)
            if len(parts) < 3:
                return None
                
            # Parse YAML frontmatter
            frontmatter = yaml.safe_load(parts[1])
            
            # Get the main content
            main_content = parts[2].strip()
            
            return {
                'name': frontmatter.get('name', ''),
                'description': frontmatter.get('description', ''),
                'color': frontmatter.get('color', 'blue'),
                'tools': frontmatter.get('tools', []),
                'content': main_content,
                'file_path': str(file_path)
            }
            
        except Exception as e:
            logger.error(f"Error parsing agent file {file_path}: {e}")
            return None
    
    def get_all_agents(self) -> Dict[str, Dict]:
        """Get all loaded agents"""
        return self.agents_cache
    
    def get_agent(self, agent_id: str) -> Optional[Dict]:
        """Get a specific agent by ID"""
        return self.agents_cache.get(agent_id)
    
    def get_agents_by_category(self, category: str) -> List[Dict]:
        """Get all agents in a specific category"""
        return [
            agent for agent in self.agents_cache.values()
            if agent.get('category') == category
        ]
    
    def get_categories(self) -> List[str]:
        """Get all available agent categories"""
        categories = set()
        for agent in self.agents_cache.values():
            if 'category' in agent:
                categories.add(agent['category'])
        return sorted(list(categories))
    
    def get_agent_summary(self) -> Dict[str, List[str]]:
        """Get a summary of all agents grouped by category"""
        summary = {}
        for agent in self.agents_cache.values():
            category = agent.get('category', 'other')
            if category not in summary:
                summary[category] = []
            summary[category].append(agent.get('id', ''))
        return summary
    
    def build_agent_context(self) -> str:
        """Build a context string with all available agents for the system prompt"""
        lines = ["AVAILABLE AGENTS BY CATEGORY:"]
        
        for category in self.get_categories():
            agents = self.get_agents_by_category(category)
            if agents:
                agent_names = [agent['id'] for agent in agents]
                lines.append(f"\n{category.upper()}: {', '.join(agent_names)}")
                
        return '\n'.join(lines)