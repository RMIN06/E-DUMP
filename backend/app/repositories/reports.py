from datetime import UTC, datetime

from bson import ObjectId
from pymongo.asynchronous.database import AsyncDatabase

from app.models.report import ReportCreate


async def insert(
    database: AsyncDatabase[dict[str, object]],
    material_id: ObjectId,
    reporter_id: ObjectId,
    data: ReportCreate,
) -> str:
    report_id = ObjectId()
    await database.reports.insert_one(
        data.model_dump()
        | {
            "_id": report_id,
            "material_id": material_id,
            "reporter_id": reporter_id,
            "status": "open",
            "resolved_by": None,
            "created_at": datetime.now(UTC),
        }
    )
    return str(report_id)
