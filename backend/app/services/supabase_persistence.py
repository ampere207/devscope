from __future__ import annotations

import logging
from typing import Any

import httpx

from app.utils.config import get_settings

logger = logging.getLogger(__name__)


class SupabasePersistenceService:
    def __init__(self) -> None:
        settings = get_settings()
        self.supabase_url = getattr(settings, "supabase_url", None)
        self.service_role_key = getattr(settings, "supabase_service_role_key", None)

    def is_enabled(self) -> bool:
        return bool(self.supabase_url and self.service_role_key)

    def _headers(self) -> dict[str, str]:
        if not self.is_enabled():
            return {}
        return {
            "apikey": self.service_role_key or "",
            "Authorization": f"Bearer {self.service_role_key}",
            "Content-Type": "application/json",
        }

    def _request(self, path: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        if not self.is_enabled():
            return []

        url = f"{self.supabase_url}/rest/v1/{path}"
        try:
            with httpx.Client(timeout=15) as client:
                response = client.get(url, headers=self._headers(), params=params)
                response.raise_for_status()
                payload = response.json()
                return payload if isinstance(payload, list) else []
        except Exception as error:
            logger.warning("Supabase persistence read failed for %s: %s", path, error)
            return []

    def _fetch_repository_map(self, repo_ids: list[str]) -> dict[str, str]:
        if not repo_ids:
            return {}

        rows = self._request(
            "repositories",
            params={
                "select": "id,repo_url",
                "id": f"in.({','.join(repo_ids)})",
                "limit": 1000,
            },
        )
        return {str(row.get("id", "")): str(row.get("repo_url", "")) for row in rows}

    def list_analysis_records(self, limit: int = 20) -> list[dict[str, Any]]:
        rows = self._request(
            "analyses",
            params={
                "select": "id,repo_id,graph_data,created_at",
                "order": "created_at.desc",
                "limit": limit,
            },
        )
        if not rows:
            return []

        repo_ids = [str(row.get("repo_id", "")) for row in rows if row.get("repo_id")]
        repo_map = self._fetch_repository_map(repo_ids)

        records: list[dict[str, Any]] = []
        for row in rows:
            graph_data = row.get("graph_data") or {}
            backend_analysis_id = graph_data.get("backend_analysis_id") or row.get("id")
            repo_url = graph_data.get("repo_url") or repo_map.get(str(row.get("repo_id", "")), "unknown")
            records.append(
                {
                    "analysis_id": str(backend_analysis_id or row.get("id") or ""),
                    "repo_url": repo_url,
                    "created_at": str(row.get("created_at", "")),
                    "graph": {
                        "nodes": graph_data.get("nodes", []),
                        "edges": graph_data.get("edges", []),
                    },
                }
            )

        return records

    def get_analysis_record(self, analysis_id: str) -> dict[str, Any] | None:
        records = self.list_analysis_records(limit=1000)
        for record in records:
            if record.get("analysis_id") == analysis_id:
                return record
        return None


supabase_persistence_service = SupabasePersistenceService()