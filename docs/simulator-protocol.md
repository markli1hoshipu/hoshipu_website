# EmbodyBench — Simulator-Side Protocol Spec

Audience: **anyone implementing the worker** (Phase 3) or debugging what the simulator actually sends. This is the canonical "what does our side put on the wire" reference.

For the user-facing version of the same protocol, see [`policy-server-guide.md`](./policy-server-guide.md). This document covers the same endpoints but from the simulator's perspective: serialization, error handling, retry semantics, and the conventions our `embodybench_remote` policy module must follow.

---

## High-level flow

For each claimed job (= one invocation of `eval_policy.py` with `EVAL_TEST_NUM=N`):

```
WORKER                                     USER'S POLICY SERVER
  │                                                 │
  │── Subprocess: bash eval.sh task seed gpu       │
  │    └─ eval_policy.py boots SAPIEN              │
  │       └─ imports policy.embodybench_remote     │
  │          └─ get_model(usr_args)                │
  │             └─ Open httpx.Client (keep-alive)  │
  │                                                 │
  │   For each of N episodes:                      │
  │                                                 │
  │   reset_model(model):                          │
  │   ────  POST /episode/init  {task, seed, …} ──▶│
  │   ◀──── { episode_id }                         │
  │                                                 │
  │   For each sim step (up to max_steps):         │
  │     obs = TASK_ENV.get_obs()                   │
  │     eval(TASK_ENV, model, obs):                │
  │       ── POST /episode/{eid}/step {step,obs} ─▶│
  │       ◀── { action }                            │
  │     TASK_ENV.take_action(action)               │
  │     if TASK_ENV.eval_success: break            │
  │                                                 │
  │   At episode end (success / fail / timeout):   │
  │   ──── POST /episode/{eid}/finalize {…} ──────▶│
  │   ◀──── { ok }                                  │
  │                                                 │
  │   Worker writes episode result JSONL line      │
  │                                                 │
  │  (after all N episodes, worker process exits)  │
  │                                                 │
  │── Worker reads JSONL, POSTs /jobs/{id}/episodes batch to backend
  │── PATCH /jobs/{id}/state succeeded/failed
```

---

## Observation serialization

The simulator (`TASK_ENV.get_obs()`) returns a Python dict with numpy arrays. The `embodybench_remote.eval()` function must convert this to JSON-serializable form before POSTing.

### Camera images — three RGB streams

| Wire field | Source in `TASK_ENV.get_obs()` |
|---|---|
| `image_countertop` | The head/main camera output (in RoboTwin: `obs["observation"]["head_camera"]["rgb"]`; in RoboPRO: same key). The "countertop" naming on the wire is to make the role explicit to the model implementer — it's an overhead scene view. |
| `image_wrist_left` | `obs["observation"]["left_camera"]["rgb"]` (RoboTwin) / `obs["observation"]["wrist_left"]["rgb"]` (RoboPRO — confirm in `embodybench_remote` implementation against actual env code) |
| `image_wrist_right` | `obs["observation"]["right_camera"]["rgb"]` / `obs["observation"]["wrist_right"]["rgb"]` |

**Serialization** (each image):
1. Numpy array: `(H, W, 3)` uint8, RGB order.
2. Convert to PIL: `Image.fromarray(arr, "RGB")`.
3. Encode JPEG quality 85 to a `BytesIO`: `pil_img.save(buf, format="JPEG", quality=85)`.
4. Base64 encode the bytes: `base64.b64encode(buf.getvalue()).decode("ascii")`.
5. Send as the string value of the field.

**Resolution**: whatever the benchmark's `task_config` renders at (commonly 320×240 for RoboTwin demo configs, 256×256 or 224×224 for higher-quality task configs). Do not resize — send native render resolution and let the user normalize on their side.

**Color order**: RGB. The simulator renders RGB natively; do **not** convert to BGR.

### Proprioception state — shape depends on the run's `action_space`

The run config's `action_space` field controls BOTH what `state` we send AND what we expect back as `action`. Per-arm layouts:

**For `action_space = "joint_abs_14"` (14 floats total):**

| Per-arm (7) | Source in `obs["agent"]["qpos"]` |
|---|---|
| joint_0..5 (radians, signed) | First 6 indices of the arm slice |
| gripper (0.0 closed, 1.0 open) | 7th index — usually a normalized opening fraction |

**For `action_space = "xvla_ee_rot6d_20"` (20 floats total):**

