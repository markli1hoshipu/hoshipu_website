"""
AE 欠条报表 updater — merge QFF daily-IOU files into the master AE ledger.

The AE ledger has one sheet per month (YYYYMM). Within a sheet, debtor rows are
grouped by 负责人 in column A; columns B=欠款人, C=余额(formula), D=当月发生额(formula),
E=上月余额, and F,G,H… are one column PER DAY (row 1 holds the Excel serial date).
A merge writes each QFF IOU's 初始金额 into [debtor row, that day's column]; the
formulas recompute balances/totals on open.

Design decisions (confirmed with user):
  * amount written = 初始金额 (QFF col B)
  * debtor matched by space-normalized name within the QFF group (A == "QFF")
  * unmatched debtors -> a new row auto-inserted into the QFF group
  * duplicate imports prevented via a hidden "_QFF_imported" log of 欠单号

Row insertion is done with a formula-remap so the ledger's hardcoded summary
ranges (grand total, group subtotals, row 541/542) stay correct — openpyxl does
NOT adjust formulas on insert, so we rewrite every same-sheet reference ourselves.
"""
import io
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import openpyxl
from copy import copy

LOG_SHEET = "_QFF_imported"
_EXCEL_MAX_ROW = 1048576
_EPOCH = datetime(1899, 12, 30)


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def load_xlsx(data: bytes):
    """Load an .xlsx even if it is misnamed .xls (bypass extension check)."""
    return openpyxl.load_workbook(io.BytesIO(data))


def _norm(name: Any) -> str:
    """Normalize a debtor name for matching: drop all whitespace."""
    return re.sub(r"\s+", "", str(name)) if name is not None else ""


def _serial_to_yymmdd(serial: Any) -> Optional[str]:
    if not isinstance(serial, (int, float)):
        return None
    try:
        return (_EPOCH + timedelta(days=float(serial))).strftime("%y%m%d")
    except (ValueError, OverflowError):
        return None


def _date_to_ym_sheet(yymmdd: str) -> str:
    """'260710' -> '202607'."""
    return "20" + yymmdd[0:2] + yymmdd[2:4]


# --------------------------------------------------------------------------- #
# QFF reading
# --------------------------------------------------------------------------- #
def read_qff(data: bytes) -> List[Dict[str, Any]]:
    """Parse one QFF workbook into a list of IOU dicts."""
    wb = load_xlsx(data)
    ws = wb.worksheets[0]
    rows: List[Dict[str, Any]] = []
    for r in range(2, ws.max_row + 1):
        date = ws.cell(r, 1).value          # A 日期 (YYMMDD)
        initial = ws.cell(r, 2).value       # B 初始金额
        remaining = ws.cell(r, 3).value     # C 剩余金额
        debtor = ws.cell(r, 4).value        # D 欠款人
        owner = ws.cell(r, 5).value         # E 负责人
        iou_no = ws.cell(r, 6).value        # F 欠单号
        remark = ws.cell(r, 7).value        # G 备注
        if iou_no is None or debtor is None:
            continue
        date_s = str(date).strip() if date is not None else ""
        # normalize a YYMMDD-ish date (drop any trailing .0 from float cells)
        if date_s.endswith(".0"):
            date_s = date_s[:-2]
        rows.append({
            "iou_no": str(iou_no).strip(),
            "date": date_s,
            "initial": initial,
            "remaining": remaining,
            "debtor": str(debtor).strip(),
            "owner": str(owner).strip() if owner else "QFF",
            "remark": remark,
        })
    return rows


# --------------------------------------------------------------------------- #
# formula remap (for row insertion)
# --------------------------------------------------------------------------- #
_REF_RE = re.compile(r"(?<![A-Za-z0-9_!$'])(\$?)([A-Z]{1,3})(\$?)(\d+)")


def _remap_formula(formula: str, remap) -> str:
    """Rewrite same-sheet A1 row references using remap(old_row)->new_row.
    References that are sheet-qualified (preceded by '!') are skipped by the
    negative lookbehind, so cross-sheet refs are left untouched."""
    def repl(m: "re.Match") -> str:
        col_abs, col, row_abs, row = m.groups()
        new_row = remap(int(row))
        return f"{col_abs}{col}{row_abs}{new_row}"

    return _REF_RE.sub(repl, formula)


