from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import hmac
import uuid
import secrets
import logging
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import Optional

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, BackgroundTasks
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError
from pydantic import BaseModel, Field, EmailStr

from roster import KILLERS, SURVIVORS, CHARACTERS
from aggregation import run_aggregation, week_id_for, MIN_SAMPLE
from emailer import send_email, reset_code_email

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
CRON_SECRET = os.environ["WEBHOOK_CRON_SECRET"]
ACCESS_TTL = timedelta(minutes=15)
REFRESH_TTL = timedelta(days=30)
PIN_PATTERN = r"^\d{4,6}$"

app = FastAPI()
api = APIRouter(prefix="/api")


def now_utc():
    return datetime.now(timezone.utc)


def iso(dt):
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


# ---------- auth helpers ----------
def hash_pin(pin: str) -> str:
    return bcrypt.hashpw(pin.encode(), bcrypt.gensalt()).decode()


def verify_pin(pin: str, hashed: str) -> bool:
    return bcrypt.checkpw(pin.encode(), hashed.encode())


def make_token(user_id: str, kind: str, ttl: timedelta) -> str:
    return jwt.encode({"sub": user_id, "type": kind, "exp": now_utc() + ttl}, JWT_SECRET, algorithm=JWT_ALG)


def set_auth_cookies(response: Response, user_id: str):
    response.set_cookie("access_token", make_token(user_id, "access", ACCESS_TTL), httponly=True, secure=True,
                        samesite="none", max_age=int(ACCESS_TTL.total_seconds()), path="/")
    response.set_cookie("refresh_token", make_token(user_id, "refresh", REFRESH_TTL), httponly=True, secure=True,
                        samesite="none", max_age=int(REFRESH_TTL.total_seconds()), path="/")


def public_user(u: dict) -> dict:
    return {"user_id": u["user_id"], "email": u["email"], "role": u.get("role", "user"),
            "created_at": iso(u["created_at"]), "total_matches": u.get("total_matches", 0),
            "last_survivor_id": u.get("last_survivor_id")}


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    if payload.get("type") != "access":
        raise HTTPException(401, "Invalid token type")
    user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    return user


# ---------- models ----------
class AuthIn(BaseModel):
    email: EmailStr
    pin: str = Field(pattern=PIN_PATTERN)


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    email: EmailStr
    code: str = Field(pattern=r"^\d{6}$")
    new_pin: str = Field(pattern=PIN_PATTERN)


class AdvancedIn(BaseModel):
    chase_seconds: Optional[int] = Field(default=None, ge=0, le=1800)
    protection_hits: Optional[int] = Field(default=None, ge=0, le=30)
    safe_unhooks: Optional[int] = Field(default=None, ge=0, le=20)


class MatchIn(BaseModel):
    killer_id: str
    survivor_id: str
    outcome: bool
    advanced: Optional[AdvancedIn] = None


class SettingsIn(BaseModel):
    assets_enabled: bool


# ---------- auth routes ----------
@api.post("/auth/register")
async def register(body: AuthIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "An account with this email already exists")
    user = {"user_id": str(uuid.uuid4()), "email": email, "pin_hash": hash_pin(body.pin), "role": "user",
            "created_at": now_utc(), "total_matches": 0, "last_survivor_id": None}
    await db.users.insert_one(dict(user))
    set_auth_cookies(response, user["user_id"])
    return public_user(user)


@api.post("/auth/login")
async def login(body: AuthIn, response: Response):
    email = body.email.lower()
    ident = f"login:{email}"
    attempt = await db.login_attempts.find_one({"identifier": ident})
    if attempt and attempt.get("locked_until") and attempt["locked_until"].replace(tzinfo=timezone.utc) > now_utc():
        raise HTTPException(429, "Too many failed attempts. Try again in 15 minutes.")
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_pin(body.pin, user["pin_hash"]):
        count = (attempt or {}).get("count", 0) + 1
        update = {"identifier": ident, "count": count}
        if count >= 5:
            update.update({"count": 0, "locked_until": now_utc() + timedelta(minutes=15)})
        await db.login_attempts.update_one({"identifier": ident}, {"$set": update}, upsert=True)
        raise HTTPException(401, "Invalid email or PIN")
    await db.login_attempts.delete_many({"identifier": ident})
    set_auth_cookies(response, user["user_id"])
    return public_user(user)


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/", secure=True, samesite="none")
    response.delete_cookie("refresh_token", path="/", secure=True, samesite="none")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@api.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(401, "No refresh token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid refresh token")
    if payload.get("type") != "refresh":
        raise HTTPException(401, "Invalid token type")
    user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(401, "User not found")
    set_auth_cookies(response, user["user_id"])
    return public_user(user)


