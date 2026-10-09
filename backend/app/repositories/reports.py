from datetime import UTC, datetime

from bson import ObjectId
from pymongo.asynchronous.database import AsyncDatabase

from app.models.admin import AdminReport
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


async def by_id(
    database: AsyncDatabase[dict[str, object]], report_id: ObjectId
) -> dict[str, object] | None:
    return await database.reports.find_one({"_id": report_id})


async def list_reports(
    database: AsyncDatabase[dict[str, object]], status: str
) -> list[AdminReport]:
    rows = await database.reports.aggregate(
        [
            {"$match": {"status": status}},
            {"$sort": {"created_at": 1, "_id": 1}},
            {
                "$lookup": {
                    "from": "materials",
                    "localField": "material_id",
                    "foreignField": "_id",
                    "as": "material",
                    "pipeline": [{"$project": {"title": 1, "status": 1}}],
                }
            },
            {
                "$lookup": {
                    "from": "users",
                    "localField": "reporter_id",
                    "foreignField": "_id",
                    "as": "reporter",
                    "pipeline": [{"$project": {"name": 1}}],
                }
            },
        ]
    )
    result = []
    async for row in rows:
        material = (
            row["material"][0]
            if isinstance(row["material"], list) and row["material"]
            else {}
        )
        reporter = (
            row["reporter"][0]
            if isinstance(row["reporter"], list) and row["reporter"]
            else {}
        )
        result.append(
            AdminReport.model_validate(
                row
                | {
                    "id": str(row["_id"]),
                    "material_id": str(row["material_id"]),
                    "material_title": material.get("title", "Removed material"),
                    "material_removed": material.get("status") != "active",
                    "reporter_name": reporter.get("name") or "Former member",
                    "resolved_by": str(row["resolved_by"])
                    if row.get("resolved_by")
                    else None,
                }
            )
        )
    return result


async def resolve(
    database: AsyncDatabase[dict[str, object]],
    report_id: ObjectId,
    admin_id: ObjectId,
    status: str,
) -> None:
    await database.reports.update_one(
        {"_id": report_id, "status": "open"},
        {"$set": {"status": status, "resolved_by": admin_id}},
    )
