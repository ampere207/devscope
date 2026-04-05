from datetime import UTC, datetime
from uuid import uuid4

import networkx as nx

from app.extractor.dependency_extractor import DependencyExtractor
from app.graph.graph_builder import GraphBuilder
from app.parser.repository_parser import RepositoryParser
from app.services.api_service import api_service
from app.services.dataflow_service import get_dataflow_service
from app.services.flow_service import flow_service
from app.services.github_service import GitHubService
from app.services.risk_service import risk_service
from app.services.workflow_service import workflow_service


class AnalysisStore:
    """In-memory analysis store used during Phase 1 backend scaffolding.

    This keeps API flows testable now and can be replaced by Supabase persistence next.
    """

    def __init__(self) -> None:
        self._items: dict[str, dict] = {}

    def save(self, graph_data: dict, repo_url: str) -> str:
        analysis_id = str(uuid4())
        self._items[analysis_id] = {
            "analysis_id": analysis_id,
            "repo_url": repo_url,
            "created_at": datetime.now(UTC).isoformat(),
            "graph": graph_data,
        }
        return analysis_id

    def get(self, analysis_id: str) -> dict | None:
        record = self._items.get(analysis_id)
        if not record:
            return None
        return record.get("graph")

    def get_record(self, analysis_id: str) -> dict | None:
        return self._items.get(analysis_id)

    def list_records(self, limit: int = 20) -> list[dict]:
        records = sorted(
            self._items.values(),
            key=lambda item: item.get("created_at", ""),
            reverse=True,
        )
        return records[:limit]


class AnalysisService:
    """Coordinates repository analysis pipeline.

    Pipeline: fetch files -> parse -> extract dependencies -> build graph.
    """

    def __init__(self) -> None:
        self.github_service = GitHubService()
        self.parser = RepositoryParser()
        self.extractor = DependencyExtractor()
        self.graph_builder = GraphBuilder()
        self.store = AnalysisStore()

    async def analyze_repo(self, repo_url: str, github_token: str | None) -> dict:
        files = await self.github_service.fetch_repo_contents(repo_url=repo_url, token=github_token)
        parsed_files = self.parser.parse_files(files)
        relations = self.extractor.extract(parsed_files)
        graph = self.graph_builder.build(relations)
        serialized_graph = self.graph_builder.to_serializable(graph)
        analysis_id = self.store.save(serialized_graph, repo_url=repo_url)

        return {
            "analysis_id": analysis_id,
            "nodes": serialized_graph["nodes"],
            "edges": serialized_graph["edges"],
        }

    def get_graph(self, analysis_id: str) -> dict | None:
        graph = self.store.get(analysis_id)
        if not graph:
            return None

        return {
            "analysis_id": analysis_id,
            "nodes": graph.get("nodes", []),
            "edges": graph.get("edges", []),
        }

    def get_impact(self, analysis_id: str, node: str) -> tuple[list[str], list[str]]:
        graph_payload = self.store.get(analysis_id)
        if not graph_payload:
            return [], []

        # Rehydrate graph for query operations from serialized edges.
        graph = nx.DiGraph()
        for edge in graph_payload.get("edges", []):
            graph.add_edge(
                edge["source"],
                edge["target"],
                relation=edge.get("relation", "depends_on"),
            )

        return self.graph_builder.get_impact(graph, node), self.graph_builder.get_dependencies(graph, node)

    def get_enhanced_impact(self, analysis_id: str, node: str) -> dict | None:
        """Return Phase 2 impact details with APIs and flow intersections."""
        graph_payload = self.store.get(analysis_id)
        if not graph_payload:
            return None

        affected_nodes, dependency_nodes = self.get_impact(analysis_id, node)
        if not affected_nodes and not dependency_nodes and not self._node_exists(graph_payload, node):
            return None

        full_affected = sorted(set([node, *affected_nodes]))
        affected_apis = flow_service.detect_affected_apis(graph_payload, full_affected)

        affected_flows: list[list[str]] = []
        for api_node in affected_apis:
            for path in flow_service.get_flow_paths(graph_payload, api_node):
                if any(path_node in full_affected for path_node in path):
                    affected_flows.append(path)

        return {
            "node": node,
            "impact_nodes": affected_nodes,
            "dependency_nodes": dependency_nodes,
            "affected_nodes": full_affected,
            "affected_apis": affected_apis,
            "affected_flows": sorted(affected_flows),
        }

    def get_flow(self, analysis_id: str, node: str) -> list[list[str]] | None:
        graph_payload = self.store.get(analysis_id)
        if not graph_payload:
            return None

        if not self._node_exists(graph_payload, node):
            return None

        return flow_service.get_flow_paths(graph_payload, node)

    def get_risk(self, analysis_id: str, node: str) -> dict | None:
        graph_payload = self.store.get(analysis_id)
        if not graph_payload:
            return None

        if not self._node_exists(graph_payload, node):
            return None

        return risk_service.score_node_risk(graph_payload, node)

    def _node_exists(self, graph_payload: dict, node: str) -> bool:
        node_ids = {item.get("id") for item in graph_payload.get("nodes", [])}
        return node in node_ids

    def get_dataflow(self, analysis_id: str, node: str) -> list[dict] | None:
        graph_payload = self.store.get(analysis_id)
        if not graph_payload:
            return None

        if not self._node_exists(graph_payload, node):
            return None

        return get_dataflow_service().trace_data_flow(graph_payload, node)

    def get_workflows(self, analysis_id: str) -> list[dict] | None:
        graph_payload = self.store.get(analysis_id)
        if not graph_payload:
            return None

        return workflow_service.detect_workflows(graph_payload)

    async def get_api_understanding(self, analysis_id: str, node: str) -> dict | None:
        graph_payload = self.store.get(analysis_id)
        if not graph_payload:
            return None

        return await api_service.describe_api(graph_payload, node)

    def get_graph_payload(self, analysis_id: str) -> dict | None:
        return self.store.get(analysis_id)

    def list_analyses(self, limit: int = 20) -> list[dict]:
        records = self.store.list_records(limit=limit)
        return [
            {
                "analysis_id": item.get("analysis_id", ""),
                "repo_url": item.get("repo_url", "unknown"),
                "created_at": item.get("created_at", ""),
            }
            for item in records
        ]


analysis_service = AnalysisService()
