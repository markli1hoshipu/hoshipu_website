"""
Setup-validation subagent — wraps Claude Haiku to sanity-check a user's
benchmark run config before we burn GPU on it.

Public entry point:
  validate_config(bench_module, config_dict) -> {ok, warnings, suggestions}

If ANTHROPIC_API_KEY is unset, returns ok=True with an empty list so dev
environments work without it. If the API call fails (timeout, rate limit,
bad key), returns ok=True + a single warning explaining why — we never
block a submission on validator availability.
"""

from __future__ import annotations

import json
import os
import re
from typing import Any


SYSTEM_PROMPT = """\
You are a strict but helpful validator for an embodied-AI benchmark platform.

Given a user's selected benchmark + run config, return STRICT JSON with this exact shape:

{
  "ok": true|false,
  "warnings": [{"level": "info"|"warn"|"error", "message": "string"}],
  "suggestions": [{"change": "string", "reason": "string"}]
}

Rules:
- `ok` is false ONLY if there is a clear error (e.g., task name not in the catalog).
- `warnings.level=error` items also imply `ok=false`.
- Catch: typos in task names, episodes_per_task that looks excessive (>50) or
  trivial (<5), chunk_size larger than episodes_per_task, empty task list,
  obvious config oddities.
- Be concise. Max 3 warnings + 3 suggestions. No prose outside the JSON.
- If everything looks fine: return ok=true with empty arrays.

Output JSON only. No markdown fences. No explanation."""


def _build_user_prompt(bench_mod, cfg: dict) -> str:
    catalog_lines = [
        f"  - {t['name']} (category={t.get('category','general')})"
        for t in bench_mod.TASKS
    ]
    catalog = "\n".join(catalog_lines)
    return (
        f"Benchmark: {bench_mod.DISPLAY_NAME} (id={bench_mod.NAME}, v{bench_mod.VERSION})\n"
        f"Recommended episodes/task: {bench_mod.RECOMMENDED_EPISODES} "
        f"(hard cap {bench_mod.MAX_EPISODES_PER_TASK})\n\n"
        f"Known tasks ({len(bench_mod.TASKS)}):\n{catalog}\n\n"
        f"User's submitted config:\n{json.dumps(cfg, indent=2)}\n"
    )


_JSON_FENCE_RE = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.DOTALL)


def _parse_response(text: str) -> dict:
    """Try to parse the model's text as JSON. Tolerate stray prose / fences."""
    text = text.strip()
    if not text:
        raise ValueError("empty response")
    m = _JSON_FENCE_RE.search(text)
    if m:
        text = m.group(1)
    return json.loads(text)


def validate_config(bench_mod, cfg: dict) -> dict:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return {"ok": True, "warnings": [], "suggestions": [], "skipped_reason": "ANTHROPIC_API_KEY not set"}

    try:
        from anthropic import Anthropic
    except ImportError:
        return {"ok": True, "warnings": [], "suggestions": [],
                "skipped_reason": "anthropic package not installed"}

    client = Anthropic(api_key=api_key)
    try:
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",  # cheap + fast for validation
            max_tokens=512,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": _build_user_prompt(bench_mod, cfg)}],
        )
    except Exception as e:
        return {
            "ok": True,
            "warnings": [{"level": "info", "message": f"validator unavailable: {type(e).__name__}"}],
            "suggestions": [],
        }

    text_block = next((b.text for b in resp.content if getattr(b, "type", "") == "text"), "")
    try:
        parsed = _parse_response(text_block)
    except Exception:
        return {
            "ok": True,
            "warnings": [{"level": "info", "message": "validator returned non-JSON; skipping"}],
            "suggestions": [],
        }

    # Normalize shape.
    return {
        "ok": bool(parsed.get("ok", True)),
        "warnings": list(parsed.get("warnings", [])) [:3],
        "suggestions": list(parsed.get("suggestions", []))[:3],
    }
