from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    """Input payload for repository analysis.

    repo_url accepts full GitHub URLs so the frontend can pass user input directly.
    """

    repo_url: str = Field(min_length=1)
    github_token: str | None = None


class GraphNode(BaseModel):
    id: str
    type: str


class GraphEdge(BaseModel):
    source: str
    target: str
    relation: str


class AnalyzeResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


class ImpactResponse(BaseModel):
    node: str
    impact_nodes: list[str]
    dependency_nodes: list[str]
