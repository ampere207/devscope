from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import AnalyzeRequest, AnalyzeResponse, FlowResponse, ImpactResponse, RiskResponse
from app.services.analysis_service import analysis_service

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

    return RiskResponse(node=node, **risk)
