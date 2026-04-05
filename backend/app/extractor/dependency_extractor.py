from dataclasses import dataclass

from app.parser.repository_parser import ParsedFile


@dataclass
class DependencyRelation:
    source: str
    target: str
    relation: str


class DependencyExtractor:
    """Converts parsed file data into normalized dependency relationships."""

    def extract(self, parsed_files: list[ParsedFile]) -> list[DependencyRelation]:
        relations: list[DependencyRelation] = []

        for parsed_file in parsed_files:
            for imported_module in parsed_file.imports:
                if not self._should_keep_import(imported_module):
                    continue

                relations.append(
                    DependencyRelation(
                        source=parsed_file.path,
                        target=imported_module,
                        relation="imports",
                    )
                )

            for function_call in parsed_file.function_calls:
                if not self._should_keep_call(function_call):
                    continue

                relations.append(
                    DependencyRelation(
                        source=parsed_file.path,
                        target=function_call,
                        relation="calls",
                    )
                )

        return relations

    def _should_keep_import(self, imported_module: str) -> bool:
        normalized = imported_module.replace("\\", "/").strip()
        if not normalized:
            return False

        # Keep internal project imports and relative imports; drop third-party libraries.
        if normalized.startswith(("./", "../", "@/", "/")):
            return True
        if normalized.startswith("app.") or normalized.startswith("backend.") or normalized.startswith("frontend."):
            return True

        return "/" in normalized

    def _should_keep_call(self, function_call: str) -> bool:
        normalized = function_call.lower().strip()
        if not normalized:
            return False

        important_keywords = (
            "service",
            "controller",
            "handler",
            "route",
            "workflow",
            "api",
            "analysis",
            "graph",
            "query",
            "repo",
            "db",
        )

        return any(keyword in normalized for keyword in important_keywords)
