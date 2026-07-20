"""
Router for the AE 欠条报表 updater — merge QFF daily-IOU files into the AE ledger.
"""
import base64
import logging
from typing import List

from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse

from ae_qff_processor import merge

router = APIRouter(prefix="/api/ae-qff", tags=["AE-QFF Merge"])
logger = logging.getLogger(__name__)

# Upload size guards. The AE ledger drives memory: openpyxl expands an .xlsx
# ~95x in RAM (a 6.4 MB / 38-sheet file needs ~1 GB), so an oversized ledger
# OOM-kills the worker. Cap it hard and reject BEFORE openpyxl ever loads it.
# QFF daily-IOU files are tiny (~9 KB), so a small cap just catches mis-uploads.
AE_MAX_BYTES = 512 * 1024    # 512 KB
QFF_MAX_BYTES = 256 * 1024   # 256 KB per 欠条 file


@router.post("/merge")
async def merge_endpoint(
    ae_file: UploadFile = File(...),
    qff_files: List[UploadFile] = File(...),
):
    """Merge the uploaded QFF files into the uploaded AE ledger.

    Returns the merge report plus the updated workbook (base64) so the client
    can show the summary and offer a download from a single request.
    """
    # Size guards first — reject oversized uploads before loading into openpyxl,
    # so a big ledger can't OOM the worker (returns a clear error instead).
    ae_bytes = await ae_file.read()
    if len(ae_bytes) > AE_MAX_BYTES:
        return JSONResponse(status_code=413, content={
            "error": f"AE 主表过大（{len(ae_bytes) // 1024} KB），上限 {AE_MAX_BYTES // 1024} KB。"
                     f"请先把历史月份归档，让在用报表变小后再上传。"})
    qff_bytes: List[bytes] = []
    for f in qff_files:
        b = await f.read()
        if len(b) > QFF_MAX_BYTES:
            return JSONResponse(status_code=413, content={
                "error": f"欠条文件「{f.filename or ''}」过大（{len(b) // 1024} KB），"
                         f"单个上限 {QFF_MAX_BYTES // 1024} KB。"})
        qff_bytes.append(b)

    try:
        out_bytes, report = merge(ae_bytes, qff_bytes)
    except Exception as e:  # noqa: BLE001
        logger.exception("AE-QFF merge failed")
        return JSONResponse(status_code=400, content={"error": str(e)})

    name = ae_file.filename or "AE.xlsx"
    if name.lower().endswith(".xlsx"):
        name = name[:-5]
    download_name = f"{name}-updated.xlsx"

    return {
        "report": report,
        "filename": download_name,
        "file_base64": base64.b64encode(out_bytes).decode("ascii"),
    }
