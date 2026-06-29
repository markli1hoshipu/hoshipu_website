# EmbodyBench — Policy Server Implementation Guide

Audience: **you, the model developer**, who wants their bimanual VLA policy evaluated on RoboTwin / RoboPRO via EmbodyBench.

You expose **three HTTPS endpoints**. Our simulator, running on a GPU node we control, calls them once per simulation step. Your endpoints handle the per-episode lifecycle and return actions; we drive the sim and score success.

---

## TL;DR

1. Spin up an HTTPS server with 3 endpoints (`/episode/init`, `/episode/{id}/step`, `/episode/{id}/finalize`).
2. Keep per-episode model state in your process (KV cache, history, hidden state — whatever your model needs) keyed by `episode_id`.
3. Submit a run at `https://hoshipuwebsite.vercel.app/projects/benchmarks/new` with your endpoint URL.
4. Watch the run page update as our workers call your endpoints and record results.

A bare-minimum FastAPI server is **40 lines** — see the example at the bottom.

---

## The three endpoints

All requests are `POST` with JSON bodies and JSON responses. If your platform requires auth, accept a bearer token via `Authorization: Bearer <token>` and configure it when you create the run on the platform UI; we store it encrypted at rest (Fernet) and send it back to you with every step.

### 1. `POST /episode/init` — start a new episode

We call this **once per rollout**, at the start. You should allocate any per-episode model state and return an `episode_id` you'll use to look it up later.

**Request body:**
```json
{
  "benchmark": "robopro",                 // "robotwin" | "robopro"
  "task": "put_mouse_on_pad",             // task name from our catalog
  "seed": 100007,                          // the seed the simulator will use; deterministic per (task, seed)
  "max_steps": 200,                        // sim will not call /step more than this
  "embodiment": "aloha-agilex",            // robot embodiment for this benchmark
  "instruction": "place the mouse on the mousepad"  // natural-language goal
}
```

**Response body:**
```json
{
  "episode_id": "ep_a1b2c3d4e5",  // your ID format; we don't parse it
  "ttl_sec": 3600                  // optional: how long you'll keep the state alive if no /step arrives. defaults to 1h on our side.
}
```

**On your side:**
```python
state_cache[episode_id] = MyModel.create_initial_state(task, seed, instruction)
return {"episode_id": episode_id}
```

### 2. `POST /episode/{episode_id}/step` — per-simulation-step inference

We call this **every simulation step**, typically 30–60 times per second under ideal latency. Each call sends the current observation; you return the action vector your policy wants to apply.

**Request body:**
```json
{
  "step": 47,                              // 0-indexed step within this episode
  "obs": {
    "image_countertop":   "<base64 JPEG>", // overhead / scene camera
    "image_wrist_left":   "<base64 JPEG>", // left arm wrist-mounted camera
    "image_wrist_right":  "<base64 JPEG>", // right arm wrist-mounted camera
    "state": [0.12, -0.31, ...],           // 14-dim joint positions (7 per arm), Aloha-Agilex convention
    "instruction": "place the mouse on the mousepad"  // unchanged across steps within an episode
  }
}
```

Images are base64-encoded JPEG (typical dims 320×240 or 224×224 — see *Image format details* below). Decode them with any standard library (`PIL.Image.open(io.BytesIO(base64.b64decode(s)))` in Python).

**Response body:**
```json
{
  "action": [0.10, -0.30, ..., 0.85]  // 14-dim joint position command (7 per arm); LAST element of each 7-tuple is gripper (0.0–1.0)
}
```

**On your side:**
```python
state = state_cache[episode_id]
action, new_state = MyModel.step(state, request.obs)
state_cache[episode_id] = new_state
return {"action": action.tolist()}
```

### 3. `POST /episode/{episode_id}/finalize` — release per-episode state

We call this **once at the end** of the episode (whether it succeeded, failed, or timed out). Use it to free the memory you allocated in `/init`.

**Request body:**
```json
{
  "outcome": "complete"  // "complete" | "interrupted" | "timeout"
}
```

**Response body:**
```json
{ "ok": true }
```

**On your side:**
```python
state_cache.pop(episode_id, None)
return {"ok": True}
```

If `/finalize` doesn't arrive within `ttl_sec` of the last `/step`, evict the state yourself — otherwise long-running runs leak memory if a worker dies mid-episode.