@api.post("/auth/forgot-pin")
async def forgot_pin(body: ForgotIn):
    email = body.email.lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if user:
        recent = await db.pin_resets.find_one({"email": email, "created_at": {"$gte": now_utc() - timedelta(seconds=60)}})
        if not recent:
            code = f"{secrets.randbelow(1_000_000):06d}"
            await db.pin_resets.delete_many({"email": email})
            await db.pin_resets.insert_one({"email": email, "code_hash": hash_pin(code), "attempts": 0,
                                            "created_at": now_utc(), "expires_at": now_utc() + timedelta(minutes=15)})
            subject, html = reset_code_email(code)
            await send_email(to=email, subject=subject, html=html)
    return {"ok": True, "message": "If that account exists, a reset code is on its way."}


@api.post("/auth/reset-pin")
async def reset_pin(body: ResetIn, response: Response):
    email = body.email.lower()
    rec = await db.pin_resets.find_one({"email": email})
    if not rec or rec["expires_at"].replace(tzinfo=timezone.utc) < now_utc() or rec["attempts"] >= 5:
        raise HTTPException(400, "Reset code is invalid or expired")
    if not verify_pin(body.code, rec["code_hash"]):
        await db.pin_resets.update_one({"_id": rec["_id"]}, {"$inc": {"attempts": 1}})
        raise HTTPException(400, "Reset code is invalid or expired")
    user = await db.users.find_one_and_update({"email": email}, {"$set": {"pin_hash": hash_pin(body.new_pin)}},
                                              projection={"_id": 0})
    await db.pin_resets.delete_many({"email": email})
    set_auth_cookies(response, user["user_id"])
    return public_user(user)


# ---------- roster & settings ----------
async def assets_enabled() -> bool:
    s = await db.settings.find_one({"key": "assets"}, {"_id": 0})
    return s["assets_enabled"] if s else True


@api.get("/roster")
async def roster():
    enabled = await assets_enabled()

    def strip(chars):
        return [{**c, "image": c["image"] if enabled else None} for c in chars]

    return {"assets_enabled": enabled, "killers": strip(KILLERS), "survivors": strip(SURVIVORS)}


@api.put("/admin/settings")
async def update_settings(body: SettingsIn, _: dict = Depends(require_admin)):
    await db.settings.update_one({"key": "assets"}, {"$set": {"key": "assets", "assets_enabled": body.assets_enabled}},
                                 upsert=True)
    return {"assets_enabled": body.assets_enabled}


@api.post("/admin/aggregate")
async def admin_aggregate(_: dict = Depends(require_admin)):
    week_id = await run_aggregation(db)
    return {"ok": True, "week_id": week_id}


# ---------- matches ----------
@api.post("/matches")
async def log_match(body: MatchIn, user: dict = Depends(get_current_user)):
    k, s = CHARACTERS.get(body.killer_id), CHARACTERS.get(body.survivor_id)
    if not k or k["role"] != "killer" or not s or s["role"] != "survivor":
        raise HTTPException(400, "Unknown killer or survivor")
    ts = now_utc()
    last = await db.matches.find_one({"user_id": user["user_id"]}, {"_id": 0, "timestamp": 1}, sort=[("timestamp", -1)])
    if last and ts - last["timestamp"].replace(tzinfo=timezone.utc) < timedelta(seconds=5):
        raise HTTPException(429, "Slow down - wait a few seconds between logs")
    if await db.matches.count_documents({"user_id": user["user_id"], "timestamp": {"$gte": ts - timedelta(hours=1)}}) >= 30:
        raise HTTPException(429, "Hourly log limit reached (30 trials/hour)")
    adv = body.advanced.model_dump(exclude_none=True) if body.advanced else None
    doc = {"match_id": str(uuid.uuid4()), "user_id": user["user_id"], "timestamp": ts, "week_id": week_id_for(ts),
           "killer_id": body.killer_id, "survivor_id": body.survivor_id, "outcome": body.outcome,
           "advanced": adv or None}
    await db.matches.insert_one(dict(doc))
    await db.users.update_one({"user_id": user["user_id"]},
                              {"$inc": {"total_matches": 1}, "$set": {"last_survivor_id": body.survivor_id}})
    return match_out(doc)