| Per-arm (10) | Source |
|---|---|
| pos_x, pos_y, pos_z (meters, world frame) | `obs["endpose"]["{left,right}_endpose"][:3]` |
| rot6d_0..5 (first 2 cols of rotation matrix, flattened) | Convert from quat `obs["endpose"]["{left,right}_endpose"][3:7]` via the formula in X-VLA's client.py:76-92 — `R.from_quat(q).as_matrix()[..., :, :2].reshape(...+(6,))` |
| gripper (X-VLA convention: `1 - 2*raw_gripper`) | `1 - 2 * obs["endpose"]["{left,right}_gripper"]` |

Source of truth: `/shared_work/behavior1k-xvla/X-VLA/evaluation/robotwin-2.0/client.py` lines 119–146. Mirror that code's exact transformations in `embodybench_remote.eval()` when the run is `xvla_ee_rot6d_20`.

Send as Python `list[float]` — JSON serializes natively, no numpy adapters needed.

### Instruction string

| Wire field | Source |
|---|---|
| `instruction` | `TASK_ENV.instruction` — set by `set_instruction()` in `eval_policy.py:300`. For tasks with language perturbations enabled, may be re-sampled per episode from the instruction bank. **Within an episode**, it doesn't change. |

Send as plain string.

### Step counter

| Wire field | Value |
|---|---|
| `step` | Worker-side step counter starting at 0. Increment by 1 on each successful response. |

---

## Episode lifecycle

### `/episode/init`

Called from `reset_model(model)` (which `eval_policy.py:332` invokes between episodes). Body:

```json
{
  "benchmark": "robopro",
  "task": "<task_name from env var>",
  "seed": <st_seed for THIS episode, from eval_policy.py:262 burn-in logic>,
  "max_steps": <TASK_ENV.step_lim>,
  "embodiment": "<aloha-agilex | dual-piper | etc, from args>",
  "instruction": "<TASK_ENV.instruction>",
  "action_space": "<joint_abs_14 | xvla_ee_rot6d_20, from run config>"
}
```

Headers:
- `Content-Type: application/json`
- `Authorization: Bearer <token>` if `EMBODYBENCH_API_AUTH` env has scheme=bearer

Timeout: **30 seconds**. Slow init is OK — user's server may need to allocate KV cache, vision tower, etc.

Response: `{ "episode_id": "<string>", "ttl_sec": <int optional> }`. Store `episode_id` on the model object; use it for all subsequent calls.

On non-200: raise an exception, which causes the current episode to be recorded as failed. The next episode tries `/init` again.

### `/episode/{episode_id}/step`

Called from `eval(TASK_ENV, model, observation)` at line 335 of `eval_policy.py`. Once per sim step. Body:

```json
{
  "step": <model.step_count>,
  "obs": {
    "image_countertop": "<base64 jpeg>",
    "image_wrist_left":  "<base64 jpeg>",
    "image_wrist_right": "<base64 jpeg>",
    "state": [<14 floats>],
    "instruction": "<unchanged from /init>"
  }
}
```

Timeout: **30 seconds** per call. A real-time-ish 30 Hz sim with a 100–300 ms model is the happy path; 30 s gives the user's server lots of slack for cold-start or batched-prefill behavior.

**Retry policy** (in `embodybench_remote.eval()`):
```python
for attempt in range(3):
    try:
        r = client.post(url, json=body, timeout=30.0)
        r.raise_for_status()
        return r.json()["action"]
    except (httpx.TimeoutException, httpx.HTTPStatusError) as e:
        if attempt == 2 or (isinstance(e, httpx.HTTPStatusError) and e.response.status_code in (400, 401, 404)):
            raise
        time.sleep(2 ** attempt)  # 1s, 2s, then give up
```

