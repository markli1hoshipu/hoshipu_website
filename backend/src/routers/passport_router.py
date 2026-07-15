"""
Passport → GDS DOCS command generator.

An OpenAI vision model reads the passport's Machine Readable Zone (MRZ) and
returns the document fields; Python then formats an SR DOCS command line per
passport, e.g.:

    DOCS KE HK1 P/IDN/E6090613/IDN/30NOV91/M/12FEB34/PONTO/GOOD AGUN/P1

Everything except the airline code, HK1 status, and the /P{n} passenger
reference comes from the passport. Light sanity checks flag fields that look
malformed so the operator knows which lines to double-check — always verify
before use.
"""

import os
import json
import base64
from typing import List, Optional, Dict

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Request
from pydantic import BaseModel

from rate_limiter import limiter

router = APIRouter(prefix="/api/passport", tags=["passport"])

MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

# Which OpenAI vision model to use (override via env without a code change).
# gpt-5-mini reads passport MRZ accurately in testing; gpt-4o-mini was not
# reliable enough (dropped digits, confused issue/expiry dates).
VISION_MODEL = os.getenv("OPENAI_VISION_MODEL", "gpt-5-mini")

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


def _extract_fields(image_bytes: bytes, mime: str) -> Dict[str, str]:
    """Call OpenAI vision to read the MRZ fields. Raises on config/parse errors."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(500, "护照识别服务未配置（OPENAI_API_KEY 未设置）")

    from openai import OpenAI  # imported lazily so the app boots without the package

    client = OpenAI(api_key=api_key)
    b64 = base64.b64encode(image_bytes).decode("ascii")
    if not (mime or "").startswith("image/"):
        mime = "image/jpeg"

    kwargs = dict(
        model=VISION_MODEL,
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
    if not (VISION_MODEL.startswith("gpt-5") or VISION_MODEL.startswith("o")):
        kwargs["temperature"] = 0

    resp = client.chat.completions.create(**kwargs)
    data = json.loads(resp.choices[0].message.content or "{}")
    return {k: ("" if v is None else str(v)) for k, v in data.items()}


@router.post("/docs", response_model=DocsResponse)
@limiter.limit("20/minute")
async def passport_to_docs(
    request: Request,
    airline: str = Form(...),
    start_pax: int = Form(1),
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

    lines: List[DocsLine] = []
    pax = start_pax
    for f in files:
        data = await f.read()
        if not data:
            lines.append(DocsLine(pax=pax, command="", fields={}, error="空文件"))
            pax += 1
            continue
        try:
            fields = _extract_fields(data, f.content_type or "image/jpeg")
            command = _build_command(airline, fields, pax)
            warnings = _sanity_warnings(fields)
            lines.append(DocsLine(pax=pax, command=command, fields=fields, warnings=warnings or None))
        except HTTPException:
            raise  # config error — surface immediately
        except Exception as e:  # per-image failure shouldn't abort the batch
            lines.append(DocsLine(pax=pax, command="", fields={}, error=str(e)))
        pax += 1

    return DocsResponse(success=True, lines=lines)
