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
    def _on_error(func, fpath, exc_info):
        os.chmod(fpath, stat.S_IWRITE)
        func(fpath)
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
    # The repo contains a file whose path has a trailing space — Windows
    # cannot check it out and git exits with code 128. Everything we need
    # (src/ + resources/) is extracted before that error, so we ignore the
    # exit code and verify success by checking for the marker file instead.
    subprocess.run(
        ["git", "clone", "--depth=1", REPO_URL, VENDOR_DIR],
    )
    if not os.path.isfile(_MARKER):
        raise RuntimeError(
            f"Clone incomplete — {_MARKER} not found.\n"
            "Delete ai/anti_spoofing/vendor/ and try again."
        )
    print("Clone done (Windows path warning above is harmless).")


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
            "Delete vendor/sfa and re-run to re-clone."
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
