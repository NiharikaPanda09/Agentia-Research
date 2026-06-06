import json
from typing import Optional, Any
import redis
from app.core.config import settings

class MemoryCache:
    def __init__(self):
        self._data = {}

    def get(self, key: str) -> Optional[str]:
        return self._data.get(key)

    def set(self, key: str, value: str, ex: Optional[int] = None) -> None:
        self._data[key] = value

    def delete(self, key: str) -> None:
        self._data.pop(key, None)

    def clear(self) -> None:
        self._data.clear()

class CacheService:
    def __init__(self):
        self.redis_client = None
        self.local_cache = MemoryCache()
        
        # Check if Redis should be enabled
        try:
            self.redis_client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=0,
                socket_timeout=1.0,
                decode_responses=True
            )
            # Ping to verify connection
            self.redis_client.ping()
            print("Connected to Redis successfully.")
        except Exception:
            print("Redis not available. Using local in-memory fallback cache.")
            self.redis_client = None

    def get(self, key: str) -> Optional[Any]:
        if self.redis_client:
            try:
                val = self.redis_client.get(key)
                return json.loads(val) if val else None
            except Exception:
                pass
        return self.local_cache.get(key)

    def set(self, key: str, value: Any, expire_seconds: Optional[int] = None) -> None:
        serialized = json.dumps(value)
        if self.redis_client:
            try:
                self.redis_client.set(key, serialized, ex=expire_seconds)
                return
            except Exception:
                pass
        self.local_cache.set(key, serialized, ex=expire_seconds)

    def delete(self, key: str) -> None:
        if self.redis_client:
            try:
                self.redis_client.delete(key)
                return
            except Exception:
                pass
        self.local_cache.delete(key)

cache_service = CacheService()
