import httpx

from app.services.github_service import GitHubService
from app.utils.config import get_settings


class GitHubOAuthService:
    """Handles GitHub OAuth and authenticated repository discovery."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.github_service = GitHubService()

    def build_authorization_url(self, state: str, redirect_uri: str) -> str:
        client_id = self.settings.github_oauth_client_id
        if not client_id:
            raise ValueError("GitHub OAuth is not configured. Missing github_oauth_client_id.")

        params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "scope": "repo read:user",
            "state": state,
            "allow_signup": "true",
        }

        from urllib.parse import urlencode

        return f"https://github.com/login/oauth/authorize?{urlencode(params)}"

    async def exchange_code(self, code: str, redirect_uri: str) -> dict:
        client_id = self.settings.github_oauth_client_id
        client_secret = self.settings.github_oauth_client_secret

        if not client_id or not client_secret:
            raise ValueError(
                "GitHub OAuth is not configured. Missing github_oauth_client_id/github_oauth_client_secret."
            )

        endpoint = "https://github.com/login/oauth/access_token"
        payload = {
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "redirect_uri": redirect_uri,
        }

        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                endpoint,
                data=payload,
                headers={"Accept": "application/json"},
            )
            response.raise_for_status()
            data = response.json()

        if data.get("error"):
            raise ValueError(data.get("error_description") or data["error"])

        access_token = data.get("access_token")
        if not access_token:
            raise ValueError("GitHub OAuth exchange succeeded but no access token was returned.")

        return {
            "access_token": access_token,
            "token_type": data.get("token_type", "bearer"),
            "scope": data.get("scope", ""),
        }

    async def list_repositories(self, access_token: str) -> list[dict]:
        repos = await self.github_service.get_user_repos(access_token)
        return [
            {
                "id": repo.get("id"),
                "name": repo.get("name"),
                "full_name": repo.get("full_name"),
                "repo_url": repo.get("html_url"),
                "private": repo.get("private", False),
                "default_branch": repo.get("default_branch"),
            }
            for repo in repos
        ]


github_oauth_service = GitHubOAuthService()
