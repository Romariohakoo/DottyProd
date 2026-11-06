import logging
import os
from pathlib import Path

from src.core.domain import NotFoundError

logger = logging.getLogger(__name__)


class LocalStorage:
    def __init__(self, root: Path):
        self.root = root

    def save(self, key: str, data: bytes) -> None:
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_name(path.name + ".tmp")
        temporary.write_bytes(data)
        os.replace(temporary, path)

    def open(self, key: str) -> Path:
        path = self._path(key)
        if not path.is_file():
            raise NotFoundError("Attachment not found")
        return path

    def delete(self, key: str) -> None:
        try:
            self._path(key).unlink(missing_ok=True)
        except OSError:
            logger.warning("failed to delete upload key=%s", key)

    def _path(self, key: str) -> Path:
        root = self.root.resolve()
        path = (root / key).resolve()
        if not path.is_relative_to(root):
            raise NotFoundError("Attachment not found")
        return path
