import networkx as nx


class DataflowService:
    """Derives data movement paths from graph relationships.

    Data flow is inferred deterministically from node types and edge relations so it
    remains available even when AI services are unavailable.
    """

    def build_graph(self, graph_payload: dict) -> nx.DiGraph:
        graph = nx.DiGraph()

        for node in graph_payload.get("nodes", []):
            graph.add_node(node["id"], type=node.get("type", "unknown"))

        for edge in graph_payload.get("edges", []):
            relation = edge.get("relation", "depends_on")
            graph.add_edge(
                edge["source"],
                edge["target"],
                relation=relation,
                data_type=self._infer_data_type(edge["source"], edge["target"], relation),
                payload=self._infer_payload(edge["source"], edge["target"], relation),
            )

        return graph

    def trace_data_flow(self, graph_payload: dict, node: str, max_depth: int = 8) -> list[dict[str, str]]:
        """Trace data movement records reachable from a given node."""
        graph = self.build_graph(graph_payload)
        if node not in graph:
            return []

        records: list[dict[str, str]] = []
        self._dfs_collect(graph, node, {node}, records, max_depth=max_depth, depth=0)

        # Stable unique results keep API output deterministic.
        unique = {
            (item["from"], item["to"], item["data"], item["payload"]): item
            for item in records
        }
        return sorted(unique.values(), key=lambda item: (item["from"], item["to"], item["data"]))

    def _dfs_collect(
        self,
        graph: nx.DiGraph,
        current: str,
        visited: set[str],
        records: list[dict[str, str]],
        max_depth: int,
        depth: int,
    ) -> None:
        if depth >= max_depth:
            return

        for neighbor in graph.successors(current):
            edge = graph.get_edge_data(current, neighbor) or {}
            records.append(
                {
                    "from": current,
                    "to": neighbor,
                    "data": str(edge.get("data_type", "internal message")),
                    "payload": str(edge.get("payload", "unknown payload")),
                    "relation": str(edge.get("relation", "depends_on")),
                }
            )

            if neighbor in visited:
                continue

            visited.add(neighbor)
            self._dfs_collect(graph, neighbor, visited, records, max_depth=max_depth, depth=depth + 1)
            visited.remove(neighbor)

    def _infer_data_type(self, source: str, target: str, relation: str) -> str:
        source_l = source.lower()
        target_l = target.lower()
        relation_l = relation.lower()

        if "api" in source_l:
            return "request payload"
        if any(db in target_l for db in ("db", "database", "postgres", "mysql", "redis")):
            return "transaction record"
        if "notification" in target_l or "event" in relation_l or "emit" in relation_l:
            return "event message"
        if "auth" in source_l or "auth" in target_l:
            return "identity context"
        return "service payload"

    def _infer_payload(self, source: str, target: str, relation: str) -> str:
        source_l = source.lower()
        target_l = target.lower()
        relation_l = relation.lower()

        if "payment" in source_l or "payment" in target_l:
            return "payment metadata"
        if "auth" in source_l or "auth" in target_l:
            return "auth token"
        if any(db in target_l for db in ("db", "database", "postgres", "mysql", "redis")):
            return "persisted entity"
        if "notification" in target_l or "emit" in relation_l:
            return "notification payload"
        return "internal request body"


_dataflow_service = DataflowService()


def get_dataflow_service() -> DataflowService:
    return _dataflow_service
