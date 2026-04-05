import ast
import re
from dataclasses import dataclass


@dataclass
class ParsedFile:
    path: str
    imports: list[str]
    function_calls: list[str]


class RepositoryParser:
    """Parses repository source files into language-agnostic metadata.

    This isolates language-specific parsing from later dependency extraction.
    """

    def parse_files(self, files: list[dict[str, str]]) -> list[ParsedFile]:
        parsed_files: list[ParsedFile] = []
        for file in files:
            path = file["path"]
            content = file["content"]

            if path.endswith(".py"):
                parsed_files.append(self._parse_python(path, content))
            elif path.endswith((".js", ".jsx", ".ts", ".tsx")):
                parsed_files.append(self._parse_js_ts(path, content))

        return parsed_files

    def _parse_python(self, path: str, source: str) -> ParsedFile:
        imports: list[str] = []
        function_calls: list[str] = []

        try:
            tree = ast.parse(source)
        except SyntaxError:
            return ParsedFile(path=path, imports=imports, function_calls=function_calls)

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                imports.extend(alias.name for alias in node.names)
            elif isinstance(node, ast.ImportFrom) and node.module:
                imports.append(node.module)
            elif isinstance(node, ast.Call):
                function_name = self._python_call_name(node)
                if function_name:
                    function_calls.append(function_name)

        return ParsedFile(path=path, imports=imports, function_calls=function_calls)

    def _python_call_name(self, node: ast.Call) -> str | None:
        if isinstance(node.func, ast.Name):
            return node.func.id
        if isinstance(node.func, ast.Attribute):
            return node.func.attr
        return None

    def _parse_js_ts(self, path: str, source: str) -> ParsedFile:
        import_pattern = re.compile(r"(?:import\\s+.*?from\\s+['\"](.*?)['\"]|require\\(['\"](.*?)['\"]\\))")
        call_pattern = re.compile(r"\\b([A-Za-z_][A-Za-z0-9_]*)\\s*\\(")

        imports: list[str] = []
        function_calls: list[str] = []

        for match in import_pattern.findall(source):
            for entry in match:
                if entry:
                    imports.append(entry)

        for call in call_pattern.findall(source):
            if call not in {"if", "for", "while", "switch", "catch", "function"}:
                function_calls.append(call)

        return ParsedFile(path=path, imports=imports, function_calls=function_calls)
