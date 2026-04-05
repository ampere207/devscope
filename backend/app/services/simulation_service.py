import networkx as nx

from app.services.flow_service import flow_service


class SimulationService:
    """Simulates node failures against an analyzed graph snapshot."""

    def simulate_node_failure(self, graph_payload: dict, node: str) -> dict:
        graph = flow_service.build_graph(graph_payload)
        if node not in graph:
            return {
                "affected_services": [],
                "broken_apis": [],
                "degraded_flows": [],
            }

        baseline_paths = self._api_paths(graph_payload)
        simulated_graph = graph.copy()
        simulated_graph.remove_node(node)
        simulated_payload = self._to_payload(simulated_graph)
        simulated_paths = self._api_paths(simulated_payload)

        affected_scope = set(nx.ancestors(graph, node)) | set(nx.descendants(graph, node)) | {node}

        broken_apis: set[str] = set()
        degraded_flows: list[dict] = []

        for api_node, before_paths in baseline_paths.items():
            if api_node == node or api_node not in simulated_graph:
                broken_apis.add(api_node)
                degraded_flows.append(
                    {
                        "api": api_node,
                        "before_count": len(before_paths),
                        "after_count": 0,
                        "removed_paths": before_paths,
                    }
                )
                continue

            after_paths = simulated_paths.get(api_node, [])
            before_set = {tuple(path) for path in before_paths}
            after_set = {tuple(path) for path in after_paths}
            removed = [list(path) for path in sorted(before_set - after_set)]

            if removed:
                degraded_flows.append(
                    {
                        "api": api_node,
                        "before_count": len(before_paths),
                        "after_count": len(after_paths),
                        "removed_paths": removed,
                    }
                )

            if before_paths and not after_paths:
                broken_apis.add(api_node)

        affected_services = sorted(
            item
            for item in affected_scope
            if not flow_service._is_api_node(item)
        )

        return {
            "affected_services": affected_services,
            "broken_apis": sorted(broken_apis),
            "degraded_flows": sorted(degraded_flows, key=lambda item: item["before_count"], reverse=True),
        }

    def _api_paths(self, graph_payload: dict) -> dict[str, list[list[str]]]:
        api_nodes = [
            node.get("id", "")
            for node in graph_payload.get("nodes", [])
            if flow_service._is_api_node(node.get("id", ""))
        ]
        return {
            api_node: flow_service.get_flow_paths(graph_payload, api_node)
            for api_node in api_nodes
            if api_node
        }

    def _to_payload(self, graph: nx.DiGraph) -> dict:
        return {
            "nodes": [
                {"id": str(node), "type": str(graph.nodes[node].get("type", "unknown"))}
                for node in graph.nodes
            ],
            "edges": [
                {
                    "source": str(source),
                    "target": str(target),
                    "relation": str(attributes.get("relation", "depends_on")),
                }
                for source, target, attributes in graph.edges(data=True)
            ],
        }


simulation_service = SimulationService()