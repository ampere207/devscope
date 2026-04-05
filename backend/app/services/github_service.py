from collections.abc import Iterable
from urllib.parse import urlparse

import httpx

from app.utils.config import get_settings


class GitHubService:
    """GitHub API integration service.

    Encapsulates repository fetch behavior so API handlers stay focused on orchestration.
    """

    def __init__(self) -> None:
        self.settings = get_settings()

    def _build_headers(self, token: str | None) -> dict[str, str]:
        headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return headers

    def _parse_repo_url(self, repo_url: str) -> tuple[str, str]:
        parsed = urlparse(repo_url)
        if parsed.netloc != "github.com":
            raise ValueError("repo_url must be a github.com URL")

        segments = [segment for segment in parsed.path.split("/") if segment]
        if len(segments) < 2:
            raise ValueError("repo_url must include owner and repository")

        owner, repo = segments[0], segments[1].removesuffix(".git")
        return owner, repo

    def _ensure_success(self, response: httpx.Response) -> None:
        """Raise friendly errors for common GitHub API failure cases."""
        if response.is_success:
            return

        if response.status_code == 403:
            remaining = response.headers.get("X-RateLimit-Remaining")
            reset = response.headers.get("X-RateLimit-Reset")
            if remaining == "0":
                raise ValueError(
                    "GitHub API rate limit exceeded. Add a GitHub token in /repo to increase limits, "
                    f"or wait for reset (epoch {reset})."
                )

            raise ValueError(
                "GitHub denied access (403). Verify token validity and repository permissions."
            )

        if response.status_code == 404:
            raise ValueError("Repository not found. Verify the URL and access permissions.")

        response.raise_for_status()

    async def get_user_repos(self, token: str) -> list[dict]:
        """Return repositories available to the current GitHub token."""
        endpoint = f"{self.settings.github_api_base_url}/user/repos"

        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(endpoint, headers=self._build_headers(token))
            self._ensure_success(response)
            return response.json()

    async def fetch_repo_contents(self, repo_url: str, token: str | None = None) -> list[dict[str, str]]:
        """Fetch text files from a repository using GitHub's recursive tree API.

        The result is flattened into path/content pairs so parser layers can stay VCS-agnostic.
        """
        owner, repo = self._parse_repo_url(repo_url)
        repo_endpoint = f"{self.settings.github_api_base_url}/repos/{owner}/{repo}"

        async with httpx.AsyncClient(timeout=30) as client:
            repo_response = await client.get(repo_endpoint, headers=self._build_headers(token))
            self._ensure_success(repo_response)
            default_branch = repo_response.json()["default_branch"]

            tree_endpoint = (
                f"{self.settings.github_api_base_url}/repos/{owner}/{repo}/git/trees/{default_branch}?recursive=1"
            )
            tree_response = await client.get(tree_endpoint, headers=self._build_headers(token))
            self._ensure_success(tree_response)
            tree_items = tree_response.json().get("tree", [])

            files: list[dict[str, str]] = []
            for item in self._iter_supported_files(tree_items):
                content_response = await client.get(item["url"], headers=self._build_headers(token))
                self._ensure_success(content_response)
                payload = content_response.json()
                content = payload.get("content", "")
                encoding = payload.get("encoding")

                if encoding == "base64":
                    import base64

                    decoded = base64.b64decode(content).decode("utf-8", errors="ignore")
                    files.append({"path": item["path"], "content": decoded})

            return files

    def _iter_supported_files(self, items: Iterable[dict]) -> Iterable[dict]:
        supported_suffixes = (
            ".py",
            ".js",
            ".jsx",
            ".ts",
            ".tsx",
        )

        for item in items:
            if item.get("type") != "blob":
                continue
            path = item.get("path", "")
            if path.endswith(supported_suffixes):
                yield item
