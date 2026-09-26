import os
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


async def paginate(collection, query, page=1, limit=10, sort_field="created_at", sort_dir=-1, projection=None):
    proj = projection or {"_id": 0}
    skip = (page - 1) * limit
    total = await collection.count_documents(query)
    cursor = collection.find(query, proj).sort(sort_field, sort_dir).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)
    return {"items": items, "total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit}
