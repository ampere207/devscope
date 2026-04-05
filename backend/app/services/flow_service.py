import networkx as nx


class FlowService:
    """Computes execution flow paths from a graph node.

    Flow tracing is deterministic and graph-based so it remains reliable even without AI.
    """

    def build_graph(self, graph_payload: dict) -> nx.DiGraph:
        """Rehydrate a directed graph from stored edge data for path queries."""
        graph = nx.DiGraph()
        for node in graph_payload.get("nodes", []):
            graph.add_node(node["id"], type=node.get("type", "unknown"))

        for edge in graph_payload.get("edges", []):
            graph.add_edge(
                edge["source"],
                edge["target"],
                relation=edge.get("relation", "depends_on"),
            )

        return graph

    def get_flow_paths(self, graph_payload: dict, start_node: str, max_depth: int = 8) -> list[list[str]]:
        """Return all flow paths from a start node using depth-limited DFS.

        Depth limiting and cycle checks prevent unbounded recursion on cyclic graphs.
        """
        graph = self.build_graph(graph_payload)
        if start_node not in graph:
            return []

        paths: list[list[str]] = []
        self._dfs_paths(
            graph=graph,
            current=start_node,
            path=[start_node],
            visited={start_node},
            max_depth=max_depth,
            paths=paths,
        )

        # Stable ordering improves API determinism and testability.
        return sorted(paths)

    def _dfs_paths(
        self,
        graph: nx.DiGraph,
        current: str,
        path: list[str],
        visited: set[str],
        max_depth: int,
        paths: list[list[str]],
    ) -> None:
        if len(path) > max_depth:
            paths.append(path.copy())
            return

        neighbors = list(graph.successors(current))
        if not neighbors:
            paths.append(path.copy())
            return

        traversed = False
        for neighbor in neighbors:
            if neighbor in visited:
                continue

            traversed = True
            visited.add(neighbor)
            path.append(neighbor)
            self._dfs_paths(graph, neighbor, path, visited, max_depth, paths)
            path.pop()
            visited.remove(neighbor)

        if not traversed:
            paths.append(path.copy())

    def detect_affected_apis(self, graph_payload: dict, affected_nodes: list[str]) -> list[str]:
        """Identify API-like nodes from an affected node set using naming heuristics."""
        graph = self.build_graph(graph_payload)
        api_nodes: set[str] = set()

        for node in affected_nodes:
            if self._is_api_node(node):
                api_nodes.add(node)
                continue

            # Include API ancestors to capture exposed entrypoints affected downstream.
            if node in graph:
                for ancestor in nx.ancestors(graph, node):
                    if self._is_api_node(ancestor):
                        api_nodes.add(ancestor)

        return sorted(api_nodes)

    def _is_api_node(self, node: str) -> bool:
        normalized = node.lower()
        return normalized.startswith("/api") or "api" in normalized


flow_service = FlowService()
