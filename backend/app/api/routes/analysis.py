from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import AnalyzeRequest, AnalyzeResponse, ImpactResponse
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
    impact_nodes, dependency_nodes = analysis_service.get_impact(repo_id, node)
    if not impact_nodes and not dependency_nodes:
        raise HTTPException(status_code=404, detail="Node or analysis not found")

    return ImpactResponse(node=node, impact_nodes=impact_nodes, dependency_nodes=dependency_nodes)