def match_out(m: dict) -> dict:
    return {"match_id": m["match_id"], "timestamp": iso(m["timestamp"]), "killer_id": m["killer_id"],
            "survivor_id": m["survivor_id"], "outcome": m["outcome"], "advanced": m.get("advanced")}


@api.get("/matches")
async def list_matches(limit: int = 20, user: dict = Depends(get_current_user)):
    rows = await db.matches.find({"user_id": user["user_id"]}, {"_id": 0}).sort("timestamp", -1).to_list(min(limit, 100))
    return [match_out(m) for m in rows]


@api.delete("/matches/{match_id}")
async def delete_match(match_id: str, user: dict = Depends(get_current_user)):
    res = await db.matches.delete_one({"match_id": match_id, "user_id": user["user_id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Match not found")
    await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"total_matches": -1}})
    return {"ok": True}


# ---------- personal stats ----------
def _rate(a, b):
    return round(a / b * 100, 1) if b else 0.0


@api.get("/me/stats")
async def my_stats(user: dict = Depends(get_current_user)):
    rows = await db.matches.find({"user_id": user["user_id"]},
                                 {"_id": 0, "killer_id": 1, "survivor_id": 1, "outcome": 1, "timestamp": 1}
                                 ).sort("timestamp", 1).to_list(20000)
    total = len(rows)
    escapes = sum(1 for r in rows if r["outcome"])
    killers, survivors, days = defaultdict(lambda: [0, 0]), defaultdict(lambda: [0, 0]), defaultdict(lambda: [0, 0])
    for r in rows:
        for bucket, key in ((killers, r["killer_id"]), (survivors, r["survivor_id"]),
                            (days, r["timestamp"].strftime("%Y-%m-%d"))):
            bucket[key][0] += 1
            bucket[key][1] += 1 if r["outcome"] else 0

    killer_breakdown = sorted([{"killer_id": k, "matches": v[0], "escapes": v[1], "deaths": v[0] - v[1],
                                "escape_rate": _rate(v[1], v[0])} for k, v in killers.items()],
                              key=lambda x: (-x["matches"], x["escape_rate"]))
    nemesis = max(killer_breakdown, key=lambda x: (x["deaths"], -x["escape_rate"]), default=None)
    if nemesis and nemesis["deaths"] == 0:
        nemesis = None
    surv = [{"survivor_id": k, "matches": v[0], "escapes": v[1], "escape_rate": _rate(v[1], v[0])}
            for k, v in survivors.items()]
    eligible = [s for s in surv if s["matches"] >= 3] or surv
    best = max(eligible, key=lambda x: (x["escape_rate"], x["matches"]), default=None)
    if best and best["escapes"] == 0:
        best = None

    trend, cum_m, cum_e = [], 0, 0
    for day in sorted(days):
        m, e = days[day]
        cum_m, cum_e = cum_m + m, cum_e + e
        trend.append({"date": day, "matches": m, "escape_rate": _rate(e, m), "overall_rate": _rate(cum_e, cum_m)})

    return {"total_matches": total, "escapes": escapes, "sacrifices": total - escapes,
            "escape_rate": _rate(escapes, total), "nemesis": nemesis, "best_survivor": best,
            "killer_breakdown": killer_breakdown, "trend": trend[-30:]}


