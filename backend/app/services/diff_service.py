from app.services.flow_service import flow_service
from app.services.risk_service import risk_service


class DiffService:
    """Compares two analysis snapshots and returns dependency and behavior deltas."""

    def compare(self, graph_a: dict, graph_b: dict) -> dict:
        edges_a = self._edge_set(graph_a)
        edges_b = self._edge_set(graph_b)

        new_dependencies = [self._edge_to_dict(edge) for edge in sorted(edges_b - edges_a)]
        removed_dependencies = [self._edge_to_dict(edge) for edge in sorted(edges_a - edges_b)]

        changed_flows = self._changed_flows(graph_a, graph_b)
        risk_delta = {
            "before": self._risk_aggregate(graph_a),
            "after": self._risk_aggregate(graph_b),
        }

        return {
            "new_dependencies": new_dependencies,
            "removed_dependencies": removed_dependencies,
            "changed_flows": changed_flows,
            "risk_delta": risk_delta,
        }

    def _edge_set(self, graph_payload: dict) -> set[tuple[str, str, str]]:
        return {
            (
                edge.get("source", ""),
                edge.get("target", ""),
                edge.get("relation", "depends_on"),
            )
            for edge in graph_payload.get("edges", [])
            if edge.get("source") and edge.get("target")
        }

    def _edge_to_dict(self, edge: tuple[str, str, str]) -> dict:
        source, target, relation = edge
        return {"source": source, "target": target, "relation": relation}

    def _changed_flows(self, graph_a: dict, graph_b: dict) -> list[dict]:
        apis_a = {
            node.get("id", "")
            for node in graph_a.get("nodes", [])
            if flow_service._is_api_node(node.get("id", ""))
        }
        apis_b = {
            node.get("id", "")
            for node in graph_b.get("nodes", [])
            if flow_service._is_api_node(node.get("id", ""))
        }

        changed: list[dict] = []
        for api_node in sorted(apis_a | apis_b):
            before_paths = flow_service.get_flow_paths(graph_a, api_node) if api_node in apis_a else []
            after_paths = flow_service.get_flow_paths(graph_b, api_node) if api_node in apis_b else []
            before_set = {tuple(path) for path in before_paths}
            after_set = {tuple(path) for path in after_paths}

            if before_set == after_set:
                continue

            changed.append(
                {
                    "api": api_node,
                    "before_count": len(before_paths),
                    "after_count": len(after_paths),
                    "added_paths": [list(path) for path in sorted(after_set - before_set)],
                    "removed_paths": [list(path) for path in sorted(before_set - after_set)],
                }
            )

        return changed

    def _risk_aggregate(self, graph_payload: dict) -> dict:
        node_ids = [node.get("id", "") for node in graph_payload.get("nodes", []) if node.get("id")]
        if not node_ids:
            return {"average_score": 0.0, "high_risk_nodes": 0, "total_nodes": 0}

        scores: list[float] = []
        high_risk = 0
        for node in node_ids:
            result = risk_service.score_node_risk(graph_payload, node)
            score = float(result.get("score", 0.0))
            scores.append(score)
            if result.get("risk_level") == "HIGH":
                high_risk += 1

        average = round(sum(scores) / len(scores), 2)
        return {
            "average_score": average,
            "high_risk_nodes": high_risk,
            "total_nodes": len(node_ids),
        }


diff_service = DiffService()