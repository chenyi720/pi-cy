import json
import time
import urllib.request
import urllib.parse
import uuid
import os

COMFYUI_URL = "http://127.0.0.1:8188"
OUTPUT_DIR = r"C:\Users\admin\Desktop\PI_agent-CY\media"
os.makedirs(OUTPUT_DIR, exist_ok=True)

PROMPT_TEXT = (
    "A clean, technical blueprint flowchart diagram illustrating a 'PDF to CAD' translation pipeline. "
    "The flowchart has five distinct steps connected with arrows: "
    "1. Input Parser (reads vector/raster PDF), "
    "2. VLM Understanding (MiMo v2.5 reads semantic layout), "
    "3. Line & Text Extraction (OpenCV LSD & PaddleOCR), "
    "4. CAD Generation (ezdxf generator), "
    "5. Self-Check Loop (compares rendered DXF with original image). "
    "Futuristic engineering schematic layout, modern tech interface, clean geometric boxes, "
    "electric blue and neon accents, sleek professional typography, dark gray background, vector art"
)

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
                "image": "0",
            },
        },
        "6": {
            "class_type": "SaveImage",
            "inputs": {
                "images": ["3", 0],
                "filename_prefix": "pdf_to_cad_workflow",
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
        try:
            history = get_history(prompt_id)
            if prompt_id in history:
                status = history[prompt_id].get("status", {})
                if status.get("completed", False):
                    return history[prompt_id]
                if status.get("status_str") == "error":
                    raise RuntimeError(f"Generation failed: {history[prompt_id]}")
        except Exception as e:
            # History might temporarily fail or be empty during start
            pass
        time.sleep(2)
    raise TimeoutError(f"Timed out after {timeout_s}s")

def generate_flowchart():
    client_id = str(uuid.uuid4())
    print(f"Connecting to ComfyUI at {COMFYUI_URL}...")
    seed = 42
    # Flowcharts are better in landscape aspect ratio
    width = 1536
    height = 1024
    
    workflow = build_workflow(PROMPT_TEXT, seed, width, height)
    result = queue_prompt(workflow, client_id)
    prompt_id = result["prompt_id"]
    print(f"Queued generation with prompt ID: {prompt_id}")
    
    history = wait_for_completion(prompt_id)
    outputs = history.get("outputs", {})
    
    for node_id, node_output in outputs.items():
        images = node_output.get("images", [])
        for img_info in images:
            img_data = get_image(img_info["filename"], img_info.get("subfolder", ""), img_info.get("type", "output"))
            out_path = os.path.join(OUTPUT_DIR, "pdf_to_cad_workflow.png")
            with open(out_path, "wb") as f:
                f.write(img_data)
            print(f"Successfully saved generated flowchart to: {out_path}")
            return out_path
            
    raise RuntimeError("No image returned from ComfyUI.")

if __name__ == "__main__":
    generate_flowchart()
