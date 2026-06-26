"""
Static catalogs for the benchmarks the platform supports.

Each module exposes:
  NAME: str                      — short identifier ("robotwin")
  VERSION: str                   — pinned upstream tag/branch we built workers against
  DISPLAY_NAME: str              — human-facing name
  DESCRIPTION: str               — one-paragraph blurb shown in the wizard
  REPO_URL: str                  — upstream source link
  RECOMMENDED_EPISODES: int      — sensible default in the submission wizard
  MAX_EPISODES_PER_TASK: int     — hard cap; validation rejects anything higher
  DEFAULT_TASK_CONFIG: str       — task_config YAML name passed to eval_policy.py
  OBSERVATION_SCHEMA: dict       — JSON shape the simulator sends to the user's
                                    /episode/{id}/step endpoint (for the client docs)
  TASKS: list[Task]              — every task name + any category metadata

These are imported by:
  - bench_router.GET /api/bench/benchmarks (returns to the frontend wizard)
  - bench_router.POST /api/bench/runs (validates user picks)
  - bench_validation.py (passes the task list into the Claude prompt)
"""

from . import robotwin, robopro

ALL = {
    robotwin.NAME: robotwin,
    robopro.NAME: robopro,
}


def to_dict(mod) -> dict:
    """Serializable form for GET /api/bench/benchmarks."""
    return {
        "name": mod.NAME,
        "version": mod.VERSION,
        "display_name": mod.DISPLAY_NAME,
        "description": mod.DESCRIPTION,
        "repo_url": mod.REPO_URL,
        "recommended_episodes": mod.RECOMMENDED_EPISODES,
        "max_episodes_per_task": mod.MAX_EPISODES_PER_TASK,
        "default_task_config": mod.DEFAULT_TASK_CONFIG,
        "observation_schema": mod.OBSERVATION_SCHEMA,
        "tasks": mod.TASKS,
    }


def all_as_list() -> list[dict]:
    return [to_dict(mod) for mod in ALL.values()]


def get(name: str):
    return ALL.get(name)
