import asyncio
import json
import logging
from typing import Any

import httpx
import networkx as nx

from app.utils.config import get_settings

logger = logging.getLogger(__name__)


class AIService:
    """Optional AI explanation layer.

    Deterministic engines remain primary. This service only enhances readability and
    never blocks API responses when Gemini is unavailable.
    """

    def __init__(self) -> None:
        self._cache: dict[str, Any] = {}

    async def explain_api(self, payload: dict) -> str:
        cache_key = f"api:{json.dumps(payload, sort_keys=True)}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        default_explanation = self._fallback_api_explanation(payload)

        api_key = self._gemini_api_key()
        if not api_key:
            self._cache[cache_key] = default_explanation
            return default_explanation

        prompt = (
            "You are helping engineers understand an internal architecture graph. "
            "Explain this API in 4-6 sentences with concrete reasoning, mention services, "
            "database interactions, and side effects. Data:\n"
            f"{json.dumps(payload, indent=2)}"
        )

        explanation = await self._generate_with_gemini(prompt, default_explanation)

        self._cache[cache_key] = explanation
        return explanation

    async def explain_risk(self, payload: dict) -> str:
        cache_key = f"risk:{json.dumps(payload, sort_keys=True)}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        default_explanation = self._fallback_risk_explanation(payload)
        api_key = self._gemini_api_key()
        if not api_key:
            self._cache[cache_key] = default_explanation
            return default_explanation

        prompt = (
            "You are helping engineers assess change risk. "
            "Explain this risk result in concise plain English. Use complete sentences, avoid markdown, "
            "and mention blast radius, critical areas, and concrete reasons. Data:\n"
            f"{json.dumps(payload, indent=2)}"
        )

        explanation = await self._generate_with_gemini(prompt, default_explanation)
        self._cache[cache_key] = explanation
        return explanation

    async def explain_architecture(self, graph_payload: dict) -> str:
        cache_key = f"arch:{json.dumps(graph_payload, sort_keys=True)}"
        if cache_key in self._cache:
            return str(self._cache[cache_key])

        fallback = self._fallback_architecture_summary(graph_payload)
        api_key = self._gemini_api_key()
        if not api_key:
            self._cache[cache_key] = fallback
            return fallback

        prompt = (
            "You are an architecture reviewer. Return a concise 5-7 sentence summary of this system. "
            "Mention primary entry APIs, core services, data stores, and reliability bottlenecks. "
            "Keep it actionable for engineers.\n"
            f"Graph data:\n{json.dumps(graph_payload, indent=2)}"
        )

        summary = await self._generate_with_gemini(prompt, fallback)
        self._cache[cache_key] = summary
        return summary

    async def suggest_refactors(self, graph_payload: dict) -> list[str]:
        cache_key = f"refactor:{json.dumps(graph_payload, sort_keys=True)}"
        if cache_key in self._cache:
            return list(self._cache[cache_key])

        fallback = self._fallback_refactor_suggestions(graph_payload)
        api_key = self._gemini_api_key()
        if not api_key:
            self._cache[cache_key] = fallback
            return fallback

        prompt = (
            "You are a senior staff engineer. Suggest up to 5 concrete refactors to reduce coupling and "
            "improve reliability for this dependency graph. Return each suggestion on a new line starting with '- '.\n"
            f"Graph data:\n{json.dumps(graph_payload, indent=2)}"
        )
        raw = await self._generate_with_gemini(prompt, "\n".join(f"- {item}" for item in fallback))
        parsed = self._parse_bullets(raw)
        suggestions = parsed[:5] if parsed else fallback
        self._cache[cache_key] = suggestions
        return suggestions

    async def detect_anti_patterns(self, graph_payload: dict) -> list[str]:
        cache_key = f"anti:{json.dumps(graph_payload, sort_keys=True)}"
        if cache_key in self._cache:
            return list(self._cache[cache_key])

        fallback = self._fallback_anti_patterns(graph_payload)
        api_key = self._gemini_api_key()
        if not api_key:
            self._cache[cache_key] = fallback
            return fallback

        prompt = (
            "You are an architecture quality analyzer. Detect anti-patterns from this graph. "
            "Focus on cyclic dependencies, god services, and weak boundaries. "
            "Return up to 5 bullets, each starting with '- '.\n"
            f"Graph data:\n{json.dumps(graph_payload, indent=2)}"
        )
        raw = await self._generate_with_gemini(prompt, "\n".join(f"- {item}" for item in fallback))
        parsed = self._parse_bullets(raw)
        anti_patterns = parsed[:5] if parsed else fallback
        self._cache[cache_key] = anti_patterns
        return anti_patterns

    async def _generate_with_gemini(self, prompt: str, fallback: str) -> str:
        api_key = self._gemini_api_key()
        if not api_key:
            logger.warning("Gemini API key not configured, using fallback")
            return fallback

        model = self._gemini_model()
        endpoint = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model}:generateContent?key={api_key}"
        )

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                logger.debug(f"Calling Gemini API with prompt length: {len(prompt)}")
                response = await client.post(
                    endpoint,
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {
                            "temperature": 0.2,
                            "maxOutputTokens": 1024,
                            "topP": 0.9,
                        },
                    },
                )
                response.raise_for_status()
                data = response.json()
                text = (
                    data.get("candidates", [{}])[0]
                    .get("content", {})
                    .get("parts", [{}])[0]
                    .get("text")
                )
                if isinstance(text, str) and text.strip():
                    logger.debug(f"Gemini returned text of length: {len(text)}")
                    return text.strip()
                logger.warning("Gemini returned empty or invalid response, using fallback")
                return fallback
        except httpx.HTTPStatusError as e:
            logger.error(f"Gemini API HTTP error: {e.response.status_code} - {e.response.text}")
            return fallback
        except asyncio.TimeoutError:
            logger.error("Gemini API request timed out, using fallback")
            return fallback
        except Exception as e:
            logger.error(f"Gemini API error: {type(e).__name__}: {str(e)}", exc_info=True)
            return fallback

    def _gemini_api_key(self) -> str | None:
        settings = get_settings()
        return getattr(settings, "gemini_api_key", None) or None

    def _gemini_model(self) -> str:
        settings = get_settings()
        return getattr(settings, "gemini_model", "gemini-2.5-flash") or "gemini-2.5-flash"

    def _fallback_api_explanation(self, payload: dict) -> str:
        api = payload.get("api", "This API")
        services = payload.get("services_involved", [])
        db = payload.get("db_interactions", [])
        effects = payload.get("output_effects", [])

        parts = [f"{api} routes requests through {', '.join(services) if services else 'core services'}."]
        if db:
            parts.append(f"It interacts with data stores through {', '.join(db)}.")
        if effects:
            parts.append(f"Observed side effects include {', '.join(effects)}.")
        parts.append("This explanation is generated deterministically with AI fallback disabled or unavailable.")
        return " ".join(parts)

    def _fallback_risk_explanation(self, payload: dict) -> str:
        node = payload.get("node", "This node")
        level = payload.get("risk_level", "LOW")
        score = payload.get("score", 0)
        reasons = payload.get("reasons", [])
        reason_text = ", ".join(reasons) if reasons else "limited impact signals"
        return (
            f"{node} is currently assessed as {level} risk with score {score}. "
            f"Primary factors: {reason_text}. "
            "This explanation used deterministic fallback because Gemini was unavailable."
        )

    def _fallback_architecture_summary(self, graph_payload: dict) -> str:
        node_ids = [node.get("id", "") for node in graph_payload.get("nodes", [])]
        api_nodes = [node for node in node_ids if "api" in node.lower() or node.lower().startswith("/api")]
        db_nodes = [
            node
            for node in node_ids
            if any(keyword in node.lower() for keyword in ("db", "database", "postgres", "mysql", "redis"))
        ]
        return (
            f"This repository graph contains {len(node_ids)} components and {len(graph_payload.get('edges', []))} dependencies. "
            f"Primary API entrypoints include {', '.join(api_nodes[:5]) if api_nodes else 'no explicit API nodes'}. "
            f"Data layer nodes include {', '.join(db_nodes[:4]) if db_nodes else 'none detected'}. "
            "Architecture appears to follow a dependency-driven service graph, and high fan-out services should be prioritized for resiliency hardening."
        )

    def _fallback_refactor_suggestions(self, graph_payload: dict) -> list[str]:
        graph = self._build_graph(graph_payload)
        if not graph.nodes:
            return ["No graph data available to generate refactor suggestions."]

        suggestions: list[str] = []
        high_out = sorted(graph.out_degree, key=lambda item: item[1], reverse=True)[:3]
        for node, degree in high_out:
            if degree >= 4:
                suggestions.append(
                    f"Reduce fan-out from {node} (out-degree {degree}) by introducing bounded service interfaces."
                )

        high_in = sorted(graph.in_degree, key=lambda item: item[1], reverse=True)[:3]
        for node, degree in high_in:
            if degree >= 5:
                suggestions.append(
                    f"Split responsibilities around {node}; it is a dependency hotspot with in-degree {degree}."
                )

        if not suggestions:
            suggestions.append("Current graph has moderate coupling; enforce interface contracts and monitor growth hotspots.")

        return suggestions[:5]

    def _fallback_anti_patterns(self, graph_payload: dict) -> list[str]:
        graph = self._build_graph(graph_payload)
        findings: list[str] = []

        try:
            cycles = list(nx.simple_cycles(graph))
        except Exception:
            cycles = []

        if cycles:
            findings.append(
                f"Detected {len(cycles)} cyclic dependency loops; break bidirectional coupling across core services."
            )

        god_candidates = [node for node, degree in graph.out_degree if degree >= 6]
        if god_candidates:
            findings.append(
                f"Potential god services detected: {', '.join(sorted(god_candidates)[:4])}."
            )

        if not findings:
            findings.append("No severe anti-patterns detected from deterministic analysis.")

        return findings[:5]

    def _build_graph(self, graph_payload: dict) -> nx.DiGraph:
        graph = nx.DiGraph()
        for node in graph_payload.get("nodes", []):
            node_id = node.get("id")
            if node_id:
                graph.add_node(node_id)

        for edge in graph_payload.get("edges", []):
            source = edge.get("source")
            target = edge.get("target")
            if source and target:
                graph.add_edge(source, target)

        return graph

    def _parse_bullets(self, text: str) -> list[str]:
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        bullets: list[str] = []
        for line in lines:
            if line.startswith("- "):
                bullets.append(line[2:].strip())
            elif line[:2].isdigit() and ". " in line:
                bullets.append(line.split(". ", 1)[1].strip())
        return [item for item in bullets if item]


ai_service = AIService()
