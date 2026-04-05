from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import (
    AIInsightsResponse,
    AnalysisListResponse,
    AnalyzeRequest,
    AnalyzeResponse,
    ApiUnderstandingResponse,
    DataFlowResponse,
    DiffResponse,
    FlowResponse,
    ImpactResponse,
    RiskResponse,
    SimulateRequest,
    SimulateResponse,
    WorkflowListResponse,
)
from app.services.ai_service import ai_service
from app.services.analysis_service import analysis_service
from app.services.diff_service import diff_service
from app.services.simulation_service import simulation_service

router = APIRouter()


@router.post("/analyze")
async def analyze_repository(payload: AnalyzeRequest) -> dict:
    """Analyze a GitHub repository and return graph nodes and edges."""
    try:
        return await analysis_service.analyze_repo(payload.repo_url, payload.github_token)
    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.get("/graph")
async def get_graph(repo_id: str = Query(..., description="Phase 1 analysis identifier")) -> AnalyzeResponse:
    """Return serialized graph for a previously analyzed repository."""
    graph = analysis_service.get_graph(repo_id)
    if not graph:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return AnalyzeResponse(nodes=graph["nodes"], edges=graph["edges"])


@router.get("/impact")
async def get_impact(
    repo_id: str = Query(..., description="Phase 1 analysis identifier"),
    node: str = Query(..., description="Node id to evaluate"),
) -> ImpactResponse:
    """Compute impact and reverse dependencies for a graph node."""
    impact_payload = analysis_service.get_enhanced_impact(repo_id, node)
    if not impact_payload:
        raise HTTPException(status_code=404, detail="Node or analysis not found")

    return ImpactResponse(**impact_payload)


@router.get("/flow")
async def get_flow(
    repo_id: str = Query(..., description="Phase 1 analysis identifier"),
    node: str = Query(..., description="API or service node"),
) -> FlowResponse:
    """Return execution flow paths from an API or service node."""
    paths = analysis_service.get_flow(repo_id, node)
    if paths is None:
        raise HTTPException(status_code=404, detail="Node or analysis not found")

    return FlowResponse(node=node, paths=paths)


@router.get("/risk")
async def get_risk(
    repo_id: str = Query(..., description="Phase 1 analysis identifier"),
    node: str = Query(..., description="Node id to evaluate"),
) -> RiskResponse:
    """Compute deterministic risk score for a node change."""
    risk = analysis_service.get_risk(repo_id, node)
    if not risk:
        raise HTTPException(status_code=404, detail="Node or analysis not found")

    ai_explanation = await ai_service.explain_risk({"node": node, **risk})
    return RiskResponse(node=node, ai_explanation=ai_explanation, **risk)


@router.get("/dataflow")
async def get_dataflow(
    repo_id: str = Query(..., description="Phase 1 analysis identifier"),
    node: str = Query(..., description="API or service node"),
) -> DataFlowResponse:
    """Return inferred data movement for a selected node."""
    dataflow = analysis_service.get_dataflow(repo_id, node)
    if dataflow is None:
        raise HTTPException(status_code=404, detail="Node or analysis not found")

    return DataFlowResponse(node=node, data_flow=dataflow)


@router.get("/workflows")
async def get_workflows(
    repo_id: str = Query(..., description="Phase 1 analysis identifier"),
) -> WorkflowListResponse:
    """Return recurring workflow paths discovered in the graph."""
    workflows = analysis_service.get_workflows(repo_id)
    if workflows is None:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return WorkflowListResponse(workflows=workflows)


@router.get("/api-understanding")
async def get_api_understanding(
    repo_id: str = Query(..., description="Phase 1 analysis identifier"),
    node: str = Query(..., description="API node id"),
) -> ApiUnderstandingResponse:
    """Return API-level explanation with flow and data usage details."""
    result = await analysis_service.get_api_understanding(repo_id, node)
    if not result:
        raise HTTPException(status_code=404, detail="API node or analysis not found")

    return ApiUnderstandingResponse(**result)


@router.get("/analyses")
async def list_analyses(limit: int = Query(20, ge=1, le=100)) -> AnalysisListResponse:
    """Return recent analysis snapshots for diff/comparison workflows."""
    return AnalysisListResponse(analyses=analysis_service.list_analyses(limit=limit))


@router.post("/simulate")
async def simulate_failure(payload: SimulateRequest) -> SimulateResponse:
    """Simulate failure of a node and return affected services, APIs, and flows."""
    graph_payload = analysis_service.get_graph_payload(payload.repo_id)
    if not graph_payload:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return SimulateResponse(**simulation_service.simulate_node_failure(graph_payload, payload.node))


@router.get("/diff")
async def get_diff(
    repo_id: str = Query(..., description="Current analysis identifier"),
    analysis_id_a: str = Query(..., description="Baseline analysis identifier"),
    analysis_id_b: str = Query(..., description="Target analysis identifier"),
) -> DiffResponse:
    """Compare two analysis snapshots and return graph/flow/risk deltas."""
    # repo_id is required for API consistency with dashboard context.
    _ = repo_id

    graph_a = analysis_service.get_graph_payload(analysis_id_a)
    graph_b = analysis_service.get_graph_payload(analysis_id_b)
    if not graph_a or not graph_b:
        raise HTTPException(status_code=404, detail="One or both analyses not found")

    return DiffResponse(**diff_service.compare(graph_a, graph_b))


@router.get("/ai-insights")
async def get_ai_insights(repo_id: str = Query(..., description="Phase 1 analysis identifier")) -> AIInsightsResponse:
    """Return architecture summary, risk reasoning, and refactor insights for a repo graph."""
    graph_payload = analysis_service.get_graph_payload(repo_id)
    if not graph_payload:
        raise HTTPException(status_code=404, detail="Analysis not found")

    node_ids = [node.get("id", "") for node in graph_payload.get("nodes", []) if node.get("id")]
    highest_risk_node = None
    highest_risk_score = -1.0
    highest_risk_payload: dict | None = None
    for node in node_ids:
        result = analysis_service.get_risk(repo_id, node)
        if not result:
            continue
        score = float(result.get("score", 0))
        if score > highest_risk_score:
            highest_risk_score = score
            highest_risk_node = node
            highest_risk_payload = result

    risk_reasoning = await ai_service.explain_risk(
        {
            "node": highest_risk_node or "system",
            **(highest_risk_payload or {"risk_level": "LOW", "score": 0.0, "reasons": ["No critical node detected"]}),
        }
    )

    return AIInsightsResponse(
        architecture_summary=await ai_service.explain_architecture(graph_payload),
        risk_reasoning=risk_reasoning,
        refactor_suggestions=await ai_service.suggest_refactors(graph_payload),
        anti_patterns=await ai_service.detect_anti_patterns(graph_payload),
    )