---

## Observation details

### Cameras (3 RGB streams)

| Stream | What it sees |
|---|---|
| `image_countertop` | Fixed overhead / side view of the workspace. Best for global scene understanding. |
| `image_wrist_left` | Mounted on the left arm's end-effector. Best for left-hand grasp / contact view. |
| `image_wrist_right` | Mounted on the right arm's end-effector. Best for right-hand grasp / contact view. |

All three are sent in the **same world frame at the same simulation step** — they're synchronized.

### Image format details

- **Encoding**: JPEG, quality 85
- **Color**: RGB (3 channels), 8 bits per channel
- **Resolution**: usually 320×240 (RoboTwin default) or 224×224 (some RoboPRO configs). The exact size is set by the benchmark's `task_config` and may vary per run. **Don't hardcode dimensions** — read them from the image after decoding.
- **Wire format**: base64-encoded string of the JPEG bytes. No `data:` URI prefix.

### State vector (14-dim float)

Convention: Aloha-Agilex bimanual. First 7 floats = left arm, next 7 = right arm. Within each 7-tuple:

| Index | Meaning |
|---|---|
| 0–5 | 6-DOF joint positions (radians) |
| 6 | Gripper opening, 0.0 (fully closed) to 1.0 (fully open) |

So `state[0:7]` is the left arm, `state[7:14]` is the right arm.

### Instruction string

The natural-language goal for this episode. **It does not change across steps within an episode** — sent every step for stateless-friendly server implementations. RoboPRO can apply language perturbations, so the instruction may differ between episodes of the same task.

---

## Action vector (14-dim float, returned by `/step`)

Same shape as `state`: 14 floats, 7 per arm, last of each 7-tuple is gripper.

| Index | Convention |
|---|---|
| 0–5, 7–12 | Target joint positions in radians. The sim uses PD control to track these. |
| 6, 13 | Gripper command, 0.0 = close, 1.0 = open. |

You may return either absolute joint positions (most common) or delta positions — but **the convention for this platform is absolute**, matching upstream RoboTwin/RoboPRO. Stick to absolute unless you know what you're doing.

### Action chunking (if your model does it)

If your model predicts a chunk of N actions per inference (common for diffusion policies, ACT, etc.), only return **the first action of the chunk** to `/step`. Cache the rest server-side and pop them off on subsequent `/step` calls without re-running inference. That's how you get away with a slow model at 30 Hz sim rate.

---

## State management — important gotchas

### 1. Memory will leak if you don't TTL

If our worker dies mid-episode, `/finalize` never arrives. Without a TTL eviction, `state_cache` grows forever.

```python
# Sketch
from time import time
EVICT_AFTER_SEC = 3600
last_seen: dict[str, float] = {}

# in /step, also update:
last_seen[episode_id] = time()

# in a background task every 5 min:
now = time()
for eid in list(last_seen):
    if now - last_seen[eid] > EVICT_AFTER_SEC:
        state_cache.pop(eid, None)
        last_seen.pop(eid, None)
```

### 2. Single replica OR sticky sessions

State is in-process. If you run two replicas behind a load balancer with naive round-robin, `/step` calls for the same `episode_id` may hit different replicas → state misses → broken.

Options:
- **Single replica** (simplest, what most people start with).
- **Sticky sessions** on your load balancer, keyed by `episode_id` from the URL path.
- **Externalize state** to Redis keyed by `episode_id` (slow if your model state is large, but works).

### 3. Idempotency on `/step`

A timed-out `/step` from our worker will retry up to 3× with exponential backoff. If your `/step` advances state (e.g., model history grows), make it **idempotent on `(episode_id, step)`** — return the same action you returned the first time for the same `step` value. Or accept that you may run an extra step here and there.

Simplest implementation:
```python
last_action_for_step: dict[tuple[str, int], list[float]] = {}

@app.post("/episode/{eid}/step")
def step(eid, req):
    key = (eid, req.step)
    if key in last_action_for_step:
        return {"action": last_action_for_step[key]}
    action = compute_action(...)
    last_action_for_step[key] = action
    return {"action": action}
```

---

## Performance expectations

