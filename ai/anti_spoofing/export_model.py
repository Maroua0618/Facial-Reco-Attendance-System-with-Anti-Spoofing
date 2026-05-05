r"""
One-time export: downloads MiniFASNetV2 pretrained weights and exports
ai/anti_spoofing/model.onnx for use by the backend.

Prerequisites:
    pip install torch onnx requests

Run once from the project root:
    cd D:/CNS_C1
    python ai/anti_spoofing/export_model.py

Output: ai/anti_spoofing/model.onnx
  Input  node: "input"  shape (batch, 3, 80, 80)  float32  range [-1, 1]
  Output node: "output" shape (batch, 3)           softmax probabilities
    class 0 = background
    class 1 = live  (use this as the liveness score)
    class 2 = spoof
"""

import os
import sys
import stat
import shutil
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
VENDOR_DIR = os.path.join(HERE, "vendor", "sfa")
OUT_PATH = os.path.join(HERE, "model.onnx")
REPO_URL = "https://github.com/minivision-ai/Silent-Face-Anti-Spoofing.git"
_MARKER = os.path.join(VENDOR_DIR, "src", "model_lib", "MiniFASNet.py")


def _force_rmtree(path):
    """Remove a directory tree, clearing read-only bits first (needed for
    .git/objects on Windows)."""
    def _on_error(func, fpath, exc_info):
        os.chmod(fpath, stat.S_IWRITE)
        func(fpath)

    # Python 3.12 renamed onerror -> onexc; support both.
    try:
        shutil.rmtree(path, onexc=_on_error)
    except TypeError:
        shutil.rmtree(path, onerror=_on_error)


def _clone():
    if os.path.isfile(_MARKER):
        print("Vendor repo already present and complete, skipping clone.")
        return
    if os.path.isdir(VENDOR_DIR):
        print("Vendor dir exists but is incomplete — removing and re-cloning...")
        _force_rmtree(VENDOR_DIR)
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
            "Did the clone succeed? Try deleting vendor/sfa and re-running."
        )

    print(f"Loading weights from {weights_path} ...")
    model = MiniFASNetV2(conv6_kernel=(5, 5), num_classes=3, img_channel=3)
    state = torch.load(weights_path, map_location="cpu")
    model.load_state_dict(state)
    model.eval()

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
    print("\nDone. Restart uvicorn and watch for: Loaded liveness ONNX model")


if __name__ == "__main__":
    _clone()
    _export()
