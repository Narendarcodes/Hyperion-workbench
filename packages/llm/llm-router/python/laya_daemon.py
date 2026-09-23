import sys
import json
import logging

# Ensure Laya doesn't spam stdout, as we use it for JSON RPC
logging.getLogger("laya").setLevel(logging.ERROR)

try:
    from laya import Router
except ImportError:
    print(json.dumps({"error": "laya package not found. Please install laya: pip install laya"}), flush=True)
    sys.exit(1)

def main():
    # Preload to ensure fast routing (<35ms) and keep checkpoints in memory
    try:
        router = Router(preload=True)
        # Emit a ready signal so the client knows it can start sending requests
        print(json.dumps({"ready": True}), flush=True)
    except Exception as e:
        print(json.dumps({"error": str(e)}), flush=True)
        sys.exit(1)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
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
            # Output error but keep daemon alive for next request
            print(json.dumps({"error": str(e)}), flush=True)

if __name__ == "__main__":
    main()
