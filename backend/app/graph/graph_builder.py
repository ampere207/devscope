import networkx as nx

from app.extractor.dependency_extractor import DependencyRelation


class GraphBuilder:
    """Builds and queries dependency graphs.

    NetworkX gives us clear graph semantics while keeping the implementation simple.
    """

    def build(self, relations: list[DependencyRelation]) -> nx.DiGraph:
        graph = nx.DiGraph()

        for relation in relations:
            graph.add_node(relation.source, type="file")
            graph.add_node(relation.target, type="symbol")
            graph.add_edge(relation.source, relation.target, relation=relation.relation)

        return graph

    def to_serializable(self, graph: nx.DiGraph) -> dict[str, list[dict[str, str]]]:
        nodes = [
            {"id": str(node), "type": str(graph.nodes[node].get("type", "unknown"))}
            for node in graph.nodes
        ]
        edges = [
            {
                "source": str(source),
                "target": str(target),
                "relation": str(attributes.get("relation", "depends_on")),
            }
            for source, target, attributes in graph.edges(data=True)
        ]
        return {"nodes": nodes, "edges": edges}

    def get_impact(self, graph: nx.DiGraph, node: str) -> list[str]:
        if node not in graph:
            return []
        return sorted(nx.descendants(graph, node))

    def get_dependencies(self, graph: nx.DiGraph, node: str) -> list[str]:
        if node not in graph:
            return []
        return sorted(nx.ancestors(graph, node))
