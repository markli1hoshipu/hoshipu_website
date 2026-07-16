"""
Passport → GDS DOCS command generator.

Reads the passport MRZ with one of two providers (the caller picks; default
Aliyun):
  - Aliyun 国际护照识别 (RecognizePassport): parses the raw MRZ lines
    deterministically (fixed-position slicing + ICAO check digits), so it can't
    confuse the MRZ country-code prefix with the surname the way an LLM can.
  - OpenAI gpt-4.1-mini: vision transcription of the MRZ.
Every scan is logged (outputs only, no photo) and can be voted correct/incorrect
to track each provider's live accuracy. Python then formats an SR DOCS command
line per passport, e.g.:

    DOCS KE HK1 P/IDN/E6090613/IDN/30NOV91/M/12FEB34/PONTO/GOOD AGUN/P1

Everything except the airline code, HK1 status, and the /P{n} passenger
reference comes from the passport. Light sanity checks flag fields that look
malformed so the operator knows which lines to double-check — always verify
before use.
"""

import os
import io
import re
import json
import time
import uuid
import base64
from typing import List, Optional, Dict, Tuple

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Request
from pydantic import BaseModel

from rate_limiter import limiter

router = APIRouter(prefix="/api/passport", tags=["passport"])

MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

# Fixed production model: gpt-4.1-mini (accurate on passport MRZ, cheap, fast).
# Hardcoded on purpose so no env var can change it. (Aliyun remains available
# only through the gated ALLOW_OCR_OVERRIDE benchmark path — off in production.)
VISION_MODEL = "gpt-4.1-mini"

EXTRACT_PROMPT = """Read this passport's photo page and extract the traveler's document details \
FROM THE MACHINE READABLE ZONE (MRZ) — the two lines of monospaced characters (with '<' fillers) at \
the very bottom. The MRZ is the source of truth; ignore the printed fields above it if they differ.

Return ONLY this JSON object, all values as uppercase strings:
{
  "issuing_country": "3-letter issuing code (MRZ line 1, the 3 letters right after the first character; e.g. 'P<IDN' -> 'IDN')",
  "passport_number": "the document number at the start of MRZ line 2, without the trailing check digit and without any '<'",
  "nationality": "3-letter nationality code (MRZ line 2)",
  "birth_date": "date of birth as 6 digits YYMMDD — the FIRST date in MRZ line 2",
  "sex": "M, F, or X",
  "expiry_date": "expiry date as 6 digits YYMMDD — the SECOND date in MRZ line 2 (the one AFTER the sex character). This is the EXPIRY, NOT the issue date printed above the MRZ.",
  "surname": "MRZ line 1: the text AFTER the 3-letter country code and BEFORE the '<<'. Do NOT include the leading document letter or the 3-letter country code.",
  "given_names": "MRZ line 1: the text AFTER the '<<'; replace '<' separators with single spaces"
}

Read digit-by-digit and letter-by-letter. Carefully distinguish easily-confused characters: \
0/O, 1/I, 5/S, 8/B, 2/Z, and especially V/W. If a value is genuinely unreadable, use "". \
Output raw JSON only — no markdown, no commentary."""


class DocsLine(BaseModel):
    pax: int
    command: str
    fields: Dict[str, str]
    warnings: Optional[List[str]] = None
    error: Optional[str] = None
    log_id: Optional[int] = None  # audit-log row id, so the client can vote on it


class DocsResponse(BaseModel):
    success: bool
    lines: List[DocsLine]


def _mrz_date_to_docs(yymmdd: str) -> str:
    """YYMMDD -> DDMMMYY, e.g. '911130' -> '30NOV91'. '' if invalid."""
    digits = "".join(ch for ch in (yymmdd or "") if ch.isdigit())
    if len(digits) != 6:
        return ""
    yy, mm, dd = digits[0:2], digits[2:4], digits[4:6]
    month = int(mm)
    if not 1 <= month <= 12:
        return ""
    return f"{dd}{MONTHS[month - 1]}{yy}"


