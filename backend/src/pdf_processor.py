import pdfplumber
import re
import os
from typing import Optional, Dict, Any


def extract_info(text: str) -> Dict[str, Optional[str]]:
    name_match = re.search(r"旅客姓名.*?\n\s*([\S]+)", text)
    from_match = re.search(r"自[：:]\s*(\S+\s+\S+)", text)
    to_match = re.search(r"至[：:]\s*(\S+\s+\S+)", text)
    amount_match = re.search(r"合计.*?\n.*?(\d+\.\d{2})\s*$", text, re.MULTILINE)
    buyer_match = re.search(r"购买方名称：(\S+)", text)
    invoice_match = re.search(r"发票号码[：:]\s*(\d+)", text)
    issue_date_match = re.search(r"填开日期[：:]\s*([0-9]{4}[年/-][0-9]{1,2}[月/-][0-9]{1,2}[日]?)", text)

    return {
        "name": name_match.group(1) if name_match else None,
        "origin": from_match.group(1).replace(' ', '') if from_match else None,
        "destination": to_match.group(1).replace(' ', '') if to_match else None,
        "amount": amount_match.group(1) if amount_match else None,
        "buyer": buyer_match.group(1) if buyer_match else None,
        "invoice_number": invoice_match.group(1) if invoice_match else None,
        "issue_date": issue_date_match.group(1) if issue_date_match else None,
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


def render_filename_template(template: str, values: Dict[str, Optional[str]], original_filename: str) -> str:
    all_values = {
        "buyer": values.get("buyer") or "",
        "name": values.get("name") or "",
        "origin": values.get("origin") or "",
        "destination": values.get("destination") or "",
        "amount": values.get("amount") or "",
        "invoice_number": values.get("invoice_number") or "",
        "issue_date": values.get("issue_date") or "",
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


def validate_required_fields(values: Dict[str, Optional[str]], template: str) -> Dict[str, Any]:
    required_fields = extract_placeholders(template)
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
    "仅发票号": "{invoice_number}.pdf",
}
