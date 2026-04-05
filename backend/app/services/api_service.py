from app.services.ai_service import ai_service
from app.services.dataflow_service import get_dataflow_service
from app.services.flow_service import flow_service


class APIService:
    """Builds API-level understanding objects from graph structure and flow metadata."""

    async def describe_api(self, graph_payload: dict, api_node: str) -> dict | None:
        if not flow_service._is_api_node(api_node):
            return None

        node_ids = {node.get("id") for node in graph_payload.get("nodes", [])}
        if api_node not in node_ids:
            return None

        flow_paths = flow_service.get_flow_paths(graph_payload, api_node)
        data_flow = get_dataflow_service().trace_data_flow(graph_payload, api_node)

        services_involved = sorted(
            {
                step
                for path in flow_paths
                for step in path
                if not flow_service._is_api_node(step) and "database" not in step.lower() and "db" not in step.lower()
            }
        )
        db_interactions = sorted(
            {
                item["to"]
                for item in data_flow
                if any(db in item["to"].lower() for db in ("db", "database", "postgres", "mysql", "redis"))
            }
        )
        output_effects = sorted(
            {
                item["to"]
                for item in data_flow
                if any(keyword in item["to"].lower() for keyword in ("notification", "event", "queue"))
            }
        )

        payload = {
            "api": api_node,
            "flow": flow_paths,
            "data_usage": data_flow,
            "services_involved": services_involved,
            "db_interactions": db_interactions,
            "output_effects": output_effects,
        }
        payload["description"] = await ai_service.explain_api(payload)
        return payload


api_service = APIService()