- We send ~30–60 `/step` calls per episode-second of sim time. The sim is real-time-uncapped on our side — we just wait for your response.
- Keep your `/step` latency under **~500 ms p99** to keep episode wall-time reasonable. With 200 steps × 0.5 s = 100 s wall-clock per episode = ~30 min for 200-episode RoboPRO eval per worker.
- We retry timed-out `/step` calls up to 3× with backoff (1s, 2s, 4s). After that, the worker marks the episode failed and moves on.
- We close the HTTP connection only at `/finalize` (we keep-alive across steps). Your server should be ready to handle long-lived TCP sessions.

---

## Authentication

Configure auth when creating the run on the website wizard (Step 4 → "Auth"):

| Mode | What we send to your endpoints |
|---|---|
| **None** | No `Authorization` header. |
| **Bearer token** | `Authorization: Bearer <your_token>` on every request. Stored encrypted at rest with Fernet on our backend. |

Your server should reject requests without the expected token with HTTP 401. The worker treats 401 as a hard failure (no retry) and marks the job failed.

---

## Where to host

Any server with a public HTTPS URL we can reach from our worker nodes:

- **Modal** — easy GPU-backed serverless, native FastAPI support
- **Fly.io** — cheap globally-routed VMs
- **Render** — same place we host our backend; fine for CPU-only models
- **Your own GPU box behind ngrok/cloudflared** — works for quick local tests
- **A SLURM-allocated node exposed via SSH tunnel** — fragile but possible

Cold starts hurt: if your endpoint scales-to-zero, the first `/step` of every episode is the slow one. Pin at least 1 warm instance during a run.

---

## Minimum viable example (~40 lines)

```python
# pip install fastapi uvicorn pillow numpy

from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
import base64, io, uuid
from typing import Optional
import numpy as np
from PIL import Image

app = FastAPI()
state_cache: dict[str, dict] = {}

class InitReq(BaseModel):
    benchmark: str
    task: str
    seed: int
    max_steps: int
    embodiment: str
    instruction: str

class StepObs(BaseModel):
    image_countertop: str
    image_wrist_left: str
    image_wrist_right: str
    state: list[float]
    instruction: str

class StepReq(BaseModel):
    step: int
    obs: StepObs

class FinalizeReq(BaseModel):
    outcome: str

def decode_image(b64: str) -> np.ndarray:
    return np.array(Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB"))

@app.post("/episode/init")
def init(req: InitReq, authorization: Optional[str] = Header(None)):
    # if your run requires auth, verify `authorization` here
    eid = f"ep_{uuid.uuid4().hex[:12]}"
    state_cache[eid] = {"step_count": 0, "task": req.task, "seed": req.seed}
    return {"episode_id": eid, "ttl_sec": 3600}

@app.post("/episode/{eid}/step")
def step(eid: str, req: StepReq):
    if eid not in state_cache:
        raise HTTPException(404, "unknown episode_id")
    # decode obs (you'd actually run your model here)
    img = decode_image(req.obs.image_countertop)
    state = np.array(req.obs.state)
    # Replace this with your VLA forward pass:
    action = np.zeros(14, dtype=float)  # no-op action
    state_cache[eid]["step_count"] = req.step
    return {"action": action.tolist()}

@app.post("/episode/{eid}/finalize")
def finalize(eid: str, req: FinalizeReq):
    state_cache.pop(eid, None)
    return {"ok": True}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
```

Replace the `action = np.zeros(14)` line with your model's `forward(obs)` and you have a working policy server.

---

## Quick checklist before you submit a run

- [ ] All 3 endpoints respond 200 on a manual curl
- [ ] `/step` returns 14-dim action arrays (not 7, not 16 — exactly 14)
- [ ] Per-episode state TTL is implemented (you've tested it doesn't leak)
- [ ] Bearer auth (if configured) returns 401 on bad token
- [ ] HTTPS — we don't support plain HTTP from production runs
- [ ] At least one warm replica (no scale-to-zero during a run)
- [ ] You've tested with a `python -c` script that does init → 3 fake `/step` calls → finalize

When all of those pass, head to `https://hoshipuwebsite.vercel.app/projects/benchmarks/new`, paste your URL, pick a benchmark + tasks, submit. The run detail page polls and surfaces results live.

If you hit an error you can't reason about, the run detail page shows `failure_reason` per failed job — paste that to the operator and we'll diagnose together.