def _to_yymmdd(s: str) -> str:
    """Normalize a date string to YYMMDD. YYYYMMDD -> YYMMDD; passthrough YYMMDD; else ''."""
    digits = re.sub(r"\D", "", str(s or ""))
    if len(digits) == 8:
        return digits[2:]
    if len(digits) == 6:
        return digits
    return ""


# ---- MRZ (TD3) parsing + ICAO check digits (used for the Aliyun MRZ lines) ----

def _char_value(c: str) -> int:
    if c.isdigit():
        return int(c)
    if "A" <= c <= "Z":
        return ord(c) - 55  # A=10 .. Z=35
    return 0  # '<' and anything else


def _check_digit(s: str) -> int:
    weights = [7, 3, 1]
    return sum(_char_value(ch) * weights[i % 3] for i, ch in enumerate(s)) % 10


def _parse_td3(line1: str, line2: str) -> Tuple[Dict[str, str], List[str]]:
    """Parse the two TD3 MRZ lines into fields; return (fields, warnings)."""
    def norm(s: str) -> str:
        s = (s or "").upper().replace(" ", "")
        return (s + "<" * 44)[:44]

    l1, l2 = norm(line1), norm(line2)
    surname_raw, _, given_raw = l1[5:44].partition("<<")

    fields = {
        "doc_type": l1[0].replace("<", "") or "P",
        "issuing_country": l1[2:5].replace("<", ""),
        "passport_number": l2[0:9].replace("<", ""),
        "nationality": l2[10:13].replace("<", ""),
        "birth_date": l2[13:19],
        "sex": l2[20].replace("<", ""),
        "expiry_date": l2[21:27],
        "surname": surname_raw.replace("<", " ").strip(),
        "given_names": given_raw.replace("<", " ").strip(),
    }

    warnings: List[str] = []
    if _check_digit(l2[0:9]) != (int(l2[9]) if l2[9].isdigit() else -1):
        warnings.append("护照号校验位不符，请核对护照号")
    if _check_digit(l2[13:19]) != (int(l2[19]) if l2[19].isdigit() else -1):
        warnings.append("出生日期校验位不符，请核对出生日期")
    if _check_digit(l2[21:27]) != (int(l2[27]) if l2[27].isdigit() else -1):
        warnings.append("到期日期校验位不符，请核对到期日期")
    return fields, warnings


def _sanity_warnings(fields: Dict[str, str]) -> List[str]:
    """Cheap validity checks that flag clearly-malformed extractions."""
    warnings: List[str] = []
    if not (fields.get("passport_number") or "").strip():
        warnings.append("未识别到护照号，请核对")
    ic = (fields.get("issuing_country") or "").strip()
    if len(ic) != 3 or not ic.isalpha():
        warnings.append("签发国代码异常，请核对")
    nat = (fields.get("nationality") or "").strip()
    if len(nat) != 3 or not nat.isalpha():
        warnings.append("国籍代码异常，请核对")
    if not _mrz_date_to_docs(fields.get("birth_date", "")):
        warnings.append("出生日期无法解析，请核对")
    if not _mrz_date_to_docs(fields.get("expiry_date", "")):
        warnings.append("到期日期无法解析，请核对")
    if (fields.get("sex") or "").upper() not in ("M", "F", "X"):
        warnings.append("性别异常，请核对")
    return warnings


def _build_command(airline: str, fields: Dict[str, str], pax: int) -> str:
    segment = "/".join([
        (fields.get("doc_type") or "P").upper(),
        (fields.get("issuing_country", "") or "").upper(),
        (fields.get("passport_number", "") or "").upper(),
        (fields.get("nationality", "") or "").upper(),
        _mrz_date_to_docs(fields.get("birth_date", "")),
        (fields.get("sex", "") or "").upper(),
        _mrz_date_to_docs(fields.get("expiry_date", "")),
        (fields.get("surname", "") or "").upper().strip(),
        (fields.get("given_names", "") or "").upper().strip(),
        f"P{pax}",
    ])
    return f"DOCS {airline.upper()} HK1 {segment}"


