import pdfplumber
import re
import os
from typing import Optional, Dict, Any


def extract_info(text: str) -> Dict[str, Optional[str]]:
    name_match = re.search(r"旅客姓名.*?\n\s*([\S]+)", text)
    # A place is "城市 机场" — two Chinese tokens (2nd optional). Restricting to
    # Chinese excludes the fare row's leading "至: CNY 1412.84" and empty "至:".
    place = r"[一-鿿]+(?:[ \t]+[一-鿿]+)?"
    # [ \t]* (not \s*) so an empty "至:" line can't reach onto the next line and
    # grab "票价 燃油附加费" from the fare header.
    from_matches = re.findall(rf"自[：:][ \t]*({place})", text)
    to_matches = re.findall(rf"至[：:][ \t]*({place})", text)
    amount_match = re.search(r"合计.*?\n.*?(\d+\.\d{2})\s*$", text, re.MULTILINE)
    buyer_match = re.search(r"购买方名称[：:](\S+)", text)
    invoice_match = re.search(r"发票号码[：:]\s*(\d+)", text)
    issue_date_match = re.search(r"填开日期[：:]\s*([0-9]{4}[年/-][0-9]{1,2}[月/-][0-9]{1,2}[日]?)", text)
    insurance_match = re.search(r"保险费[：:]\s*(\d+\.\d{2})", text)

    origin = from_matches[0].replace(' ', '') if from_matches else None
    dests = [m.replace(' ', '') for m in to_matches]
    # destination is the full chain of legs, so a multi-segment / round trip like
    # 大连周水子-银川河东-大连周水子 renders correctly via "{origin}-{destination}".
    destination = "-".join(dests) if dests else None
    legs = ([origin] if origin else []) + dests
    route = "-".join(legs) if legs else None

    return {
        "name": name_match.group(1) if name_match else None,
        "origin": origin,
        "destination": destination,
        "route": route,
        "amount": amount_match.group(1) if amount_match else None,
        "buyer": buyer_match.group(1) if buyer_match else None,
        "invoice_number": invoice_match.group(1) if invoice_match else None,
        "issue_date": issue_date_match.group(1) if issue_date_match else None,
        "insurance": insurance_match.group(1) if insurance_match else None,
    }


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    import io
    full_text = ""
    
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                full_text += page_text + "\n"
    
    return full_text


def safe_filename(s: str) -> str:
    return re.sub(r'[\\/:*?"<>|]', "_", s)


def _insurance_suffix(insurance: Optional[str]) -> str:
    """Return '+<amount>' when insurance is a non-zero value, else ''."""
    if insurance in (None, ""):
        return ""
    try:
        if float(insurance) == 0:
            return ""
    except ValueError:
        return ""
    return f"+{insurance}"


def render_filename_template(template: str, values: Dict[str, Optional[str]], original_filename: str) -> str:
    all_values = {
        "buyer": values.get("buyer") or "",
        "name": values.get("name") or "",
        "origin": values.get("origin") or "",
        "destination": values.get("destination") or "",
        "route": values.get("route") or "",
        "amount": values.get("amount") or "",
        "invoice_number": values.get("invoice_number") or "",
        "issue_date": values.get("issue_date") or "",
        "insurance": values.get("insurance") or "",
        "insurance_suffix": _insurance_suffix(values.get("insurance")),
        "original_filename": os.path.splitext(original_filename)[0],
    }
    
    result = template
    for key, value in all_values.items():
        placeholder = "{" + key + "}"
        result = result.replace(placeholder, safe_filename(value))
    
    if not result.lower().endswith('.pdf'):
        result += '.pdf'
    
    return result


def extract_placeholders(template: str) -> list[str]:
    import re
    matches = re.findall(r'\{(\w+)\}', template)
    return matches


# Derived placeholders that are legitimately empty (e.g. a zero insurance fee)
# and therefore must never mark a file as "incomplete".
DERIVED_OPTIONAL_FIELDS = {"insurance_suffix"}


def validate_required_fields(values: Dict[str, Optional[str]], template: str) -> Dict[str, Any]:
    required_fields = [f for f in extract_placeholders(template) if f not in DERIVED_OPTIONAL_FIELDS]
    missing = []

    for field in required_fields:
        value = values.get(field)
        if not value or value == "":
            missing.append(field)
    
    return {
        "valid": len(missing) == 0,
        "missing": missing
    }


DEFAULT_TEMPLATES = {
    "行程信息": "{buyer} {name} {origin}-{destination} {amount}.pdf",
    "pxb": "{buyer} {name} {origin}-{destination} {amount}{insurance_suffix}.pdf",
    "仅发票号": "{invoice_number}.pdf",
}
