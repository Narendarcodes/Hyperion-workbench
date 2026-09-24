import sys
import os
import json
import logging

# Ensure Laya doesn't spam stdout, as we use it for JSON RPC
logging.getLogger("laya").setLevel(logging.ERROR)

try:
    from laya import Router
except ImportError:
    print(json.dumps({"error": "laya package not found. Please install laya: pip install laya"}), flush=True)
    sys.exit(1)
def find_local_snapshot():
    hub_dir = os.path.expanduser("~/.cache/huggingface/hub/models--convaiinnovations--laya/snapshots")
    if os.path.isdir(hub_dir):
        try:
            entries = sorted(os.listdir(hub_dir), key=lambda d: os.path.getmtime(os.path.join(hub_dir, d)), reverse=True)
            for e in entries:
                snap = os.path.join(hub_dir, e)
                if os.path.isfile(os.path.join(snap, "model.safetensors")):
                    return snap
        except Exception:
            pass
    return None

def main():
    try:
        local_snap = find_local_snapshot()
        if local_snap:
            router = Router(models={"english": local_snap}, standalone_repos=True, preload=False)
        else:
            router = Router(preload=False)
        router.preload(["english"])
        print(json.dumps({"ready": True}), flush=True)
    except Exception as e:
        print(json.dumps({"error": str(e)}), flush=True)
        sys.exit(1)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        req_id = None
        try:
            req = json.loads(line)
        except json.JSONDecodeError as e:
            print(json.dumps({"error": f"Invalid JSON: {e}"}), flush=True)
            continue

        try:
            req_id = req.get("id")
            text = req.get("text", "")
            req_questions = req.get("questions")

            if not text:
                print(json.dumps({"id": req_id, "error": "No text provided"}), flush=True)
                continue
            if not req_questions:
                print(json.dumps({"id": req_id, "error": "No questions config provided"}), flush=True)
                continue

            # Pass to Laya
            result = router.predict({"text": text}, req_questions)

            # Format output for the TypeScript client dynamically
            out = {
                "id": req_id,
                "answers": result.get("answers", {}),
                "routing_model": result.get("routing", {}).get("model")
            }
            print(json.dumps(out), flush=True)
        except Exception as e:
            # Output error with id so the TS client can resolve the pending promise
            print(json.dumps({"id": req_id, "error": str(e)}), flush=True)

if __name__ == "__main__":
    main()
