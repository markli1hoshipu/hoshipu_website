"""
Passport → GDS DOCS command generator.

The OCR provider is selectable via OCR_PROVIDER ("aliyun" | "openai";
auto-detects Aliyun when its keys are set). Aliyun 国际护照识别 (RecognizePassport)
returns the MRZ, which we parse deterministically; OpenAI vision is the fallback.
Python then formats an SR DOCS command line per passport, e.g.:

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
import base64
from typing import List, Optional, Dict, Tuple

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


def _ocr_provider() -> str:
    """OCR_PROVIDER env wins; else auto-detect (Aliyun if its keys are set, else OpenAI)."""
    p = os.getenv("OCR_PROVIDER", "").strip().lower()
    if p:
        return p
    if os.getenv("ALIBABA_CLOUD_ACCESS_KEY_ID") and os.getenv("ALIBABA_CLOUD_ACCESS_KEY_SECRET"):
        return "aliyun"
    return "openai"


def _extract(image_bytes: bytes, mime: str) -> Tuple[Dict[str, str], List[str]]:
    """Dispatch to the configured OCR provider; return (fields, warnings)."""
    if _ocr_provider() == "aliyun":
        return _extract_via_aliyun(image_bytes)
    fields = _extract_fields(image_bytes, mime)  # OpenAI vision
    return fields, _sanity_warnings(fields)


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
            data = _prepare_image(data)  # downscale/recompress before OCR
            fields, warnings = _extract(data, "image/jpeg")
            if not (fields.get("passport_number") or "").strip():
                lines.append(DocsLine(pax=pax, command="", fields=fields,
                                      error="未能识别到有效护照信息，请检查图片"))
            else:
                command = _build_command(airline, fields, pax)
                lines.append(DocsLine(pax=pax, command=command, fields=fields, warnings=warnings or None))
        except HTTPException:
            raise  # config error — surface immediately
        except Exception as e:  # per-image failure shouldn't abort the batch
            lines.append(DocsLine(pax=pax, command="", fields={}, error=str(e)))
        pax += 1

    return DocsResponse(success=True, lines=lines)
