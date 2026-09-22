"""File storage abstraction. Local disk for the MVP; swap in Azure/S3 later without API changes."""
import os
import shutil
from abc import ABC, abstractmethod
from pathlib import Path


class StorageBackend(ABC):
    @abstractmethod
    def put(self, key: str, data: bytes) -> str: ...

    @abstractmethod
    def get(self, key: str) -> bytes: ...

    @abstractmethod
    def delete(self, key: str) -> None: ...


class LocalDiskStorage(StorageBackend):
    """Stores files under STORAGE_DIR. Not production-grade: see report limitations."""

    def __init__(self, root: str):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        safe = key.replace("..", "").lstrip("/")
        p = (self.root / safe).resolve()
        if not str(p).startswith(str(self.root.resolve())):
            raise ValueError("Invalid storage key")
        return p

    def put(self, key: str, data: bytes) -> str:
        p = self._path(key)
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "wb") as f:
            f.write(data)
        return key

    def get(self, key: str) -> bytes:
        with open(self._path(key), "rb") as f:
            return f.read()

    def delete(self, key: str) -> None:
        p = self._path(key)
        if p.exists():
            p.unlink()


def get_storage() -> StorageBackend:
    return LocalDiskStorage(os.environ.get("STORAGE_DIR", "/app/backend/storage"))


# Uploads are grouped by media kind so the storage tree stays browsable:
# patients/<patient-id>/<kind>/<document-id>.<ext>
MEDIA_FOLDERS = {
    "application/pdf": "pdf",
    "image/png": "images",
    "image/jpeg": "images",
    "image/webp": "images",
    "image/heic": "images",
    "video/mp4": "videos",
    "video/quicktime": "videos",
    "audio/mpeg": "audio",
    "audio/wav": "audio",
}


def media_folder(mime_type: str) -> str:
    if mime_type in MEDIA_FOLDERS:
        return MEDIA_FOLDERS[mime_type]
    top = (mime_type or "").split("/")[0]
    return {"image": "images", "video": "videos", "audio": "audio"}.get(top, "other")
