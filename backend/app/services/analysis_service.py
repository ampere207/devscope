from uuid import uuid4

import networkx as nx

from app.extractor.dependency_extractor import DependencyExtractor
from app.graph.graph_builder import GraphBuilder
from app.parser.repository_parser import RepositoryParser
from app.services.github_service import GitHubService


class AnalysisStore:
    """In-memory analysis store used during Phase 1 backend scaffolding.

    This keeps API flows testable now and can be replaced by Supabase persistence next.
    """

    def __init__(self) -> None:
        self._items: dict[str, dict] = {}

    def save(self, graph_data: dict) -> str:
        analysis_id = str(uuid4())
        self._items[analysis_id] = graph_data
        return analysis_id

    def get(self, analysis_id: str) -> dict | None:
        return self._items.get(analysis_id)


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
        analysis_id = self.store.save(serialized_graph)

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


analysis_service = AnalysisService()
