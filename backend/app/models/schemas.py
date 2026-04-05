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
    affected_nodes: list[str]
    affected_apis: list[str]
    affected_flows: list[list[str]]


class FlowResponse(BaseModel):
    node: str
    paths: list[list[str]]


class RiskResponse(BaseModel):
    node: str
    risk_level: str
    score: float
    reasons: list[str]
    ai_explanation: str | None = None


class DataFlowRecord(BaseModel):
    from_node: str = Field(alias="from")
    to: str
    data: str
    payload: str
    relation: str


class DataFlowResponse(BaseModel):
    node: str
    data_flow: list[DataFlowRecord]


class WorkflowSummary(BaseModel):
    workflow_name: str
    steps: list[str]
    path_count: int
    apis: list[str]


class WorkflowListResponse(BaseModel):
    workflows: list[WorkflowSummary]


class ApiUnderstandingResponse(BaseModel):
    api: str
    description: str
    flow: list[list[str]]
    data_usage: list[DataFlowRecord]
    services_involved: list[str]
    db_interactions: list[str]
    output_effects: list[str]


class AnalysisListItem(BaseModel):
    analysis_id: str
    repo_url: str
    created_at: str


class AnalysisListResponse(BaseModel):
    analyses: list[AnalysisListItem]


class ChangedFlowRecord(BaseModel):
    api: str
    before_count: int
    after_count: int
    added_paths: list[list[str]]
    removed_paths: list[list[str]]


class RiskAggregate(BaseModel):
    average_score: float
    high_risk_nodes: int
    total_nodes: int


class DiffRiskDelta(BaseModel):
    before: RiskAggregate
    after: RiskAggregate


class DiffResponse(BaseModel):
    new_dependencies: list[GraphEdge]
    removed_dependencies: list[GraphEdge]
    changed_flows: list[ChangedFlowRecord]
    risk_delta: DiffRiskDelta


class SimulateRequest(BaseModel):
    repo_id: str = Field(min_length=1)
    node: str = Field(min_length=1)


class DegradedFlowRecord(BaseModel):
    api: str
    before_count: int
    after_count: int
    removed_paths: list[list[str]]


class SimulateResponse(BaseModel):
    affected_services: list[str]
    broken_apis: list[str]
    degraded_flows: list[DegradedFlowRecord]


class AIInsightsResponse(BaseModel):
    architecture_summary: str
    risk_reasoning: str
    refactor_suggestions: list[str]
    anti_patterns: list[str]


class GitHubOAuthStartResponse(BaseModel):
    authorization_url: str


class GitHubOAuthExchangeRequest(BaseModel):
    code: str = Field(min_length=1)
    redirect_uri: str = Field(min_length=1)


class GitHubOAuthExchangeResponse(BaseModel):
    access_token: str
    token_type: str
    scope: str


class GitHubRepoListRequest(BaseModel):
    access_token: str = Field(min_length=1)


class GitHubRepository(BaseModel):
    id: int | None = None
    name: str | None = None
    full_name: str | None = None
    repo_url: str | None = None
    private: bool = False
    default_branch: str | None = None


class GitHubRepoListResponse(BaseModel):
    repositories: list[GitHubRepository]
