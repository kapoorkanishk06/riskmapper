"""Claude enrichment for the highest-risk files, with a deterministic fallback."""

from __future__ import annotations

import json
import os
import re
from typing import Any

from anthropic import Anthropic

from git_analysis import MinedFile

AI_MODEL = "claude-sonnet-4-6"
MAX_CONTENT_CHARS = 20_000


def _fallback(file: MinedFile) -> dict[str, str]:
    owner = file.primary_owner
    adjacent = file.adjacent_authors[0] if file.adjacent_authors else "another contributor"
    return {
        "plain_english_summary": (
            f"{file.filename} is a source file currently associated most strongly with {owner}. "
            f"It has a risk score of {file.final_risk_score:.1f} and is referenced by {len(file.imports)} other analyzed files."
        ),
        "impact_narrative": (
            f"If {owner} left tomorrow, ownership of {file.filename} would be unclear. "
            f"The file's {len(file.imports)} known dependents could be harder to safely change until another contributor reviews it."
        ),
        "explainer_doc_draft": (
            f"# {file.filename}\n\n"
            f"**Primary owner:** {owner}\n\n"
            f"**Purpose:** Add a short description of this module's responsibility here.\n\n"
            f"**Getting started:** Read the imports and callers listed in the risk report, then pair with {adjacent} "
            "to verify the main control flow and operational edge cases."
        ),
        "pairing_suggestion": (
            f"Pair {owner} with {adjacent}; they are the best available secondary contributor in this repository "
            "for transferring context before the file becomes orphaned."
        ),
    }


def _parse_json(text: str) -> dict[str, Any] | None:
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        value = json.loads(cleaned)
        return value if isinstance(value, dict) else None
    except json.JSONDecodeError:
        start, end = cleaned.find("{"), cleaned.rfind("}")
        if start >= 0 and end > start:
            try:
                value = json.loads(cleaned[start : end + 1])
                return value if isinstance(value, dict) else None
            except json.JSONDecodeError:
                return None
    return None


def explain_file(file: MinedFile) -> dict[str, str]:
    fallback = _fallback(file)
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return fallback
    prompt = {
        "filename": file.filename,
        "file_content": file.content[:MAX_CONTENT_CHARS],
        "imports": file.imports,
        "ownership": {
            "primary_owner": file.primary_owner,
            "concentration_score": file.concentration_score,
            "days_since_last_commit": file.days_since_last_commit,
            "risk_score": file.final_risk_score,
            "contributors": file.contributors,
        },
        "adjacent_contributors": file.adjacent_authors[:30],
    }
    instruction = f"""
You are helping a development team transfer repository knowledge. Analyze the supplied source-file context.
Return ONLY valid JSON with exactly these string keys:
plain_english_summary, impact_narrative, explainer_doc_draft, pairing_suggestion.
The summary must be 2-3 sentences. The impact narrative must explain what could break if the primary owner leaves,
using the known imports/dependents without inventing details. The explainer should be concise markdown onboarding
documentation. The pairing suggestion must name one person from adjacent_contributors when possible and justify it.
If the evidence is limited, say so rather than making up behavior.

Context:
{json.dumps(prompt, ensure_ascii=False)}
"""
    try:
        client = Anthropic(api_key=api_key)
        response = client.messages.create(
            model=AI_MODEL,
            max_tokens=1800,
            temperature=0.2,
            messages=[{"role": "user", "content": instruction}],
        )
        text = "".join(getattr(block, "text", "") for block in response.content)
        parsed = _parse_json(text)
        if parsed:
            return {key: str(parsed.get(key) or fallback[key]) for key in fallback}
    except Exception:
        # AI is an enrichment layer; the deterministic analysis remains useful when the
        # key is absent, the model is unavailable, or a response cannot be parsed.
        pass
    return fallback