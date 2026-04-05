from collections import defaultdict

from app.services.flow_service import flow_service


class WorkflowService:
    """Groups execution paths into recurring system workflows."""

    def detect_workflows(self, graph_payload: dict, max_depth: int = 8) -> list[dict]:
        api_nodes = [
            node["id"]
            for node in graph_payload.get("nodes", [])
            if flow_service._is_api_node(node["id"])
        ]

        grouped: dict[str, list[list[str]]] = defaultdict(list)
        for api_node in api_nodes:
            for path in flow_service.get_flow_paths(graph_payload, api_node, max_depth=max_depth):
                if len(path) < 2:
                    continue
                signature = self._signature(path)
                grouped[signature].append(path)

        workflows: list[dict] = []
        for signature, paths in grouped.items():
            representative = sorted(paths, key=len, reverse=True)[0]
            workflow_name = self._workflow_name(representative)
            workflows.append(
                {
                    "workflow_name": workflow_name,
                    "steps": representative,
                    "path_count": len(paths),
                    "apis": sorted({path[0] for path in paths if path}),
                }
            )

        merged: dict[str, dict] = {}
        for workflow in workflows:
            key = workflow["workflow_name"]
            if key not in merged:
                merged[key] = workflow
                continue

            existing = merged[key]
            existing["path_count"] += workflow["path_count"]
            existing["apis"] = sorted({*existing["apis"], *workflow["apis"]})
            if len(workflow["steps"]) > len(existing["steps"]):
                existing["steps"] = workflow["steps"]

        return sorted(merged.values(), key=lambda workflow: workflow["path_count"], reverse=True)

    def _signature(self, path: list[str]) -> str:
        return " -> ".join(self._normalize_step(step) for step in path)

    def _normalize_step(self, step: str) -> str:
        step_l = step.lower()
        if "api" in step_l:
            return "api"
        if any(db in step_l for db in ("db", "database", "postgres", "mysql", "redis")):
            return "database"
        if "auth" in step_l:
            return "auth"
        if "payment" in step_l:
            return "payment"
        if "notification" in step_l:
            return "notification"
        if "service" in step_l:
            return "service"
        return step_l

    def _workflow_name(self, path: list[str]) -> str:
        joined = " ".join(path).lower()
        if "payment" in joined:
            return "Payment Workflow"
        if "auth" in joined:
            return "Authentication Workflow"
        if "notification" in joined:
            return "Notification Workflow"
        return f"Workflow from {path[0]}"


workflow_service = WorkflowService()
