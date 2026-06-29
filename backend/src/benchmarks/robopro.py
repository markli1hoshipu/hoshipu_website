"""
RoboPRO — bimanual robot manipulation extending RoboTwin with realistic scenes
and systematic perturbations across language/vision/objects. Aloha-Agilex
embodiment.

80 canonical tasks across 4 scene categories (Office, Study, KitchenL,
KitchenS), per /shared_work/RoboPRO/TASKS.md line 12 — "Total: 80 tasks
across 4 domains". Source files: /shared_work/RoboPRO/benchmark/bench_envs/
{office,study,kitchens,kitchenl}/*.py on the OLDLAB cluster.

(The `bench_envs/the_room/` directory contains 2 *_tr.py files — dev/test
scaffolding, NOT part of the canonical benchmark; intentionally excluded.)

Important: workers must export ROBOTWIN_BENCH_TASK=bench when invoking
eval_policy.py for RoboPRO — that flag tells the script to load tasks from
benchmark/bench_envs/<scene>/<task>.py instead of RoboTwin's vanilla envs/.
"""

NAME = "robopro"
VERSION = "1.0"
DISPLAY_NAME = "RoboPRO"
DESCRIPTION = (
    "Bimanual benchmark extending RoboTwin with realistic Office / Study / Kitchen "
    "scenes and Aloha-Agilex embodiment. Evaluates policy robustness across "
    "language / vision / object perturbations."
)
REPO_URL = "https://github.com/markli1hoshipu/RoboPRO"
DEFAULT_TASK_CONFIG = "demo_randomized"
RECOMMENDED_EPISODES = 20
MAX_EPISODES_PER_TASK = 100

OBSERVATION_SCHEMA = {
    "image_main": "RGB image from head/main camera, base64 JPEG",
    "image_wrist_left": "RGB image from left wrist camera, base64 JPEG",
    "image_wrist_right": "RGB image from right wrist camera, base64 JPEG",
    "state": "14-dim float vector: joint positions for both arms (Aloha-Agilex, 7 per arm)",
    "task_description": "natural-language instruction string",
}


def _tasks_for(scene: str, names: list[str]) -> list[dict]:
    return [{"name": n, "category": scene} for n in names]


TASKS: list[dict] = (
    _tasks_for(
        "office",
        [
            "close_drawer",
            "move_items_around",
            "open_drawer",
            "organize_table",
            "put_book_in_fileholder",
            "put_book_on_book",
            "put_milktea_next_to_laptop",
            "put_milktea_on_shelf",
            "put_mouse_next_to_stapler",
            "put_mouse_on_pad",
            "put_phone_next_to_cube",
            "put_phone_on_holder",
            "put_rubikscube_in_drawer",
            "put_rubikscube_next_to_milktea",
            "put_stapler_in_drawer",
            "put_stapler_next_to_mouse",
            "put_stapler_on_book",
            "set_up_table",
            "store_rubikscube_on_shelf",
            "store_stapler_in_drawer",
        ],
    )
    + _tasks_for(
        "study",
        [
            "empty_box",
            "move_book_onto_table",
            "move_cup",
            "move_cup_next_to_book",
            "move_cup_onto_table",
            "move_cup_put_pen_in_cup",
            "move_cups_into_box",
            "move_pen_to_box",
            "move_seal_cup_next_to_box",
            "move_seal_next_to_box",
            "move_seal_next_to_pencup",
            "move_seal_onto_book",
            "move_seal_onto_table",
            "put_cup_in_box",
            "put_cup_on_coaster",
            "put_cup_on_table",
            "put_glue_in_box",
            "put_pen_in_box",
            "put_pen_in_pencup",
            "put_seal_in_box",
        ],
    )
    + _tasks_for(
        "kitchens",
        [
            "chain_apple_bin_bowl_rack_spoon_sink_ks",
            "chain_apple_sink_plate_bread_board_ks",
            "chain_bowl_rack_apple_sink_ks",
            "chain_heat_hamburger_ks",
            "chain_serve_hamburger_ks",
            "close_microwave_ks",
            "drop_apple_in_bin_ks",
            "move_hamburger_onto_plate_ks",
            "pick_apple_from_bowl_ks",
            "pick_apple_from_sink_ks",
            "pick_fork_from_sink_ks",
            "pick_hamburger_from_microwave_ks",
            "place_bowl_in_dishrack_ks",
            "put_bowl_in_sink_ks",
            "put_bread_on_board_ks",
            "put_hamburger_in_microwave_ks",
            "put_plate_in_sink_ks",
            "put_spoon_in_dishrack_ks",
            "put_spoon_in_sink_ks",
            "put_spoon_on_plate_ks",
        ],
    )
    + _tasks_for(
        "kitchenl",
        [
            "move_bottle",
            "move_bottle_from_fridge_next_to_can",
            "move_can_from_cabinet_to_basket",
            "move_milk_close_fridge",
            "pick_bottle_from_fridge",
            "pick_boxdrink_from_basket",
            "pick_can_from_basket",
            "pick_can_from_cabinet",
            "pick_milk_box_from_fridge",
            "pick_sauce_can_from_cabinet",
            "put_bottle_in_basket",
            "put_bottle_in_fridge",
            "put_can_close_cabinet",
            "put_can_in_cabinet",
            "put_can_infront_of_microwave",
            "put_can_next_to_basket",
            "put_milk_box_in_fridge",
            "put_sauce_can_in_basket",
            "put_sauce_can_in_cabinet",
            "switch_can_with_bottle_in_basket",
        ],
    )
)