def _extract_fields(image_bytes: bytes, mime: str, model: Optional[str] = None) -> Dict[str, str]:
    """Call OpenAI vision to read the MRZ fields. Raises on config/parse errors."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(500, "护照识别服务未配置（OPENAI_API_KEY 未设置）")

    model = model or VISION_MODEL
    from openai import OpenAI  # imported lazily so the app boots without the package

    client = OpenAI(api_key=api_key)
    b64 = base64.b64encode(image_bytes).decode("ascii")
    if not (mime or "").startswith("image/"):
        mime = "image/jpeg"

    kwargs = dict(
        model=model,
        response_format={"type": "json_object"},
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": EXTRACT_PROMPT},
                {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
            ],
        }],
    )
    # Reasoning models (gpt-5*, o-series) only accept the default temperature.
    if not (model.startswith("gpt-5") or model.startswith("o")):
        kwargs["temperature"] = 0

    resp = client.chat.completions.create(**kwargs)
    data = json.loads(resp.choices[0].message.content or "{}")
    return {k: ("" if v is None else str(v)) for k, v in data.items()}


def _prepare_image(image_bytes: bytes) -> bytes:
    """Downscale/recompress to keep uploads small & fast (helps Aliyun upload
    reliability and OpenAI latency/cost). Falls back to the original on error."""
    try:
        from PIL import Image, ImageOps

        img = Image.open(io.BytesIO(image_bytes))
        img = ImageOps.exif_transpose(img)  # honor camera orientation
        if img.mode != "RGB":
            img = img.convert("RGB")
        max_side = 1600
        w, h = img.size
        if max(w, h) > max_side:
            scale = max_side / float(max(w, h))
            img = img.resize((int(w * scale), int(h * scale)))
        out = io.BytesIO()
        img.save(out, format="JPEG", quality=85, optimize=True)
        return out.getvalue()
    except Exception:
        return image_bytes


def _extract_via_aliyun(image_bytes: bytes) -> Tuple[Dict[str, str], List[str]]:
    """Call Aliyun RecognizePassport (国际护照识别); parse its MRZ deterministically."""
    ak = os.getenv("ALIBABA_CLOUD_ACCESS_KEY_ID")
    sk = os.getenv("ALIBABA_CLOUD_ACCESS_KEY_SECRET")
    if not (ak and sk):
        raise HTTPException(500, "阿里云 OCR 未配置（ALIBABA_CLOUD_ACCESS_KEY_ID / SECRET 未设置）")

    # Imported lazily so the app boots without the Aliyun SDK installed.
    from alibabacloud_ocr_api20210707.client import Client
    from alibabacloud_ocr_api20210707 import models as ocr_models
    from alibabacloud_tea_openapi import models as open_api_models
    from alibabacloud_tea_util import models as util_models

    config = open_api_models.Config(access_key_id=ak, access_key_secret=sk)
    config.endpoint = os.getenv("ALIBABA_OCR_ENDPOINT", "ocr-api.cn-hangzhou.aliyuncs.com")
    client = Client(config)

    req = ocr_models.RecognizePassportRequest(body=io.BytesIO(image_bytes))
    runtime = util_models.RuntimeOptions()
    runtime.connect_timeout = 10000  # ms
    runtime.read_timeout = 30000     # ms
    runtime.autoretry = True
    runtime.max_attempts = 2
    resp = client.recognize_passport_with_options(req, runtime)

    outer = json.loads(resp.body.data or "{}")
    d = outer.get("data", outer)  # fields may be nested under "data" or top-level

    l1 = str(d.get("mrzLine1") or "")
    l2 = str(d.get("mrzLine2") or "")
    if l1 and l2:
        fields, warnings = _parse_td3(l1, l2)
        # Backfill from Aliyun's structured fields if the MRZ was blank in spots.
        fields["surname"] = fields.get("surname") or str(d.get("surname") or "").upper().strip()
        fields["given_names"] = fields.get("given_names") or str(d.get("givenName") or "").upper().strip()
        fields["passport_number"] = fields.get("passport_number") or str(d.get("passportNumber") or "").upper()
        return fields, warnings

    # No MRZ returned — fall back to Aliyun's structured fields.
    nationality = str(d.get("nationality") or "").upper()
    fields = {
        "doc_type": "P",
        "issuing_country": nationality,  # best-effort without MRZ
        "passport_number": str(d.get("passportNumber") or "").upper(),
        "nationality": nationality,
        "birth_date": _to_yymmdd(d.get("birthDateYmd") or d.get("birthDate") or ""),
        "sex": str(d.get("sex") or "").upper()[:1],
        "expiry_date": _to_yymmdd(d.get("validToDate") or ""),
        "surname": str(d.get("surname") or "").upper().strip(),
        "given_names": str(d.get("givenName") or "").upper().strip(),
    }
    return fields, _sanity_warnings(fields)


def _extract(image_bytes: bytes, mime: str, provider: Optional[str] = None,
             model: Optional[str] = None) -> Tuple[Dict[str, str], List[str]]:
    """Production always uses Aliyun 国际护照识别 (deterministic MRZ parsing).
    OpenAI gpt-4.1-mini runs only when explicitly requested via the gated
    benchmark override (provider="openai")."""
    if provider == "openai":
        fields = _extract_fields(image_bytes, mime, model=model)  # OpenAI gpt-4.1-mini
        return fields, _sanity_warnings(fields)
    return _extract_via_aliyun(image_bytes)


def _client_ip(request: Request) -> str:
    """Real client IP behind Render's proxy (X-Forwarded-For), else socket peer."""
    xff = request.headers.get("x-forwarded-for", "")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else ""


