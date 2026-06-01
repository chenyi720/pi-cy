# ComfyUI + HiDream-O1-Image 生图功能实现小结

## 验收结果

| # | 文件名 | 风格 | 分辨率 | 大小 | 状态 |
|---|--------|------|--------|------|------|
| 1 | `logo_01_circuit_brain.png` | 科技极简电路脑 | 2048×2048 | 656 KB | OK |
| 2 | `logo_02_cursor_neural.png` | 光标+神经网络 | 2048×2048 | 614 KB | OK |
| 3 | `logo_03_xiaomi_style.png` | 小米风格 M | 2048×2048 | 595 KB | OK |
| 4 | `logo_04_pixel_cat.png` | 像素猫吉祥物 | 2048×2048 | 688 KB | OK |
| 5 | `logo_05_chinese_tech.png` | 中式科技水墨 | 2048×2048 | 647 KB | OK |

**5/5 全部成功。**

---

## 技术实现

### 架构

```
PI-CY (React + Tauri)
  ↓ HTTP POST /api/comfyui/generate
Node.js Backend (src/server/api/comfyui.ts)
  ↓ HTTP POST http://127.0.0.1:8188/prompt
ComfyUI API
  ↓ HiDreamO1ModelLoader → HiDreamO1Conditioning → HiDreamO1Sampler → SaveImage
HiDream-O1-Image-Dev-2604-FP8 (RTX 4070 Ti, ~10GB VRAM)
  ↓ 生成图片
Output: media/logos/*.png
```

### 关键组件

| 组件 | 文件 | 说明 |
|------|------|------|
| ComfyUI 节点 | `C:\ComfyUI\custom_nodes\HiDream_O1-ComfyUI\` | Saganaki22 的 HiDream O1 节点（58 stars） |
| 模型文件 | `C:\ComfyUI\models\diffusion_models\HiDream-O1-Image-Dev-2604-fp8\` | 8.4GB FP8 量化，28步出图 |
| 后端 API | `src/server/api/comfyui.ts` | 生成/状态/图片服务 3个端点 |
| 前端组件 | `src/web/components/ImageGenerator.tsx` | 提示词+参数+预览 |
| 生图脚本 | `scripts/generate-logos.py` | 批量生图脚本 |

### API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/comfyui/status` | GET | 检测 ComfyUI 是否可用 |
| `/api/comfyui/generate` | POST | 提交生图任务（prompt, width, height, steps, seed） |
| `/api/comfyui/image` | GET | 获取生成的图片文件 |

### ComfyUI 工作流

```json
{
  "HiDreamO1ModelLoader": {
    "model_name": "HiDream-O1-Image-Dev-2604-FP8",
    "precision": "auto",
    "attention": "auto"
  },
  "HiDreamO1Conditioning": {
    "prompt": "用户提示词"
  },
  "HiDreamO1Sampler": {
    "model_type": "auto",
    "width": 2048,
    "height": 2048,
    "steps": 0,          // 0=自动，Dev 模型固定28步
    "seed": 42,
    "guidance_scale": 5.0,
    "image": "0"          // 0=纯文生图，无参考图
  },
  "SaveImage": {
    "filename_prefix": "pi-cy-logo"
  }
}
```

---

## 踩坑记录

| 坑 | 原因 | 解决 |
|----|------|------|
| Saganaki22 节点不加载 | 缺少 `diffusers` 依赖 | `pip install diffusers` 到 ComfyUI 的 .venv |
| ComfyUI 端口不是 8188 | Electron 桌面版默认用 8000 | 用 `main.py --port 8188` 直接启动 |
| `image` 参数报错 | DynamicCombo 需要字符串 `"0"` 而非整数 `0` | 改为 `"image": "0"` |
| HuggingFace 下载超时 | 国内网络问题 | 使用 `hf-mirror.com` 镜像 + curl 断点续传 |
| BF16 模型太大 | 18-20GB 超出 12GB VRAM | 改用 FP8 版本（8.4GB） |

---

## 环境配置

| 项 | 值 |
|----|-----|
| GPU | RTX 4070 Ti (12GB VRAM) |
| ComfyUI | v0.22.0 |
| Python | 3.12.11 (ComfyUI .venv) |
| 模型 | HiDream-O1-Image-Dev-2604-FP8 (8.4GB) |
| 节点 | Saganaki22/HiDream_O1-ComfyUI v0.2.3 |
| 端口 | 8188 (手动启动) / 8000 (Electron 桌面版) |

---

## 生成时间

每张图约 1-2 分钟（28步，2048×2048，FP8 量化）。

总计 5 张图 ≈ 8 分钟。