Hard-fail HTTP codes (no retry):
- `400` — bad request body (our bug, fix on our side)
- `401` — bad token (user's server config; episode fails, run continues)
- `404` — server doesn't know this `episode_id`; usually means the server restarted mid-episode. We finalize and start a fresh episode. The current episode is marked failed.

Response: `{ "action": [<N floats>] }` where N matches the run's `action_space`:

- **`joint_abs_14`** — 14 floats, layout `[left_qpos×6, left_grip, right_qpos×6, right_grip]`. Apply directly: `TASK_ENV.take_action(action)` (sim-native).
- **`xvla_ee_rot6d_20`** — 20 floats, layout `[left_xyz×3, left_rot6d×6, left_grip, right_xyz×3, right_rot6d×6, right_grip]`. The worker converts each arm's `(pos, rot6d, grip)` → `(pos, quat, grip_sign)` and calls `TASK_ENV.take_action(converted, action_type='ee')`. See X-VLA's client.py lines 231-250 for the exact rollout math:

  ```python
  # left arm
  left_quat = rotate6D_to_quat(action[3:9])            # 6D → quat
  left_grip = 1 - 2 * (action[9] > 0.7)                # threshold
  left_arm  = np.concatenate([action[:3], left_quat, [left_grip]])  # 8
  # right arm: identical, on action[10:20]
  rollout_action = np.concatenate([left_arm, right_arm])  # 16
  TASK_ENV.take_action(rollout_action, action_type='ee')
  ```

The 6D-to-quaternion converter is in X-VLA's client.py at lines 80-92; replicate it bit-for-bit in `embodybench_remote.eval()` so X-VLA-trained models hit identical numerics here vs in the upstream eval.

### `/episode/{episode_id}/finalize`

Called from the `__exit__` of the `HttpRemoteModel` context manager AND between episodes (the next `reset_model` call sends a finalize for the previous episode before starting init for the new one). Body:

```json
{
  "outcome": "complete" | "interrupted" | "timeout"
}
```

Where:
- `complete` — `TASK_ENV.eval_success` was True OR the episode hit `step_lim` naturally
- `interrupted` — an exception was raised mid-rollout (Ctrl-C, SAPIEN crash, etc.)
- `timeout` — we ran out of `max_steps` without success

Timeout: **5 seconds** — short, best-effort. We don't care if finalize succeeds; the user's server is responsible for its own TTL eviction if our finalize is lost.

We **do not retry** on finalize. If it fails, log and move on.

---

## Per-episode result file

`eval_policy.py` only writes aggregate success counts to disk. The worker needs per-episode outcomes to POST to `/jobs/{id}/episodes`. The `embodybench_remote` policy module is responsible for writing one JSONL line per episode to the file at `os.environ["EMBODYBENCH_RESULTS_PATH"]`.

**Format** (one line per finished episode):
```json
{
  "seed_used": 100007,
  "episode_idx": 2,
  "outcome": {
    "success": true,
    "n_steps": 187,
    "fail_reason": null,
    "reward": null
  },
  "trajectory_pointer": null
}
```

`trajectory_pointer` is `null` in Phase 3; Phase 4 will add R2 upload of the full trajectory JSONL and populate this with the S3 URL.

The worker tails this file every ~5 seconds and POSTs new lines as a batch via `POST /api/bench/jobs/{job_id}/episodes`.

---

## Camera details — RoboTwin vs RoboPRO

The wire names (`image_countertop`, `image_wrist_left`, `image_wrist_right`) are **consistent across benchmarks** so the user's model code doesn't care which benchmark we're running. But the underlying source key in `TASK_ENV.get_obs()` may differ. The `embodybench_remote` module owns this mapping:

| Wire name | RoboTwin source key (verify against code) | RoboPRO source key |
|---|---|---|
| `image_countertop` | `head_camera.rgb` | `head_camera.rgb` |
| `image_wrist_left` | `left_camera.rgb` | `wrist_left.rgb` (TBC) |
| `image_wrist_right` | `right_camera.rgb` | `wrist_right.rgb` (TBC) |

**Action item for whoever writes `embodybench_remote`**: dump `TASK_ENV.get_obs()` once for each benchmark, log the actual key names, and lock them in `embodybench_remote/__init__.py`. The user-facing `policy-server-guide.md` is the contract; the source mapping is our internal plumbing.

---

## Environment variables the policy module reads

These are set by `worker/src/bench_worker/job_runner.py` before `subprocess.Popen`-ing `eval.sh`:

| Var | Set to | Read by |
|---|---|---|
| `EMBODYBENCH_API_ENDPOINT` | user's URL from the run config | `policy.embodybench_remote.get_model` |
| `EMBODYBENCH_API_AUTH` | JSON string `{"scheme": "bearer"|"none", "token": "<plaintext>"}` (decrypted from Fernet inside the worker) | same |
| `EMBODYBENCH_RESULTS_PATH` | `/tmp/embodybench/{job_id}/episodes.jsonl` | `embodybench_remote.eval` to append per-episode result lines |
| `EMBODYBENCH_TASK_NAME` | task name from claimed job | sent in `/episode/init` body |
| `EMBODYBENCH_BENCHMARK` | `robotwin` or `robopro` | sent in `/episode/init` body |
| `EMBODYBENCH_MAX_STEPS` | `TASK_ENV.step_lim` | sent in `/episode/init` body |
| `EMBODYBENCH_ACTION_SPACE` | `"joint_abs_14"` \| `"xvla_ee_rot6d_20"` | sent in `/episode/init` body; controls both the `state` layout in `/step` requests and how the worker parses the `action` in `/step` responses |
| `EVAL_TEST_NUM` | n_episodes for this job (read by `eval_policy.py` directly) | `eval_policy.py:182` |

---

## Conventions the worker must enforce

These aren't part of the HTTP spec; they're rules the worker code enforces to keep the protocol behaving:

1. **Same `episode_id` for the lifetime of one episode.** Generated by the user's server in `/init`, used unchanged in every `/step` and `/finalize` until the next `reset_model`.

2. **`step` field is monotonic non-decreasing within an episode.** Resets to 0 on `reset_model`. Increments by 1 on each successful `/step` response. On retry (after a timeout), send the SAME `step` value — let the user's server idempotency layer handle it.

3. **Single concurrent episode per worker.** `max_concurrent=1` in v1. We don't run two episodes in parallel from one worker — the policy server may not be thread-safe at the `episode_id` level.

4. **`/finalize` is best-effort.** We don't retry, we don't fail-the-job if it errors. If the user's server is down, our episode-end recording still happens via the JSONL → backend path.

5. **Cookies, sessions, etc. — none of them.** Pure stateless HTTPS POST. `episode_id` in the URL is the only session key.

---

## Failure recovery (what the worker does)

| Failure | Worker behavior |
|---|---|
| `/init` returns non-200 | Record episode as failed (`fail_reason: "init_failed"`), increment episode_idx, continue to next episode in the chunk. |
| `/step` times out | Retry 2× with backoff. If still failing, record episode as failed, call `/finalize` (best-effort), continue. |
| `/step` returns 401 | Hard-fail the whole JOB with `failure_reason="user_endpoint_401"` — NOT retriable, user's auth is wrong and won't fix itself. |
| `/step` returns 404 (unknown `episode_id`) | Treat as "server restarted". Call `/init` again, log a warning, record current episode as failed, start fresh. |
| `/step` returns 400 | Hard-fail the job with `failure_reason="bad_action_shape"` — protocol violation, not retriable. |
| SAPIEN crashes mid-episode | Try/except around `eval(…)` in our policy module. Mark the JOB failed with `failure_reason="sim_crash"` — RETRIABLE, backend re-queues. |
| CUDA OOM (subprocess) | Worker catches the subprocess return code, marks the JOB failed with `failure_reason="oom"` — RETRIABLE. |
| Worker process killed (Slurm preempt, OOM-killer, etc.) | Heartbeat lapses → backend reclaims the job after 5 min → re-queues. attempt_count++. |

## Job-level failure-reason taxonomy

The worker MUST set `failure_reason` to one of these exact strings when reporting `PATCH /jobs/{id}/state state="failed"`. The backend's retry logic regexes against the **retriable** set:

**Retriable** (backend auto re-queues if `attempt_count < 3`):
- `oom` — CUDA out of memory in sim subprocess
- `sim_crash` — SAPIEN / eval_policy.py died unexpectedly
- `gpu_unavailable` — nvidia-smi unreachable / driver hiccup
- `network_error` — lost connectivity to user's `/step` endpoint
- `timeout` — user's `/step` timed out 3× with backoff
- `claim_lost` — heartbeat lapsed while running; reclaim re-queued us

**Permanent** (job stays failed on first occurrence):
- `user_endpoint_401` — user's server rejects our token
- `user_endpoint_500` — user's server crashed; their bug
- `bad_action_shape` — user returned wrong-length action
- `bad_config` — job config is invalid (shouldn't happen post-validation)
- `unknown_task` — task name doesn't exist in installed benchmark
- `internal_error` — our worker code raised an unexpected exception

The retriable set is defined in `backend/src/routers/bench_router.py` as
`_RETRIABLE_FAILURE_REASONS`. Worker code should keep these strings in sync.

---

## Open questions to lock in during `embodybench_remote` implementation

These need the actual benchmark source code in front of you to answer:

1. **What's the actual obs-dict key for the wrist cameras in RoboPRO?** (RoboTwin uses `left_camera`/`right_camera`; RoboPRO may have renamed to `wrist_left`/`wrist_right`.)
2. **Are the gripper indices [6, 13] or [7, 13]?** Depends on whether grippers are bundled into the 7-tuple or appended separately to a 12-DOF arm-joints array.
3. **What's the natural action shape?** 14 if grippers fold into the 7-tuple; 16 if grippers are 2-DOF (open/close fingers separately). Pin to 14 on the wire and remap server-side if the embodiment differs.
4. **Image dimensions per `task_config`** — log the resolution from `TASK_ENV.head_camera_h/w` and document the common values.

Answer these from `/shared_work/jack/RoboTwin/envs/*.py` and `/shared_work/RoboPRO/benchmark/bench_envs/**/*.py` during Stage A of the Phase 3 onboarding.
