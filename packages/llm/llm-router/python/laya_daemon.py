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

    questions = {
        "task_type": {
            "type": "choice",
            "instructions": "What type of task is this?",
            "criteria": {
                "coding": "writing, debugging or modifying code",
                "reasoning": "complex logic, planning, math or deep analysis",
                "qa": "simple question answering, information extraction, summarization",
                "creative": "writing stories, drafting emails, brainstorming",
                "other": "everything else"
            }
        },
        "complexity": {
            "type": "score",
            "instructions": "How complex is this request?",
            "criteria": ["simple", "moderate", "highly complex"]
    }

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            req_id = req.get("id")
            text = req.get("text", "")
            if not text:
                print(json.dumps({"id": req_id, "error": "No text provided"}), flush=True)
                continue

            # Pass to Laya
            result = router.predict({"text": text}, questions)
            
            # Format output for the TypeScript client
            out = {
                "id": req_id,
                "task_type": result["answers"]["task_type"]["choice"],
                "task_type_confidence": result["answers"]["task_type"]["confidence"],
                "complexity": result["answers"]["complexity"]["score"],
                "routing_model": result["routing"]["model"]
            }
            print(json.dumps(out), flush=True)
        except Exception as e:
            # Output error but keep daemon alive for next request
            print(json.dumps({"error": str(e)}), flush=True)

if __name__ == "__main__":
    main()
