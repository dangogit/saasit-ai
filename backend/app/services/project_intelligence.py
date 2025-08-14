"""
Project Intelligence Service

Analyzes codebases to detect technologies, frameworks, and patterns.
Suggests compatible AI agents and provides incremental enhancement recommendations.
"""

import os
import json
import asyncio
import logging
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import re
from collections import Counter, defaultdict

from app.services.github_service import GitHubService

logger = logging.getLogger(__name__)


class ProjectIntelligence:
    """
    Analyzes project structure and codebase to provide intelligent recommendations
    for AI agent selection and workflow optimization.
    """
    
    def __init__(self, github_service: GitHubService = None):
        self.github_service = github_service or GitHubService()
        
        # Technology detection patterns
        self.tech_patterns = {
            # Frontend Frameworks
            "react": {
                "files": ["package.json"],
                "patterns": [r'"react":', r'import.*from.*["\']react["\']'],
                "indicators": ["jsx", "tsx", "components/", "src/components/"]
            },
            "vue": {
                "files": ["package.json", "*.vue"],
                "patterns": [r'"vue":', r'<template>', r'<script>', r'<style>'],
                "indicators": ["vue.config.js", ".vue"]
            },
            "angular": {
                "files": ["package.json", "angular.json"],
                "patterns": [r'"@angular/', r'ng serve', r'ng build'],
                "indicators": ["angular.json", "src/app/", ".component.ts"]
            },
            "nextjs": {
                "files": ["package.json", "next.config.js"],
                "patterns": [r'"next":', r'next build', r'next dev'],
                "indicators": ["pages/", "app/", "next.config.js"]
            },
            "svelte": {
                "files": ["package.json", "*.svelte"],
                "patterns": [r'"svelte":', r'<script>', r'export let'],
                "indicators": ["svelte.config.js", ".svelte"]
            },
            
            # Backend Frameworks
            "fastapi": {
                "files": ["requirements.txt", "pyproject.toml", "*.py"],
                "patterns": [r'fastapi', r'from fastapi', r'import fastapi'],
                "indicators": ["main.py", "server.py", "api/"]
            },
            "django": {
                "files": ["requirements.txt", "manage.py", "settings.py"],
                "patterns": [r'django', r'from django', r'import django'],
                "indicators": ["manage.py", "settings.py", "wsgi.py"]
            },
            "flask": {
                "files": ["requirements.txt", "*.py"],
                "patterns": [r'flask', r'from flask', r'import flask'],
                "indicators": ["app.py", "run.py", "wsgi.py"]
            },
            "expressjs": {
                "files": ["package.json", "*.js"],
                "patterns": [r'"express":', r'require.*express', r'import.*express'],
                "indicators": ["server.js", "app.js", "index.js"]
            },
            "nestjs": {
                "files": ["package.json", "nest-cli.json"],
                "patterns": [r'"@nestjs/', r'@Controller', r'@Injectable'],
                "indicators": ["nest-cli.json", "main.ts", "src/"]
            },
            
            # Databases
            "postgresql": {
                "files": ["requirements.txt", "package.json", "docker-compose.yml"],
                "patterns": [r'psycopg2', r'pg', r'postgresql', r'postgres'],
                "indicators": ["migrations/", "alembic/", "prisma/"]
            },
            "mongodb": {
                "files": ["requirements.txt", "package.json"],
                "patterns": [r'pymongo', r'mongoose', r'mongodb'],
                "indicators": ["models/", "schemas/"]
            },
            "mysql": {
                "files": ["requirements.txt", "package.json"],
                "patterns": [r'mysql', r'pymysql', r'mysql2'],
                "indicators": ["migrations/", "models/"]
            },
            "sqlite": {
                "files": ["*.py", "*.js", "*.db"],
                "patterns": [r'sqlite3', r'sqlite'],
                "indicators": [".db", ".sqlite", ".sqlite3"]
            },
            
            # DevOps & Infrastructure
            "docker": {
                "files": ["Dockerfile", "docker-compose.yml", ".dockerignore"],
                "patterns": [r'FROM ', r'RUN ', r'COPY '],
                "indicators": ["Dockerfile", "docker-compose.yml"]
            },
            "kubernetes": {
                "files": ["*.yaml", "*.yml"],
                "patterns": [r'apiVersion:', r'kind:', r'metadata:'],
                "indicators": ["k8s/", "kube/", "kubernetes/"]
            },
            "terraform": {
                "files": ["*.tf", "terraform.tfvars"],
                "patterns": [r'resource "', r'provider "', r'variable "'],
                "indicators": [".tf", ".tfvars", "terraform/"]
            },
            
            # Testing
            "jest": {
                "files": ["package.json", "jest.config.js"],
                "patterns": [r'"jest":', r'describe\(', r'test\(', r'it\('],
                "indicators": ["__tests__/", "*.test.js", "*.spec.js"]
            },
            "pytest": {
                "files": ["requirements.txt", "pytest.ini", "pyproject.toml"],
                "patterns": [r'pytest', r'def test_', r'import pytest'],
                "indicators": ["tests/", "test_*.py", "*_test.py"]
            },
            "cypress": {
                "files": ["package.json", "cypress.config.js"],
                "patterns": [r'"cypress":', r'cy\.', r'describe\('],
                "indicators": ["cypress/", "*.cy.js", "e2e/"]
            }
        }
        
        # Agent recommendations based on detected technologies
        self.agent_recommendations = {
            "react": ["frontend-developer", "ui-designer", "rapid-prototyper"],
            "vue": ["frontend-developer", "ui-designer", "rapid-prototyper"],
            "angular": ["frontend-developer", "ui-designer", "enterprise-architect"],
            "nextjs": ["fullstack-developer", "frontend-developer", "seo-specialist"],
            "svelte": ["frontend-developer", "ui-designer", "performance-optimizer"],
            
            "fastapi": ["backend-developer", "api-architect", "documentation-writer"],
            "django": ["backend-developer", "fullstack-developer", "security-auditor"],
            "flask": ["backend-developer", "rapid-prototyper", "api-architect"],
            "expressjs": ["backend-developer", "fullstack-developer", "api-architect"],
            "nestjs": ["backend-developer", "enterprise-architect", "api-architect"],
            
            "postgresql": ["database-designer", "data-engineer", "performance-optimizer"],
            "mongodb": ["database-designer", "backend-developer", "data-engineer"],
            "mysql": ["database-designer", "data-engineer", "legacy-modernizer"],
            
            "docker": ["devops-engineer", "infrastructure-architect", "deployment-specialist"],
            "kubernetes": ["devops-engineer", "infrastructure-architect", "scalability-expert"],
            "terraform": ["infrastructure-architect", "cloud-engineer", "devops-engineer"],
            
            "jest": ["test-automation-engineer", "qa-specialist", "frontend-developer"],
            "pytest": ["test-automation-engineer", "qa-specialist", "backend-developer"],
            "cypress": ["test-automation-engineer", "qa-specialist", "e2e-tester"]
        }

    async def analyze_repository(
        self, 
        github_token: str, 
        owner: str, 
        repo: str
    ) -> Dict[str, Any]:
        """
        Comprehensive repository analysis including technology detection,
        code quality assessment, and AI agent recommendations.
        """
        try:
            logger.info(f"Starting repository analysis for {owner}/{repo}")
            
            # Get repository structure and content
            repo_structure = await self.github_service.analyze_repository_structure(
                github_token, owner, repo
            )
            
            # Detect technologies and frameworks
            technologies = await self._detect_technologies(
                github_token, owner, repo, repo_structure
            )
            
            # Analyze code patterns and conventions
            code_patterns = await self._analyze_code_patterns(
                github_token, owner, repo, technologies
            )
            
            # Generate AI agent recommendations
            agent_recommendations = self._generate_agent_recommendations(
                technologies, code_patterns
            )
            
            # Assess project complexity and scope
            complexity_analysis = self._assess_project_complexity(
                repo_structure, technologies, code_patterns
            )
            
            # Generate enhancement suggestions
            enhancement_suggestions = self._generate_enhancement_suggestions(
                technologies, code_patterns, complexity_analysis
            )
            
            analysis_result = {
                "repository": {
                    "owner": owner,
                    "name": repo,
                    "analyzed_at": asyncio.get_event_loop().time()
                },
                "structure": repo_structure,
                "technologies": technologies,
                "code_patterns": code_patterns,
                "complexity": complexity_analysis,
                "agent_recommendations": agent_recommendations,
                "enhancement_suggestions": enhancement_suggestions,
                "confidence_score": self._calculate_confidence_score(
                    technologies, code_patterns
                )
            }
            
            logger.info(f"Repository analysis completed for {owner}/{repo}")
            return analysis_result
            
        except Exception as e:
            logger.error(f"Failed to analyze repository {owner}/{repo}: {e}")
            raise

    async def _detect_technologies(
        self, 
        github_token: str, 
        owner: str, 
        repo: str, 
        structure: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Detect technologies and frameworks used in the repository."""
        detected_techs = {}
        confidence_scores = {}
        
        # Get key files for analysis
        key_files = await self._get_key_files_content(
            github_token, owner, repo, structure
        )
        
        for tech_name, tech_config in self.tech_patterns.items():
            score = 0
            evidence = []
            
            # Check file patterns
            for filename in tech_config.get("files", []):
                if self._file_exists_in_structure(filename, structure):
                    score += 2
                    evidence.append(f"Found {filename}")
            
            # Check content patterns
            for pattern in tech_config.get("patterns", []):
                for file_path, content in key_files.items():
                    if re.search(pattern, content, re.IGNORECASE | re.MULTILINE):
                        score += 1
                        evidence.append(f"Pattern '{pattern}' in {file_path}")
            
            # Check structural indicators
            for indicator in tech_config.get("indicators", []):
                if self._indicator_exists_in_structure(indicator, structure):
                    score += 1
                    evidence.append(f"Structure indicator: {indicator}")
            
            if score > 0:
                detected_techs[tech_name] = {
                    "detected": score >= 2,  # Require at least 2 points for detection
                    "confidence": min(score / 5.0, 1.0),  # Normalize to 0-1
                    "evidence": evidence[:3]  # Limit evidence to avoid clutter
                }
                confidence_scores[tech_name] = score
        
        # Sort by confidence
        sorted_techs = dict(sorted(
            detected_techs.items(),
            key=lambda x: x[1]["confidence"],
            reverse=True
        ))
        
        return {
            "detected": sorted_techs,
            "primary_stack": self._identify_primary_stack(sorted_techs),
            "total_technologies": len([t for t in sorted_techs.values() if t["detected"]]),
            "analysis_coverage": len(key_files) / max(len(structure.get("files", [])), 1)
        }

    async def _analyze_code_patterns(
        self, 
        github_token: str, 
        owner: str, 
        repo: str, 
        technologies: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze code patterns, conventions, and quality indicators."""
        patterns = {
            "file_organization": {},
            "naming_conventions": {},
            "architecture_patterns": {},
            "code_quality": {},
            "testing_patterns": {}
        }
        
        # Get repository contents for pattern analysis
        try:
            repo_contents = await self.github_service.get_repository_contents(
                github_token, owner, repo
            )
            
            # Analyze file organization
            patterns["file_organization"] = self._analyze_file_organization(repo_contents)
            
            # Analyze naming conventions
            patterns["naming_conventions"] = self._analyze_naming_conventions(repo_contents)
            
            # Analyze architecture patterns
            patterns["architecture_patterns"] = self._detect_architecture_patterns(
                repo_contents, technologies
            )
            
            # Analyze testing patterns
            patterns["testing_patterns"] = self._analyze_testing_patterns(repo_contents)
            
        except Exception as e:
            logger.warning(f"Could not analyze all code patterns: {e}")
            patterns["analysis_error"] = str(e)
        
        return patterns

    def _generate_agent_recommendations(
        self, 
        technologies: Dict[str, Any], 
        patterns: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate AI agent recommendations based on detected technologies and patterns."""
        recommendations = []
        agent_scores = defaultdict(int)
        reasoning = defaultdict(list)
        
        # Score agents based on detected technologies
        detected_techs = technologies.get("detected", {})
        for tech_name, tech_info in detected_techs.items():
            if tech_info.get("detected", False):
                confidence = tech_info.get("confidence", 0)
                for agent in self.agent_recommendations.get(tech_name, []):
                    agent_scores[agent] += confidence * 10
                    reasoning[agent].append(f"Detected {tech_name} (confidence: {confidence:.1f})")
        
        # Adjust scores based on code patterns
        file_org = patterns.get("file_organization", {})
        if file_org.get("has_tests", False):
            for agent in ["test-automation-engineer", "qa-specialist"]:
                agent_scores[agent] += 5
                reasoning[agent].append("Has existing test structure")
        
        if file_org.get("has_docs", False):
            agent_scores["documentation-writer"] += 3
            reasoning["documentation-writer"].append("Has documentation structure")
        
        if file_org.get("has_ci_cd", False):
            for agent in ["devops-engineer", "deployment-specialist"]:
                agent_scores[agent] += 4
                reasoning[agent].append("Has CI/CD configuration")
        
        # Convert scores to recommendations
        for agent, score in sorted(agent_scores.items(), key=lambda x: x[1], reverse=True):
            if score > 0:
                recommendations.append({
                    "agent_id": agent,
                    "score": min(score, 100),  # Cap at 100
                    "confidence": min(score / 50.0, 1.0),  # Normalize to 0-1
                    "reasoning": reasoning[agent][:3],  # Limit reasoning points
                    "category": self._get_agent_category(agent)
                })
        
        return recommendations[:10]  # Return top 10 recommendations

    def _generate_enhancement_suggestions(
        self, 
        technologies: Dict[str, Any], 
        patterns: Dict[str, Any], 
        complexity: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate specific enhancement suggestions for the project."""
        suggestions = []
        
        detected_techs = technologies.get("detected", {})
        file_org = patterns.get("file_organization", {})
        
        # Testing suggestions
        if not file_org.get("has_tests", False):
            test_framework = self._suggest_test_framework(detected_techs)
            suggestions.append({
                "type": "testing",
                "priority": "high",
                "title": "Add Test Suite",
                "description": f"Implement comprehensive testing with {test_framework}",
                "estimated_effort": "1-2 days",
                "agents": ["test-automation-engineer", "qa-specialist"]
            })
        
        # Documentation suggestions
        if not file_org.get("has_docs", False):
            suggestions.append({
                "type": "documentation",
                "priority": "medium",
                "title": "Add Project Documentation",
                "description": "Create README, API docs, and developer guides",
                "estimated_effort": "0.5-1 day",
                "agents": ["documentation-writer", "technical-writer"]
            })
        
        # CI/CD suggestions
        if not file_org.get("has_ci_cd", False):
            suggestions.append({
                "type": "devops",
                "priority": "medium",
                "title": "Setup CI/CD Pipeline",
                "description": "Automated testing, building, and deployment",
                "estimated_effort": "1-2 days",
                "agents": ["devops-engineer", "deployment-specialist"]
            })
        
        # Security suggestions
        if complexity.get("security_score", 0) < 0.7:
            suggestions.append({
                "type": "security",
                "priority": "high",
                "title": "Security Audit & Hardening",
                "description": "Review and improve security practices",
                "estimated_effort": "1-3 days",
                "agents": ["security-auditor", "penetration-tester"]
            })
        
        # Performance suggestions
        if complexity.get("complexity_score", 0) > 0.8:
            suggestions.append({
                "type": "performance",
                "priority": "medium",
                "title": "Performance Optimization",
                "description": "Identify and resolve performance bottlenecks",
                "estimated_effort": "2-4 days",
                "agents": ["performance-optimizer", "backend-architect"]
            })
        
        return suggestions

    async def _get_key_files_content(
        self, 
        github_token: str, 
        owner: str, 
        repo: str, 
        structure: Dict[str, Any]
    ) -> Dict[str, str]:
        """Get content of key files for analysis."""
        key_files = {}
        important_files = [
            "package.json", "requirements.txt", "Dockerfile", "docker-compose.yml",
            "README.md", "setup.py", "pyproject.toml", "tsconfig.json",
            "angular.json", "next.config.js", "vue.config.js"
        ]
        
        try:
            for file_info in structure.get("files", []):
                file_path = file_info.get("path", "")
                file_name = os.path.basename(file_path)
                
                if file_name in important_files or any(
                    pattern in file_path for pattern in [".config.", ".json", ".yaml", ".yml"]
                ):
                    try:
                        content = await self.github_service.get_file_content(
                            github_token, owner, repo, file_path
                        )
                        key_files[file_path] = content
                        
                        # Limit to prevent excessive API calls
                        if len(key_files) >= 20:
                            break
                            
                    except Exception as e:
                        logger.debug(f"Could not get content for {file_path}: {e}")
                        continue
        except Exception as e:
            logger.warning(f"Error getting key files content: {e}")
        
        return key_files

    def _file_exists_in_structure(self, filename: str, structure: Dict[str, Any]) -> bool:
        """Check if a file exists in the repository structure."""
        files = structure.get("files", [])
        for file_info in files:
            file_path = file_info.get("path", "")
            if filename in file_path or os.path.basename(file_path) == filename:
                return True
        return False

    def _indicator_exists_in_structure(self, indicator: str, structure: Dict[str, Any]) -> bool:
        """Check if a structural indicator exists in the repository."""
        files = structure.get("files", [])
        directories = structure.get("directories", [])
        
        for file_info in files:
            if indicator in file_info.get("path", ""):
                return True
        
        for dir_info in directories:
            if indicator in dir_info.get("path", ""):
                return True
        
        return False

    def _identify_primary_stack(self, technologies: Dict[str, Any]) -> Dict[str, str]:
        """Identify the primary technology stack."""
        primary_stack = {
            "frontend": None,
            "backend": None,
            "database": None,
            "infrastructure": None
        }
        
        frontend_techs = ["react", "vue", "angular", "nextjs", "svelte"]
        backend_techs = ["fastapi", "django", "flask", "expressjs", "nestjs"]
        database_techs = ["postgresql", "mongodb", "mysql", "sqlite"]
        infra_techs = ["docker", "kubernetes", "terraform"]
        
        for tech, info in technologies.items():
            if info.get("detected", False):
                confidence = info.get("confidence", 0)
                
                if tech in frontend_techs and (
                    not primary_stack["frontend"] or 
                    confidence > technologies.get(primary_stack["frontend"], {}).get("confidence", 0)
                ):
                    primary_stack["frontend"] = tech
                
                elif tech in backend_techs and (
                    not primary_stack["backend"] or 
                    confidence > technologies.get(primary_stack["backend"], {}).get("confidence", 0)
                ):
                    primary_stack["backend"] = tech
                
                elif tech in database_techs and (
                    not primary_stack["database"] or 
                    confidence > technologies.get(primary_stack["database"], {}).get("confidence", 0)
                ):
                    primary_stack["database"] = tech
                
                elif tech in infra_techs and (
                    not primary_stack["infrastructure"] or 
                    confidence > technologies.get(primary_stack["infrastructure"], {}).get("confidence", 0)
                ):
                    primary_stack["infrastructure"] = tech
        
        return primary_stack

    def _analyze_file_organization(self, contents: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze file organization patterns."""
        org_patterns = {
            "has_tests": False,
            "has_docs": False,
            "has_ci_cd": False,
            "has_config": False,
            "total_files": len(contents),
            "directory_structure": {}
        }
        
        test_indicators = ["test", "spec", "__tests__", "tests"]
        doc_indicators = ["README", "docs", "documentation", "wiki"]
        ci_indicators = [".github", ".gitlab-ci", "jenkins", "circle", "travis"]
        config_indicators = ["config", "settings", ".env", "docker"]
        
        for item in contents:
            path = item.get("path", "").lower()
            
            if any(indicator in path for indicator in test_indicators):
                org_patterns["has_tests"] = True
            
            if any(indicator in path for indicator in doc_indicators):
                org_patterns["has_docs"] = True
            
            if any(indicator in path for indicator in ci_indicators):
                org_patterns["has_ci_cd"] = True
            
            if any(indicator in path for indicator in config_indicators):
                org_patterns["has_config"] = True
        
        return org_patterns

    def _analyze_naming_conventions(self, contents: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze naming conventions used in the project."""
        conventions = {
            "file_naming": {"snake_case": 0, "camelCase": 0, "kebab-case": 0},
            "dominant_convention": None
        }
        
        for item in contents:
            filename = os.path.basename(item.get("path", ""))
            name_without_ext = os.path.splitext(filename)[0]
            
            if "_" in name_without_ext:
                conventions["file_naming"]["snake_case"] += 1
            elif "-" in name_without_ext:
                conventions["file_naming"]["kebab-case"] += 1
            elif any(c.isupper() for c in name_without_ext):
                conventions["file_naming"]["camelCase"] += 1
        
        # Determine dominant convention
        max_count = max(conventions["file_naming"].values())
        if max_count > 0:
            conventions["dominant_convention"] = max(
                conventions["file_naming"].items(), key=lambda x: x[1]
            )[0]
        
        return conventions

    def _detect_architecture_patterns(
        self, 
        contents: List[Dict[str, Any]], 
        technologies: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Detect common architecture patterns."""
        patterns = {
            "mvc_pattern": False,
            "microservices": False,
            "monolithic": True,
            "layered_architecture": False
        }
        
        paths = [item.get("path", "").lower() for item in contents]
        
        # Check for MVC pattern
        mvc_indicators = ["models", "views", "controllers", "model", "view", "controller"]
        if sum(1 for path in paths if any(indicator in path for indicator in mvc_indicators)) >= 2:
            patterns["mvc_pattern"] = True
        
        # Check for microservices
        microservice_indicators = ["service", "api", "gateway", "docker-compose"]
        if sum(1 for path in paths if any(indicator in path for indicator in microservice_indicators)) >= 3:
            patterns["microservices"] = True
            patterns["monolithic"] = False
        
        # Check for layered architecture
        layer_indicators = ["repository", "service", "controller", "entity", "dto"]
        if sum(1 for path in paths if any(indicator in path for indicator in layer_indicators)) >= 3:
            patterns["layered_architecture"] = True
        
        return patterns

    def _analyze_testing_patterns(self, contents: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze testing patterns and coverage indicators."""
        testing = {
            "has_unit_tests": False,
            "has_integration_tests": False,
            "has_e2e_tests": False,
            "test_frameworks": [],
            "estimated_coverage": 0
        }
        
        paths = [item.get("path", "").lower() for item in contents]
        
        # Detect test types
        unit_indicators = ["test", "spec", "unit"]
        integration_indicators = ["integration", "int_test", "api_test"]
        e2e_indicators = ["e2e", "end-to-end", "cypress", "selenium"]
        
        testing["has_unit_tests"] = any(
            indicator in path for path in paths for indicator in unit_indicators
        )
        testing["has_integration_tests"] = any(
            indicator in path for path in paths for indicator in integration_indicators
        )
        testing["has_e2e_tests"] = any(
            indicator in path for path in paths for indicator in e2e_indicators
        )
        
        # Detect test frameworks
        framework_indicators = {
            "jest": ["jest", "test.js", "spec.js"],
            "pytest": ["test_", "_test.py", "pytest"],
            "mocha": ["mocha", ".spec.js"],
            "cypress": ["cypress", ".cy.js"],
            "unittest": ["unittest", "test_*.py"]
        }
        
        for framework, indicators in framework_indicators.items():
            if any(indicator in path for path in paths for indicator in indicators):
                testing["test_frameworks"].append(framework)
        
        # Rough coverage estimation based on test file ratio
        total_files = len([p for p in paths if p.endswith(('.py', '.js', '.ts', '.java', '.go'))])
        test_files = len([p for p in paths if any(ind in p for ind in ['test', 'spec'])])
        
        if total_files > 0:
            testing["estimated_coverage"] = min((test_files / total_files) * 100, 100)
        
        return testing

    def _assess_project_complexity(
        self, 
        structure: Dict[str, Any], 
        technologies: Dict[str, Any], 
        patterns: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Assess project complexity and provide metrics."""
        complexity = {
            "complexity_score": 0.0,
            "size_category": "small",
            "tech_diversity": 0,
            "maintenance_score": 0.0,
            "security_score": 0.0
        }
        
        # Calculate complexity based on various factors
        file_count = len(structure.get("files", []))
        tech_count = len([t for t in technologies.get("detected", {}).values() if t.get("detected")])
        
        # Size categorization
        if file_count < 50:
            complexity["size_category"] = "small"
            size_score = 0.2
        elif file_count < 200:
            complexity["size_category"] = "medium"
            size_score = 0.5
        elif file_count < 1000:
            complexity["size_category"] = "large"
            size_score = 0.8
        else:
            complexity["size_category"] = "enterprise"
            size_score = 1.0
        
        # Technology diversity
        complexity["tech_diversity"] = tech_count
        tech_score = min(tech_count / 10.0, 1.0)
        
        # Maintenance score (based on organization and testing)
        file_org = patterns.get("file_organization", {})
        testing = patterns.get("testing_patterns", {})
        
        maintenance_factors = [
            file_org.get("has_tests", False),
            file_org.get("has_docs", False),
            file_org.get("has_ci_cd", False),
            testing.get("estimated_coverage", 0) > 50
        ]
        complexity["maintenance_score"] = sum(maintenance_factors) / len(maintenance_factors)
        
        # Security score (basic assessment)
        security_factors = [
            file_org.get("has_config", False),  # Configuration management
            not any("password" in f.get("path", "").lower() for f in structure.get("files", [])),  # No hardcoded passwords
            file_org.get("has_ci_cd", False),  # Automated security checks
            ".env" in str(structure)  # Environment variable usage
        ]
        complexity["security_score"] = sum(security_factors) / len(security_factors)
        
        # Overall complexity score
        complexity["complexity_score"] = (size_score * 0.4 + tech_score * 0.3 + 
                                        (1 - complexity["maintenance_score"]) * 0.3)
        
        return complexity

    def _calculate_confidence_score(
        self, 
        technologies: Dict[str, Any], 
        patterns: Dict[str, Any]
    ) -> float:
        """Calculate overall confidence score for the analysis."""
        tech_confidences = [
            info.get("confidence", 0) 
            for info in technologies.get("detected", {}).values() 
            if info.get("detected", False)
        ]
        
        if not tech_confidences:
            return 0.0
        
        avg_tech_confidence = sum(tech_confidences) / len(tech_confidences)
        pattern_completeness = len([p for p in patterns.values() if p]) / max(len(patterns), 1)
        
        return (avg_tech_confidence * 0.7 + pattern_completeness * 0.3)

    def _suggest_test_framework(self, technologies: Dict[str, Any]) -> str:
        """Suggest appropriate test framework based on detected technologies."""
        detected_names = [name for name, info in technologies.items() if info.get("detected")]
        
        if any(tech in detected_names for tech in ["react", "vue", "angular", "nextjs"]):
            return "Jest + Testing Library"
        elif any(tech in detected_names for tech in ["fastapi", "django", "flask"]):
            return "pytest"
        elif "expressjs" in detected_names:
            return "Jest + Supertest"
        else:
            return "framework-appropriate testing suite"

    def _get_agent_category(self, agent_id: str) -> str:
        """Get category for an agent."""
        categories = {
            "frontend-developer": "Engineering",
            "backend-developer": "Engineering", 
            "fullstack-developer": "Engineering",
            "ui-designer": "Design",
            "test-automation-engineer": "Testing",
            "devops-engineer": "Operations",
            "security-auditor": "Security",
            "documentation-writer": "Documentation"
        }
        return categories.get(agent_id, "General")