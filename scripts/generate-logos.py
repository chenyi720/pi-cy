import json
import time
import urllib.request
import urllib.parse
import uuid
import os

COMFYUI_URL = "http://127.0.0.1:8188"
OUTPUT_DIR = r"C:\Users\admin\Desktop\PI_agent-CY\media\logos"
os.makedirs(OUTPUT_DIR, exist_ok=True)

PROMPTS = [
    {
        "name": "logo_01_circuit_brain",
        "prompt": "A minimalist tech logo icon for 'PI-CY' AI coding assistant, a stylized circuit board brain merged with code brackets, primary colors deep electric blue and white on dark background, clean geometric lines, modern professional, flat design, 128x128 pixel friendly, sharp edges, square format, no text",
        "seed": 42,
        "width": 2048,
        "height": 2048,
    },
    {
        "name": "logo_02_cursor_neural",
        "prompt": "A modern logo combining a text cursor I-beam with a neural network node pattern, the cursor transforms into a flowing data stream of tiny dots, gradient from electric blue to violet, dark background, minimalist abstract tech-forward, vector style clean lines, square format, no text",
        "seed": 1337,
        "width": 2048,
        "height": 2048,
    },
    {
        "name": "logo_03_xiaomi_style",
        "prompt": "A logo for Xiaomi MiMo powered coding assistant, a stylized M that looks like a terminal prompt cursor merged with a brain icon, colors Xiaomi orange as primary dark charcoal as background, clean bold modern, no gradients, flat vector style, square icon format, pixel-perfect at small sizes, professional but approachable, no text",
        "seed": 2026,
        "width": 2048,
        "height": 2048,
    },
    {
        "name": "logo_04_pixel_cat",
        "prompt": "A cute pixel-art style mascot logo for PI-CY AI coding assistant, a small cat wearing headphones sitting in front of a glowing terminal screen, color palette neon cyan and purple on dark navy, retro gaming aesthetic 8-bit style but clean, square icon format for desktop app, no text",
        "seed": 8080,
        "width": 2048,
        "height": 2048,
    },
    {
        "name": "logo_05_chinese_tech",
        "prompt": "A logo blending Chinese ink brush aesthetics with futuristic tech, the Chinese character zhi stylized as a circuit pattern, accent color Xiaomi orange on dark background, minimalist elegant East meets West design philosophy, suitable for desktop app icon square format, no additional text",
        "seed": 618,
        "width": 2048,
        "height": 2048,
    },
]


def build_workflow(prompt_text, seed, width, height):
    return {
        "4": {
            "class_type": "HiDreamO1ModelLoader",
            "inputs": {
                "model_name": "HiDream-O1-Image-Dev-2604-FP8",
                "precision": "auto",
                "attention": "auto",
                "download_if_missing": False,
            },
        },
        "5": {
            "class_type": "HiDreamO1Conditioning",
            "inputs": {
                "prompt": prompt_text,
                "enhanced_prompt": "",
                "negative_prompt": "",
            },
        },
        "3": {
            "class_type": "HiDreamO1Sampler",
            "inputs": {
                "model": ["4", 0],
                "conditioning": ["5", 0],
                "model_type": "auto",
                "width": width,
                "height": height,
                "steps": 0,
                "seed": seed,
                "guidance_scale": 5.0,
                "shift": -1.0,
                "noise_scale_start": 7.5,
                "noise_scale_end": 7.5,
                "noise_clip_std": 2.5,
                "dev_editing_scheduler": "flow_match",
                "layout_bboxes": "",
                "preview_every": 4,
                "keep_image1_aspect": False,
                "force_offload": False,
                "image": {"image": "0"},
            },
        },
        "6": {
            "class_type": "SaveImage",
            "inputs": {
                "images": ["3", 0],
                "filename_prefix": "pi-cy-logo",
            },
        },
    }


def queue_prompt(workflow, client_id):
    body = json.dumps({"prompt": workflow, "client_id": client_id}).encode("utf-8")
    req = urllib.request.Request(
        f"{COMFYUI_URL}/prompt",
        data=body,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def get_history(prompt_id):
    with urllib.request.urlopen(f"{COMFYUI_URL}/history/{prompt_id}", timeout=10) as resp:
        return json.loads(resp.read())


def get_image(filename, subfolder, img_type="output"):
    params = urllib.parse.urlencode(
        {"filename": filename, "subfolder": subfolder, "type": img_type}
    )
    with urllib.request.urlopen(f"{COMFYUI_URL}/view?{params}", timeout=30) as resp:
        return resp.read()


def wait_for_completion(prompt_id, timeout_s=600):
    start = time.time()
    while time.time() - start < timeout_s:
        history = get_history(prompt_id)
        if prompt_id in history:
            status = history[prompt_id].get("status", {})
            if status.get("completed", False):
                return history[prompt_id]
            if status.get("status_str") == "error":
                raise RuntimeError(f"Generation failed: {history[prompt_id]}")
        time.sleep(2)
    raise TimeoutError(f"Timed out after {timeout_s}s")


def generate_one(item, client_id):
    print(f"\n[{item['name']}] Generating ({item['width']}x{item['height']}, seed={item['seed']})...")
    print(f"  Prompt: {item['prompt'][:80]}...")

    workflow = build_workflow(item["prompt"], item["seed"], item["width"], item["height"])
    result = queue_prompt(workflow, client_id)
    prompt_id = result["prompt_id"]
    print(f"  Queued: {prompt_id}")

    history = wait_for_completion(prompt_id)
    outputs = history.get("outputs", {})

    for node_id, node_output in outputs.items():
        images = node_output.get("images", [])
        for img_info in images:
            img_data = get_image(img_info["filename"], img_info.get("subfolder", ""), img_info.get("type", "output"))
            out_path = os.path.join(OUTPUT_DIR, f"{item['name']}.png")
            with open(out_path, "wb") as f:
                f.write(img_data)
            print(f"  Saved: {out_path} ({len(img_data) / 1024:.1f} KB)")
            return out_path

    raise RuntimeError("No image in output")


if __name__ == "__main__":
    client_id = str(uuid.uuid4())
    print(f"ComfyUI: {COMFYUI_URL}")
    print(f"Output: {OUTPUT_DIR}")
    print(f"Client: {client_id}")
    print(f"Generating {len(PROMPTS)} PI-CY logo variants...\n")

    results = []
    for i, item in enumerate(PROMPTS, 1):
        print(f"=== [{i}/{len(PROMPTS)}] ===")
        try:
            path = generate_one(item, client_id)
            results.append({"name": item["name"], "path": path, "status": "ok"})
        except Exception as e:
            print(f"  ERROR: {e}")
            results.append({"name": item["name"], "path": None, "status": str(e)})

    print("\n\n=== RESULTS ===")
    for r in results:
        status = "OK" if r["status"] == "ok" else f"FAIL: {r['status']}"
        print(f"  {r['name']}: {status}")

    ok_count = sum(1 for r in results if r["status"] == "ok")
    print(f"\n{ok_count}/{len(results)} images generated successfully.")
