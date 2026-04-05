import networkx as nx


class RiskService:
    """Deterministic risk scoring for dependency graph changes.

    The score is weighted by structural blast radius and critical system touchpoints.
    """

    def build_graph(self, graph_payload: dict) -> nx.DiGraph:
        graph = nx.DiGraph()

        for edge in graph_payload.get("edges", []):
            graph.add_edge(
                edge["source"],
                edge["target"],
                relation=edge.get("relation", "depends_on"),
            )

        for node in graph_payload.get("nodes", []):
            graph.add_node(node["id"], type=node.get("type", "unknown"))

        return graph

    def score_node_risk(self, graph_payload: dict, node: str) -> dict:
        graph = self.build_graph(graph_payload)
        if node not in graph:
            return {
                "risk_level": "LOW",
                "score": 0.0,
                "reasons": ["node not found in graph"],
            }

        downstream = sorted(nx.descendants(graph, node))
        blast_radius_score = min(0.45, len(downstream) * 0.06)

        critical_hits = self._critical_hits([node, *downstream])
        critical_score = min(0.35, len(critical_hits) * 0.12)

        api_exposure = self._has_api_exposure(graph, node)
        exposure_score = 0.20 if api_exposure else 0.0

        score = min(1.0, blast_radius_score + critical_score + exposure_score)
        risk_level = self._risk_level(score)

        reasons: list[str] = []
        if downstream:
            reasons.append(f"affects {len(downstream)} downstream nodes")
        if critical_hits:
            reasons.append(f"touches critical systems: {', '.join(critical_hits)}")
        if api_exposure:
            reasons.append("impacts public API exposure")

        if not reasons:
            reasons.append("limited downstream impact detected")

        return {
            "risk_level": risk_level,
            "score": round(score, 2),
            "reasons": reasons,
        }

    def _critical_hits(self, nodes: list[str]) -> list[str]:
        keywords = {
            "auth": "auth",
            "payment": "payment",
            "db": "database",
            "database": "database",
            "postgres": "database",
            "mysql": "database",
            "redis": "database",
        }

        hits: set[str] = set()
        for node in nodes:
            normalized = node.lower()
            for keyword, label in keywords.items():
                if keyword in normalized:
                    hits.add(label)

        return sorted(hits)

    def _has_api_exposure(self, graph: nx.DiGraph, node: str) -> bool:
        normalized = node.lower()
        if normalized.startswith("/api") or "api" in normalized:
            return True

        for ancestor in nx.ancestors(graph, node):
            ancestor_normalized = ancestor.lower()
            if ancestor_normalized.startswith("/api") or "api" in ancestor_normalized:
                return True

        return False

    def _risk_level(self, score: float) -> str:
        if score >= 0.70:
            return "HIGH"
        if score >= 0.40:
            return "MEDIUM"
        return "LOW"


risk_service = RiskService()
