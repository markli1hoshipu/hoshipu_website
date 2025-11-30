import os
import re
import string
from typing import Dict, Set, Mapping
import yaml


INVALID_CHARS_PATTERN = re.compile(r'[\\/:*?"<>|]')


def safe_filename(value: str) -> str:
    if value is None:
        return ""
    # Replace invalid characters and collapse whitespace
    cleaned = INVALID_CHARS_PATTERN.sub("_", value)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


class SafeDict(dict):
    def __missing__(self, key):
        # Missing keys render as empty strings
        return ""


def extract_placeholders(template: str) -> Set[str]:
    formatter = string.Formatter()
    fields: Set[str] = set()
    for literal_text, field_name, format_spec, conversion in formatter.parse(template):
        if field_name:
            fields.add(field_name)
    return fields


def render_filename_template(template: str, values: Dict[str, str]) -> str:
    # Sanitize values first
    sanitized = {k: safe_filename(str(v)) if v is not None else "" for k, v in values.items()}
    result = template.format_map(SafeDict(sanitized))
    result = safe_filename(result)
    # Ensure .pdf extension
    if not result.lower().endswith(".pdf"):
        result = f"{result}.pdf"
    return result


DEFAULT_TEMPLATES: Dict[str, str] = {
    "行程信息": "{buyer} {name} {origin}-{destination} {amount}.pdf",
    "仅发票号": "{invoice_number}.pdf",
}


def load_templates(path: str | None) -> Dict[str, str]:
    if not path or not os.path.exists(path):
        return DEFAULT_TEMPLATES.copy()
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
        # Expect a mapping of name -> template
        if isinstance(data, Mapping):
            # Coerce non-str values to str
            return {str(k): str(v) for k, v in dict(data).items()}
    except Exception:
        pass
    return DEFAULT_TEMPLATES.copy()


def save_templates(path: str, templates: Dict[str, str]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        yaml.safe_dump(templates, f, allow_unicode=True, sort_keys=True)