def _insert_rows_with_remap(ws, insert_before: int, count: int) -> None:
    """Insert `count` rows before original row `insert_before`, then fix every
    formula in the sheet so hardcoded ranges/refs stay correct."""
    ws.insert_rows(insert_before, count)

    def remap(row: int) -> int:
        if row >= insert_before:
            return min(row + count, _EXCEL_MAX_ROW)
        return row

    for row in ws.iter_rows():
        for cell in row:
            v = cell.value
            if isinstance(v, str) and v.startswith("="):
                cell.value = _remap_formula(v, remap)


# --------------------------------------------------------------------------- #
# ledger introspection
# --------------------------------------------------------------------------- #
def _build_day_columns(ws) -> Dict[str, int]:
    """Map YYMMDD -> column index, from the serial dates in row 1."""
    cols: Dict[str, int] = {}
    for c in range(1, ws.max_column + 1):
        yymmdd = _serial_to_yymmdd(ws.cell(1, c).value)
        if yymmdd:
            cols.setdefault(yymmdd, c)
    return cols


def _build_debtor_rows(ws, owner: str) -> Dict[str, int]:
    """Map normalized debtor name -> row, for rows whose 负责人 (col A) == owner."""
    out: Dict[str, int] = {}
    for r in range(3, ws.max_row + 1):
        if ws.cell(r, 1).value == owner:
            name = ws.cell(r, 2).value
            if name is not None:
                out.setdefault(_norm(name), r)
    return out


def _last_group_row(ws, owner: str) -> Optional[int]:
    """The last row whose 负责人 (col A) == owner — new debtors go just after it.
    Returns None if the owner group is not present in the sheet."""
    last: Optional[int] = None
    for r in range(3, ws.max_row + 1):
        if ws.cell(r, 1).value == owner:
            last = r
    return last


def _copy_row_style(ws, src_row: int, dst_row: int, max_col: int) -> None:
    for c in range(1, max_col + 1):
        s = ws.cell(src_row, c)
        d = ws.cell(dst_row, c)
        if s.has_style:
            d._style = copy(s._style)


# --------------------------------------------------------------------------- #
# hidden import log
# --------------------------------------------------------------------------- #
_LOG_HEADERS = ["欠单号", "日期", "欠款人", "初始金额", "月份sheet", "状态", "备注"]


def _ensure_log_sheet(wb):
    if LOG_SHEET in wb.sheetnames:
        ws = wb[LOG_SHEET]
    else:
        ws = wb.create_sheet(LOG_SHEET)
        ws.append(_LOG_HEADERS)
    ws.sheet_state = "hidden"
    return ws


def _existing_iou_numbers(wb) -> set:
    if LOG_SHEET not in wb.sheetnames:
        return set()
    ws = wb[LOG_SHEET]
    seen = set()
    for r in range(2, ws.max_row + 1):
        v = ws.cell(r, 1).value
        if v is not None:
            seen.add(str(v).strip())
    return seen


