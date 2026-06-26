"""
RoboTwin 2.0 — bimanual dual-arm SAPIEN manipulation benchmark.

50 tasks (no internal sub-categories), Aloha-style dual arm by default.

Source of truth for this task list: /shared_work/jack/RoboTwin/envs/*.py
on the OLDLAB cluster as of 2026-06-26.
"""

NAME = "robotwin"
VERSION = "2.0"
DISPLAY_NAME = "RoboTwin 2.0"
DESCRIPTION = (
    "50 bimanual SAPIEN manipulation tasks (clutter, lighting, background, height, "
    "and language perturbations) for sim-to-real-friendly VLA evaluation."
)
REPO_URL = "https://github.com/RoboTwin-Platform/RoboTwin"
DEFAULT_TASK_CONFIG = "demo_randomized"
RECOMMENDED_EPISODES = 25
MAX_EPISODES_PER_TASK = 200

OBSERVATION_SCHEMA = {
    "image_left": "RGB image from left wrist camera, base64 JPEG, ~320x240",
    "image_right": "RGB image from right wrist camera, base64 JPEG, ~320x240",
    "image_head": "RGB image from head camera (optional, controlled by task config)",
    "state": "14-dim float vector: joint positions for both arms (7 per arm)",
    "task_description": "natural-language instruction string",
}

TASKS = [
    {"name": n, "category": "general"}
    for n in [
        "adjust_bottle",
        "beat_block_hammer",
        "blocks_ranking_rgb",
        "blocks_ranking_size",
        "click_alarmclock",
        "click_bell",
        "dump_bin_bigbin",
        "grab_roller",
        "handover_block",
        "handover_mic",
        "hanging_mug",
        "lift_pot",
        "move_can_pot",
        "move_pillbottle_pad",
        "move_playingcard_away",
        "move_stapler_pad",
        "open_laptop",
        "open_microwave",
        "pick_diverse_bottles",
        "pick_dual_bottles",
        "place_a2b_left",
        "place_a2b_right",
        "place_bread_basket",
        "place_bread_skillet",
        "place_burger_fries",
        "place_can_basket",
        "place_cans_plasticbox",
        "place_container_plate",
        "place_dual_shoes",
        "place_empty_cup",
        "place_fan",
        "place_mouse_pad",
        "place_object_basket",
        "place_object_scale",
        "place_object_stand",
        "place_phone_stand",
        "place_shoe",
        "press_stapler",
        "put_bottles_dustbin",
        "put_object_cabinet",
        "rotate_qrcode",
        "scan_object",
        "shake_bottle",
        "shake_bottle_horizontally",
        "stack_blocks_three",
        "stack_blocks_two",
        "stack_bowls_three",
        "stack_bowls_two",
        "stamp_seal",
        "turn_switch",
    ]
]
