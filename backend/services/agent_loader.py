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
        """Build a comprehensive context string for the world-class architect system prompt"""
        
        # Agent library overview
        agent_summary = self._build_agent_summary()
        
        # Industry patterns and knowledge
        patterns_context = self._build_patterns_context()
        
        # Risk and compliance context
        risk_context = self._build_risk_context()
        
        # Scale and performance context
        scale_context = self._build_scale_context()
        
        return f"""{agent_summary}

{patterns_context}

{risk_context}

{scale_context}"""

    def _build_agent_summary(self) -> str:
        """Build the agent library summary"""
        lines = ["🧠 ELITE AI AGENT LIBRARY:\n"]
        
        category_descriptions = {
            "engineering": "Full-stack development, DevOps automation, and technical implementation",
            "design": "User experience, visual design, and design systems",
            "marketing": "Growth hacking, content creation, and viral marketing strategies", 
            "product": "Product strategy, user research, and market analysis",
            "project-management": "Sprint planning, team coordination, and delivery optimization",
            "studio-operations": "Business operations, analytics, and resource management",
            "testing": "Quality assurance, performance testing, and reliability engineering",
            "bonus": "Specialized tools and experimental capabilities"
        }
        
        for category in self.get_categories():
            agents = self.get_agents_by_category(category)
            if agents:
                agent_names = [agent['id'] for agent in agents]
                description = category_descriptions.get(category, "Specialized capabilities")
                lines.append(f"📁 {category.upper()}: {description}")
                lines.append(f"   Available agents: {', '.join(agent_names)}\n")
                
        return '\n'.join(lines)

    def _build_patterns_context(self) -> str:
        """Build architectural patterns and anti-patterns context"""
        return """🏗️ ARCHITECTURAL PATTERNS & ANTI-PATTERNS:

PROVEN SUCCESS PATTERNS:
• Netflix Microservices: Fault-tolerant distributed systems with circuit breakers
• Stripe API Design: Developer-first, consistent, versioned REST APIs with webhooks
• Airbnb Growth: A/B testing everything, data-driven product decisions
• Uber Scale: Event-driven architecture with real-time processing
• Shopify Modularity: Plugin architecture enabling rapid customization
• Discord Performance: Elixir/Rust for low-latency real-time communication
• GitHub Collaboration: Git-based workflows, pull request culture
• Slack Integration: Webhook-heavy integration ecosystem

COSTLY ANTI-PATTERNS TO AVOID:
❌ Premature Microservices: Breaking monoliths too early (costs: complexity, debugging)
❌ Framework Chasing: Adopting bleeding-edge tech without business justification
❌ Technical Debt Accumulation: Shipping fast without refactoring plan
❌ Single Points of Failure: Critical dependencies without redundancy
❌ Data Silos: Teams owning data without cross-functional access
❌ Feature Factory: Building features without measuring impact
❌ Scale Assumptions: Optimizing for problems you don't have yet
❌ Vendor Lock-in: Over-relying on proprietary cloud services

ARCHITECTURE DECISION RECORDS:
Document key decisions with context, alternatives considered, and trade-offs."""

    def _build_risk_context(self) -> str:
        """Build risk management and compliance context"""
        return """🛡️ RISK MANAGEMENT & COMPLIANCE FRAMEWORK:

SECURITY BY DESIGN:
• Authentication: OAuth2/OIDC, JWT tokens, MFA for admin access
• Authorization: RBAC with principle of least privilege
• Data Protection: Encryption at rest/transit, PII tokenization
• Infrastructure: VPCs, WAF, DDoS protection, vulnerability scanning
• Monitoring: SIEM, intrusion detection, security incident response

COMPLIANCE REQUIREMENTS:
📋 GDPR (EU): Data minimization, consent management, right to deletion
📋 CCPA (California): Consumer privacy rights, data transparency
📋 HIPAA (Healthcare): PHI protection, business associate agreements
📋 SOC2 (Enterprise): Security, availability, processing integrity
📋 PCI DSS (Payments): Payment card data protection standards

COMMON FAILURE MODES:
⚠️ Database Overload: Poor query optimization, missing indexes
⚠️ API Rate Limiting: Cascading failures without circuit breakers
⚠️ Memory Leaks: Unbounded data structures, missing cleanup
⚠️ Third-party Outages: External dependencies without fallbacks
⚠️ Configuration Drift: Manual changes without version control
⚠️ Data Loss: Backup failures, accidental deletions

MITIGATION STRATEGIES:
✅ Circuit Breakers: Fail fast, avoid cascade failures
✅ Health Checks: Proactive monitoring, automated recovery
✅ Graceful Degradation: Core features work when peripherals fail
✅ Disaster Recovery: RTO/RPO targets, tested backup procedures
✅ Chaos Engineering: Intentional failure testing (Netflix Chaos Monkey)"""

    def _build_scale_context(self) -> str:
        """Build scale and performance context"""
        return """⚡ SCALE & PERFORMANCE GUIDELINES:

SCALE THRESHOLDS:
📈 0-1K users: Monolith + single database acceptable
📈 1K-10K users: Add caching, CDN, basic monitoring
📈 10K-100K users: Database read replicas, microservices for hot paths
📈 100K-1M users: Distributed systems, event streaming, multi-region
📈 1M+ users: Advanced caching, sharding, specialized databases

PERFORMANCE BUDGETS:
⚡ Page Load: <3s mobile, <1s desktop (Google Core Web Vitals)
⚡ API Response: <200ms p95, <500ms p99
⚡ Database Queries: <100ms typical, indexed properly
⚡ Search Results: <1s for simple queries, <3s for complex
⚡ Video Streaming: <2s startup time, adaptive bitrate

TECHNOLOGY EVOLUTION PATH:
🔄 Phase 1: Proven stack (React/Next.js, Node.js/Python, PostgreSQL)
🔄 Phase 2: Specialization (Redis cache, Elasticsearch, queue systems)
🔄 Phase 3: Distribution (Kubernetes, service mesh, event streaming)
🔄 Phase 4: Optimization (custom protocols, edge computing, ML/AI)

TEAM SCALING LAWS:
👥 1-3 developers: Full-stack generalists, shared responsibilities
👥 4-8 developers: Specialization begins, dedicated DevOps
👥 9-15 developers: Multiple teams, API contracts, shared infrastructure
👥 16+ developers: Platform teams, developer experience focus

DATABASE SCALING STRATEGY:
💾 Read Replicas → Connection Pooling → Query Optimization → Caching → Sharding → Multi-DB"""