def _log_passport_scan(request_id: str, client_ip: str, user_agent: str, airline: str,
                       provider: str, filename: str, line: DocsLine,
                       duration_ms: int) -> Optional[int]:
    """Best-effort audit log — one row per processed image. Stores ONLY outputs
    (command/fields/warnings/error) plus request metadata; the photo is not kept.
    Returns the new row id (so the client can vote on it) or None on failure.
    Never raises into the request path: a logging failure must not break OCR."""
    try:
        from database import get_db_connection  # lazy: keep module import light
        from psycopg2.extras import Json

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO passport_docs_log
                (request_id, client_ip, user_agent, airline, pax, provider,
                 filename, command, fields, warnings, error, duration_ms)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING id
            """,
            (
                request_id, client_ip, user_agent, airline, line.pax, provider,
                filename, line.command or None,
                Json(line.fields or {}),
                Json(line.warnings) if line.warnings else None,
                line.error, duration_ms,
            ),
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return new_id
    except Exception as e:  # noqa: BLE001 — audit logging is best-effort
        print(f"[passport] audit log failed: {e}")
        return None


@router.post("/docs", response_model=DocsResponse)
@limiter.limit("20/minute")
async def passport_to_docs(
    request: Request,
    airline: str = Form(...),
    start_pax: int = Form(1),
    provider: str = Form("aliyun"),  # "aliyun" (default) or "openai" — user's choice
    files: List[UploadFile] = File(...),
):
    """Generate one DOCS command line per uploaded passport image."""
    airline = (airline or "").strip()
    if not airline:
        raise HTTPException(400, "航空公司代码必填")
    if not files:
        raise HTTPException(400, "请至少上传一张护照照片")
    if len(files) > 20:
        raise HTTPException(400, "一次最多处理 20 张护照")
    if start_pax < 1:
        start_pax = 1

    # Provider is user-selectable but whitelisted to the two supported backends.
    effective_provider = (provider or "").strip().lower()
    if effective_provider not in ("aliyun", "openai"):
        effective_provider = "aliyun"

    # Request-level audit metadata (one request_id links all images in this upload).
    request_id = uuid.uuid4().hex
    client_ip = _client_ip(request)
    user_agent = request.headers.get("user-agent", "")

    lines: List[DocsLine] = []
    pax = start_pax
    for f in files:
        filename = f.filename or ""
        raw = await f.read()
        prepped: Optional[bytes] = None
        t0 = time.monotonic()
        if not raw:
            line = DocsLine(pax=pax, command="", fields={}, error="空文件")
            line.log_id = _log_passport_scan(request_id, client_ip, user_agent, airline,
                                             effective_provider, filename, line, 0)
            lines.append(line)
            pax += 1
            continue
        try:
            prepped = _prepare_image(raw)  # downscale/recompress before OCR
            fields, warnings = _extract(prepped, "image/jpeg", provider=effective_provider)
            if not (fields.get("passport_number") or "").strip():
                line = DocsLine(pax=pax, command="", fields=fields,
                                error="未能识别到有效护照信息，请检查图片")
            else:
                command = _build_command(airline, fields, pax)
                line = DocsLine(pax=pax, command=command, fields=fields, warnings=warnings or None)
        except HTTPException:
            raise  # config error — surface immediately
        except Exception as e:  # per-image failure shouldn't abort the batch
            line = DocsLine(pax=pax, command="", fields={}, error=str(e))
        duration_ms = int((time.monotonic() - t0) * 1000)
        line.log_id = _log_passport_scan(request_id, client_ip, user_agent, airline,
                                         effective_provider, filename, line, duration_ms)
        lines.append(line)
        pax += 1

    return DocsResponse(success=True, lines=lines)


class VoteRequest(BaseModel):
    log_id: int
    correct: bool


class VoteResponse(BaseModel):
    success: bool


@router.post("/vote", response_model=VoteResponse)
@limiter.limit("60/minute")
async def vote_scan(request: Request, payload: VoteRequest):
    """Record whether a scan's extracted info was correct — a reflection signal
    used to track each provider's live accuracy."""
    try:
        from database import get_db_connection
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE passport_docs_log SET vote = %s, voted_at = now() WHERE id = %s",
            (1 if payload.correct else 0, payload.log_id),
        )
        updated = cur.rowcount
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:  # noqa: BLE001
        raise HTTPException(500, f"记录投票失败: {e}")
    if not updated:
        raise HTTPException(404, "未找到该识别记录")
    return VoteResponse(success=True)


