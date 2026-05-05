"""
One-time export: downloads MiniFASNetV2 pretrained weights and exports
ai/anti_spoofing/model.onnx for use by the backend.

Prerequisites:
    pip install torch onnx requests

Run once from the project root:
    cd D:\CNS_C1
    python ai/anti_spoofing/export_model.py

The script clones github.com/minivision-ai/Silent-Face-Anti-Spoofing into
ai/anti_spoofing/vendor/sfa (depth=1, ~5 MB) and uses the pre-trained
2.7_80x80_MiniFASNetV2.pth weights that ship in that repo.

Output: ai/anti_spoofing/model.onnx
  Input  node: "input"  shape (batch, 3, 80, 80)  float32  range [-1, 1]
  Output node: "output" shape (batch, 3)           softmax probabilities
    class 0 = background
    class 1 = live  (use this as the liveness score)
    class 2 = spoof
"""

import os
import sys
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
VENDOR_DIR = os.path.join(HERE, "vendor", "sfa")
OUT_PATH = os.path.join(HERE, "model.onnx")
REPO_URL = "https://github.com/minivision-ai/Silent-Face-Anti-Spoofing.git"


def _clone():
    if os.path.isdir(os.path.join(VENDOR_DIR, ".git")):
        print("Vendor repo already present, skipping clone.")
        return
    os.makedirs(os.path.dirname(VENDOR_DIR), exist_ok=True)
    print("Cloning Silent-Face-Anti-Spoofing (depth=1) ...")
    subprocess.run(
        ["git", "clone", "--depth=1", REPO_URL, VENDOR_DIR],
        check=True,
    )
    print("Clone done.")


def _export():
    import torch

    sys.path.insert(0, VENDOR_DIR)
    from src.model_lib.MiniFASNet import MiniFASNetV2  # noqa: E402

    weights_path = os.path.join(
        VENDOR_DIR, "resources", "anti_spoof_models", "2.7_80x80_MiniFASNetV2.pth"
    )
    if not os.path.exists(weights_path):
        raise FileNotFoundError(
            f"Weights not found at {weights_path}.\n"
            "Did the clone succeed? Try re-running the script."
        )

    print(f"Loading weights from {weights_path} ...")
    model = MiniFASNetV2(conv6_kernel=(5, 5), num_classes=3, img_channel=3)
    state = torch.load(weights_path, map_location="cpu")
    model.load_state_dict(state)
    model.eval()

    # Wrap so the exported graph outputs softmax probabilities directly.
    class _Wrapped(torch.nn.Module):
        def __init__(self, base: torch.nn.Module) -> None:
            super().__init__()
            self.base = base

        def forward(self, x: torch.Tensor) -> torch.Tensor:
            return torch.softmax(self.base(x), dim=1)

    wrapped = _Wrapped(model)

    dummy = torch.zeros(1, 3, 80, 80)
    print(f"Exporting ONNX to {OUT_PATH} ...")
    torch.onnx.export(
        wrapped,
        dummy,
        OUT_PATH,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}},
        opset_version=11,
    )
    print(f"\n  model.onnx written ({os.path.getsize(OUT_PATH) // 1024} KB)")
    print("  class 1 = live score  |  class 2 = spoof score")
    print("\nDone. Copy model.onnx to backend/ai/anti_spoofing/model.onnx")
    print("or set SPOOF_MODEL_PATH env var to point to it before starting uvicorn.")


if __name__ == "__main__":
    _clone()
    _export()
