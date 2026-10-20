from datetime import datetime, timezone, timedelta

MIN_SAMPLE = 5


def week_id_for(dt: datetime) -> str:
    y, w, _ = dt.isocalendar()
    return f"{y}-W{w:02d}"


async def _group(db, match, field, success_expr):
    pipeline = [
        {"$match": match},
        {"$group": {"_id": f"${field}", "total": {"$sum": 1}, "success": {"$sum": success_expr}}},
    ]
    return await db.matches.aggregate(pipeline).to_list(500)


async def run_aggregation(db):
    now = datetime.now(timezone.utc)
    week_id = week_id_for(now)
    kills = {"$cond": ["$outcome", 0, 1]}
    escapes = {"$cond": ["$outcome", 1, 0]}

    killer_rows = await _group(db, {"week_id": week_id}, "killer_id", kills)
    survivor_rows = await _group(db, {"week_id": week_id}, "survivor_id", escapes)
    pick_rows = await _group(db, {"timestamp": {"$gte": now - timedelta(days=7)}}, "killer_id", kills)

    def rows(kind, data):
        return [{
            "week_id": week_id, "kind": kind, "character_id": r["_id"],
            "total_encounters": r["total"], "kills_escapes": r["success"],
            "win_rate": round(r["success"] / r["total"] * 100, 1) if r["total"] else 0.0,
            "updated_at": now,
        } for r in data]

    docs = rows("killer", killer_rows) + rows("survivor", survivor_rows) + rows("pick", pick_rows)
    await db.global_aggregates.delete_many({"week_id": week_id})
    if docs:
        await db.global_aggregates.insert_many(docs)
    pick_total = sum(r["total"] for r in pick_rows)
    await db.settings.update_one(
        {"key": "aggregates"},
        {"$set": {"key": "aggregates", "week_id": week_id, "updated_at": now,
                  "pick_total": pick_total,
                  "week_total": sum(r["total"] for r in killer_rows)}},
        upsert=True,
    )
    return week_id