# --------------------------------------------------------------------------- #
# merge
# --------------------------------------------------------------------------- #
def merge(ae_bytes: bytes, qff_files: List[bytes]) -> Tuple[bytes, Dict[str, Any]]:
    """Merge QFF files into the AE ledger. Returns (updated_xlsx_bytes, report)."""
    wb = load_xlsx(ae_bytes)
    seen = _existing_iou_numbers(wb)

    # gather all IOUs across the uploaded QFF files
    ious: List[Dict[str, Any]] = []
    for data in qff_files:
        ious.extend(read_qff(data))

    report: Dict[str, Any] = {
        "total": len(ious),
        "added": 0,
        "aggregated": 0,
        "new_debtors": 0,
        "duplicates": 0,
        "skipped": [],          # {iou_no, reason}
        "new_debtor_names": [],
        "log_rows": [],         # rows to append to the hidden log
    }

    # Placement is driven by the 负责人 code in QFF column E: each IOU merges into
    # its own owner's group (QFF / WW / LYC / …) in the target month sheet.
    #
    # plan[sheet] = {
    #   "day_cols": {yymmdd: col},
    #   "owner_rows": {owner: {normname: row}},          # existing debtor rows per group
    #   "existing": [(row, col, amount, iou)],
    #   "new": {owner: {normname: {"name","cells","ious"}}},
    # }
    plan: Dict[str, Dict[str, Any]] = {}

    for iou in ious:
        no = iou["iou_no"]
        if no in seen:
            report["duplicates"] += 1
            report["skipped"].append({"iou_no": no, "reason": "duplicate"})
            continue
        seen.add(no)

        yymmdd = iou["date"]
        if not re.fullmatch(r"\d{6}", yymmdd or ""):
            report["skipped"].append({"iou_no": no, "reason": f"bad date {iou['date']!r}"})
            continue
        sheet_name = _date_to_ym_sheet(yymmdd)
        if sheet_name not in wb.sheetnames:
            report["skipped"].append({"iou_no": no, "reason": f"no sheet {sheet_name}"})
            continue

        ws = wb[sheet_name]
        if sheet_name not in plan:
            plan[sheet_name] = {
                "day_cols": _build_day_columns(ws),
                "owner_rows": {},
                "existing": [],
                "new": {},
            }
        st = plan[sheet_name]

        col = st["day_cols"].get(yymmdd)
        if not col:
            report["skipped"].append({"iou_no": no, "reason": f"no day column {yymmdd} in {sheet_name}"})
            continue

        owner = iou["owner"] or "QFF"
        if owner not in st["owner_rows"]:
            st["owner_rows"][owner] = _build_debtor_rows(ws, owner)
        # the owner group must exist in the sheet to place a row
        if _last_group_row(ws, owner) is None:
            report["skipped"].append({"iou_no": no, "reason": f"no group {owner} in {sheet_name}"})
            continue

        amount = iou["initial"] or 0
        nk = _norm(iou["debtor"])
        row = st["owner_rows"][owner].get(nk)
        if row:
            st["existing"].append((row, col, amount, iou))
        else:
            grp = st["new"].setdefault(owner, {})
            nd = grp.setdefault(nk, {"name": iou["debtor"], "cells": {}, "ious": []})
            nd["cells"][col] = nd["cells"].get(col, 0) + amount
            nd["ious"].append(iou)

    # apply per sheet
    for sheet_name, st in plan.items():
        ws = wb[sheet_name]
        max_col = ws.max_column

        # 1) existing debtors: add amount into the day cell (aggregate).
        #    Done before any row insertion; the values move with their cells.
        for row, col, amount, iou in st["existing"]:
            cur = ws.cell(row, col).value
            base = cur if isinstance(cur, (int, float)) else 0
            ws.cell(row, col).value = base + amount
            report["added"] += 1
            if base:
                report["aggregated"] += 1
            report["log_rows"].append([iou["iou_no"], iou["date"], iou["debtor"],
                                       amount, sheet_name, "added", iou.get("remark")])

        # 2) new debtors: insert rows at the end of each owner's group.
        #    Process groups bottom-up (largest insertion row first) so earlier
        #    insertions don't shift the still-original insertion points above.
        batches = []
        for owner, grp in st["new"].items():
            insert_at = _last_group_row(ws, owner)  # original coords
            if insert_at is None:
                continue
            batches.append((insert_at + 1, owner, list(grp.values())))
        batches.sort(key=lambda b: b[0], reverse=True)

        for insert_at, owner, new_list in batches:
            tpl = next((r for r in _build_debtor_rows(ws, owner).values() if r < insert_at), 3)
            _insert_rows_with_remap(ws, insert_at, len(new_list))
            for i, nd in enumerate(new_list):
                r = insert_at + i
                _copy_row_style(ws, tpl, r, max_col)
                ws.cell(r, 1).value = owner
                ws.cell(r, 2).value = nd["name"]
                ws.cell(r, 3).value = f"=SUM(E{r}:ZC{r})"   # 余额
                ws.cell(r, 4).value = f"=SUM(F{r}:ZE{r})"   # 当月发生额
                for col, amt in nd["cells"].items():
                    ws.cell(r, col).value = amt
                report["new_debtors"] += 1
                report["new_debtor_names"].append(f"{owner}: {nd['name']}")
                for iou in nd["ious"]:
                    report["added"] += 1
                    report["log_rows"].append([iou["iou_no"], iou["date"], iou["debtor"],
                                               iou["initial"] or 0, sheet_name,
                                               "new-row", iou.get("remark")])

    # append to the hidden import log
    log = _ensure_log_sheet(wb)
    for row in report["log_rows"]:
        log.append(row)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    # keep the report JSON-friendly
    report.pop("log_rows", None)
    return buf.getvalue(), report
