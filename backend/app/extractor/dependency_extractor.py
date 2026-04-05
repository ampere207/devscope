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
                relations.append(
                    DependencyRelation(
                        source=parsed_file.path,
                        target=imported_module,
                        relation="imports",
                    )
                )

            for function_call in parsed_file.function_calls:
                relations.append(
                    DependencyRelation(
                        source=parsed_file.path,
                        target=function_call,
                        relation="calls",
                    )
                )

        return relations
