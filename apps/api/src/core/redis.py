from typing import Any

import redis.asyncio as redis

from src.core.config import settings


class RedisClient:
    _instance: "RedisClient | None" = None
    _client: redis.Redis | None = None

    def __new__(cls) -> "RedisClient":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def connect(self) -> None:
        if self._client is None:
            self._client = redis.from_url(
                str(settings.redis_url),
                encoding="utf-8",
                decode_responses=True,
            )

    async def disconnect(self) -> None:
        if self._client is not None:
            await self._client.close()
            self._client = None

    @property
    def client(self) -> redis.Redis:
        if self._client is None:
            raise RuntimeError("Redis client not connected")
        return self._client

    async def get(self, key: str) -> str | None:
        return await self.client.get(key)

    async def set(
        self,
        key: str,
        value: str,
        ex: int | None = None,
    ) -> bool:
        return await self.client.set(key, value, ex=ex)

    async def delete(self, key: str) -> int:
        return await self.client.delete(key)

    async def exists(self, key: str) -> bool:
        return await self.client.exists(key) > 0

    async def incr(self, key: str) -> int:
        return await self.client.incr(key)

    async def expire(self, key: str, seconds: int) -> bool:
        return await self.client.expire(key, seconds)

    async def ttl(self, key: str) -> int:
        return await self.client.ttl(key)

    async def setex(self, key: str, seconds: int, value: str) -> bool:
        return await self.client.setex(key, seconds, value)

    async def hget(self, name: str, key: str) -> str | None:
        return await self.client.hget(name, key)

    async def hset(self, name: str, key: str, value: str) -> int:
        return await self.client.hset(name, key, value)

    async def hgetall(self, name: str) -> dict[str, Any]:
        return await self.client.hgetall(name)

    async def hdel(self, name: str, *keys: str) -> int:
        return await self.client.hdel(name, *keys)


redis_client = RedisClient()


async def get_redis() -> RedisClient:
    return redis_client
