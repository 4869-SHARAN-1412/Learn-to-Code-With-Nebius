from flask import Flask, request, jsonify
from flask_cors import CORS
import time
from openai import OpenAI

app = Flask(__name__)
CORS(app, supports_credentials=True)

# List of Nebius AI models
MODELS = [
    "meta-llama/Llama-3.3-70B-Instruct",
    "meta-llama/Meta-Llama-3.1-70B-Instruct",
    "meta-llama/Meta-Llama-3.1-8B-Instruct",
    "meta-llama/Meta-Llama-3.1-405B-Instruct",
    "mistralai/Mistral-Nemo-Instruct-2407",
    "mistralai/Mixtral-8x7B-Instruct-v0.1",
    "mistralai/Mixtral-8x22B-Instruct-v0.1",
    "cognitivecomputations/dolphin-2.9.2-mixtral-8x22b",
    "Qwen/Qwen2.5-Coder-7B",
    "Qwen/Qwen2.5-Coder-32B-Instruct",
    "Qwen/Qwen2.5-Coder-7B-Instruct",
    "deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct",
    "microsoft/Phi-3-mini-4k-instruct",
    "microsoft/Phi-3.5-mini-instruct",
    "microsoft/Phi-3.5-MoE-instruct",
    "microsoft/Phi-3-medium-128k-instruct",
    "allenai/OLMo-7B-Instruct-hf",
    "llava-hf/llava-1.5-7b-hf",
    "llava-hf/llava-1.5-13b-hf",
    "Qwen/Qwen2-VL-72B-Instruct",
    "Qwen/Qwen2.5-VL-72B-Instruct",
    "Qwen/Qwen2-VL-7B-Instruct",
    "google/gemma-2-2b-it",
    "google/gemma-2-9b-it",
    "meta-llama/Llama-Guard-3-8B",
    "Llama-3.1-Nemotron-70B-Instruct-HF",
    "google/gemma-2-27b-it",
    "Qwen/Qwen2.5-32B-Instruct",
    "Qwen/Qwen2.5-1.5B-Instruct",
    "Qwen/Qwen2.5-72B-Instruct",
    "aaditya/Llama3-OpenBioLLM-8B",
    "aaditya/Llama3-OpenBioLLM-70B",
    "BAAI/bge-multilingual-gemma2",
    "BAAI/bge-en-icl",
    "e5-mistral-7b-instruct",
    "black-forest-labs/FLUX.1-schnell",
    "black-forest-labs/FLUX.1-dev",
    "stabilityai/stable-diffusion-xl-base-1.0",
    "meta-llama/Llama-3.2-1B-Instruct",
    "meta-llama/Llama-3.2-3B-Instruct",
    "Qwen/QwQ-32B",
    "Qwen/QwQ-32B-Preview",
    "Qwen/QVQ-72B-preview",
    "microsoft/phi-4",
    "NousResearch/Hermes-3-Llama-3.1-405B"
]

# Initialize OpenAI client
client = OpenAI(
    base_url="https://api.studio.nebius.com/v1/",
    api_key="YOUR_NEBIUS_API_KEY"
)

@app.route("/models", methods=["GET"])
def get_models():
    return jsonify({"models": MODELS})

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    model = data.get("model")
    user_input = data.get("user_input", "").strip()
    context = data.get("context", "").strip()  # Conversation history

    if not model or model not in MODELS:
        return jsonify({"error": "Invalid or missing model"}), 400
    if not user_input:
        return jsonify({"error": "No user_input provided"}), 400

    start_time = time.time()

    # Constructing conversation flow
    messages = [{"role": "system", "content": "You are Nebius, a helpful code tutor AI."}]
    
    if context:
        messages.append({"role": "assistant", "content": context})  # Keeping conversation flow

    messages.append({"role": "user", "content": user_input})  # New user input

    try:
        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.6
        )
        
        response_text = completion.choices[0].message.content
        latency = time.time() - start_time

        return jsonify({
            "response": response_text,
            "latency": f"{latency:.2f} seconds",
            "model_used": model
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