# ---------- global leaderboards ----------
@api.get("/leaderboards")
async def leaderboards():
    meta = await db.settings.find_one({"key": "aggregates"}, {"_id": 0})
    if not meta:
        return {"week_id": week_id_for(now_utc()), "updated_at": None, "min_sample": MIN_SAMPLE,
                "killers": [], "most_sacrifices": None, "survivors_by_escapes": [], "survivors_by_rate": [],
                "pick_rates": [], "week_total": 0, "pick_total": 0}
    rows = await db.global_aggregates.find({"week_id": meta["week_id"]}, {"_id": 0, "updated_at": 0}).to_list(1000)
    by_kind = defaultdict(list)
    for r in rows:
        by_kind[r["kind"]].append(r)
    killers = sorted([r for r in by_kind["killer"] if r["total_encounters"] >= MIN_SAMPLE],
                     key=lambda r: (-r["win_rate"], -r["total_encounters"]))
    most_sac = max(by_kind["killer"], key=lambda r: r["kills_escapes"], default=None)
    survivors = by_kind["survivor"]
    pick_total = meta.get("pick_total", 0)
    picks = sorted([{**r, "pick_rate": _rate(r["total_encounters"], pick_total)} for r in by_kind["pick"]],
                   key=lambda r: -r["total_encounters"])
    return {
        "week_id": meta["week_id"], "updated_at": iso(meta["updated_at"]), "min_sample": MIN_SAMPLE,
        "week_total": meta.get("week_total", 0), "pick_total": pick_total,
        "killers": killers[:25], "most_sacrifices": most_sac if most_sac and most_sac["kills_escapes"] else None,
        "survivors_by_escapes": sorted([r for r in survivors if r["kills_escapes"]], key=lambda r: -r["kills_escapes"])[:25],
        "survivors_by_rate": sorted([r for r in survivors if r["total_encounters"] >= MIN_SAMPLE],
                                    key=lambda r: (-r["win_rate"], -r["total_encounters"]))[:25],
        "pick_rates": picks[:25],
    }


# ---------- cron ----------
@api.post("/cron/aggregate", status_code=202)
async def cron_aggregate(request: Request, background: BackgroundTasks):
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer ") or not hmac.compare_digest(auth[7:], CRON_SECRET):
        raise HTTPException(401, "Unauthorized")
    try:
        envelope = await request.json()
    except Exception:
        envelope = {}
    if not isinstance(envelope, dict):
        raise HTTPException(400, "Invalid body")
    run_id = request.headers.get("X-Webhook-Id") or envelope.get("run_id") or str(uuid.uuid4())
    try:
        await db.cron_runs.insert_one({"run_id": run_id, "created_at": now_utc()})
    except DuplicateKeyError:
        return {"accepted": True, "duplicate": True}
    background.add_task(run_aggregation, db)
    return {"accepted": True, "run_id": run_id}


@api.get("/")
async def root():
    return {"app": "Entity Ledger"}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ["CORS_ORIGINS"].split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.matches.create_index([("user_id", 1), ("timestamp", -1)])
    await db.matches.create_index("week_id")
    await db.matches.create_index("timestamp")
    await db.matches.create_index("match_id", unique=True)
    await db.global_aggregates.create_index([("week_id", 1), ("kind", 1)])
    await db.login_attempts.create_index("identifier")
    await db.pin_resets.create_index("expires_at", expireAfterSeconds=0)
    await db.cron_runs.create_index("run_id", unique=True)
    await db.cron_runs.create_index("created_at", expireAfterSeconds=7 * 86400)
    admin_email, admin_pin = os.environ["ADMIN_EMAIL"].lower(), os.environ["ADMIN_PIN"]
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({"user_id": str(uuid.uuid4()), "email": admin_email, "pin_hash": hash_pin(admin_pin),
                                   "role": "admin", "created_at": now_utc(), "total_matches": 0,
                                   "last_survivor_id": None})
    elif not verify_pin(admin_pin, existing["pin_hash"]) or existing.get("role") != "admin":
        await db.users.update_one({"email": admin_email}, {"$set": {"pin_hash": hash_pin(admin_pin), "role": "admin"}})
    await run_aggregation(db)


@app.on_event("shutdown")
async def shutdown():
    client.close()