class ProviderAccuracy(BaseModel):
    votes: int
    correct: int
    accuracy: Optional[float] = None  # correct/votes, or None if no votes yet


class AccuracyResponse(BaseModel):
    aliyun: ProviderAccuracy
    openai: ProviderAccuracy


@router.get("/accuracy", response_model=AccuracyResponse)
@limiter.limit("60/minute")
async def accuracy(request: Request):
    """Per-provider accuracy from user votes: correct votes / total votes."""
    stats = {"aliyun": {"votes": 0, "correct": 0}, "openai": {"votes": 0, "correct": 0}}
    try:
        from database import get_db_connection
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT provider,
                   count(*) FILTER (WHERE vote IS NOT NULL) AS votes,
                   count(*) FILTER (WHERE vote = 1)         AS correct
            FROM passport_docs_log
            WHERE provider IN ('aliyun', 'openai')
            GROUP BY provider
            """
        )
        for provider, votes, correct in cur.fetchall():
            stats[provider] = {"votes": int(votes), "correct": int(correct)}
        cur.close()
        conn.close()
    except Exception as e:  # noqa: BLE001 — accuracy is a nice-to-have; degrade to zeros
        print(f"[passport] accuracy query failed: {e}")

    def pack(s: Dict[str, int]) -> ProviderAccuracy:
        v, c = s["votes"], s["correct"]
        return ProviderAccuracy(votes=v, correct=c, accuracy=(c / v) if v else None)

    return AccuracyResponse(aliyun=pack(stats["aliyun"]), openai=pack(stats["openai"]))
