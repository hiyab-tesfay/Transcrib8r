import os
import tempfile
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from pathlib import Path
from werkzeug.utils import secure_filename
from groq import Groq
from dotenv import load_dotenv
import traceback

# Import note generation functions from our notes module
from notes import generate_structured_notes

# Configuration
PROJECT_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"
app = Flask(__name__)
allowed_origins = os.getenv(
    "CORS_ORIGINS", "http://127.0.0.1:5173,http://localhost:5173"
)
allowed_origins = [origin.strip() for origin in allowed_origins.split(",") if origin.strip()]
CORS(app, resources={r"/api/*": {"origins": allowed_origins}})
app.config["MAX_CONTENT_LENGTH"] = 200 * 1024 * 1024  # 200 MB upload limit

# Load environment variables from .env (optional)
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

# Groq clients are created lazily so the app and portfolio demo can start
# without API credentials. Real transcription still requires GROQ_API_KEY.
def get_groq_key() -> str:
    """Get Groq API key from environment (or .env)."""
    key = os.getenv("GROQ_API_KEY")
    if key:
        return key
    raise ValueError("Groq API key not found. Set GROQ_API_KEY in environment or .env file.")


def get_groq_client() -> Groq:
    """Create a configured Groq client only when transcription is requested."""
    return Groq(api_key=get_groq_key())

# Allowed audio file extensions
ALLOWED_EXTENSIONS = {".mp3", ".mp4", ".wav", ".m4a", ".mpeg", ".mpga", ".webm"}


def live_api_enabled() -> bool:
    """Return whether public requests may call paid AI providers."""
    return os.getenv("LIVE_API_ENABLED", "true").lower() in {"1", "true", "yes", "on"}


def allowed_file(filename: str) -> bool:
    #Check if the file extension is allowed
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


@app.route("/api", methods=["GET"])
def home():
    """Home route showing API status and available endpoints."""
    return jsonify({
        "status": "running",
        "version": "2.0",
        "endpoints": {
            "POST /api/transcribe": "Upload audio file and get transcription",
            "POST /api/generate-notes": "Generate structured notes from transcript text",
            "GET /api/health": "Check service configuration"
        },
        "audio_formats": sorted(ALLOWED_EXTENSIONS),
        "max_upload_size_mb": 200
    }), 200


@app.route("/api/transcribe", methods=["POST"])
@app.route("/transcribe", methods=["POST"])
def transcribe():
    """
    Transcribe an audio file using Groq's whisper-large-v3 model.
    Uses temporary files for processing (automatically cleaned up).
    
    Request: multipart/form-data with 'file' field containing audio
    Response: JSON with transcription text and metadata
    """
    if not live_api_enabled():
        return jsonify({
            "error": "Live transcription is disabled on this portfolio deployment. Try the sample lecture instead."
        }), 503

    # Check if file is present
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    # Log request metadata to help diagnose issues
    try:
        print(f"➡️  Request Content-Type: {request.headers.get('Content-Type')}")
        print(f"➡️  Files keys: {list(request.files.keys())}")
        print(f"➡️  Incoming file: name={file.filename}, mimetype={getattr(file, 'mimetype', 'unknown')}")
    except Exception:
        pass
    
    # Check if filename is empty
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Check if file extension is allowed
    if not allowed_file(file.filename):
        return jsonify({
            'error': f"File type not allowed. Supported: {', '.join(ALLOWED_EXTENSIONS)}"
        }), 400
    
    # Use temporary file for processing (automatically cleaned up)
    with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as temp_audio:
        file.save(temp_audio.name)
        temp_audio_path = temp_audio.name
    
    try:
        print(f"🎙️  Transcribing: {file.filename}")
        # Log basic file info
        try:
            file_size_mb = os.path.getsize(temp_audio_path) / (1024 * 1024)
            print(f"   Size: {file_size_mb:.2f} MB | Ext: {Path(file.filename).suffix}")
        except Exception:
            file_size_mb = None

        # Open and transcribe the audio file using Groq Whisper Large V3
        with open(temp_audio_path, 'rb') as audio_file:
            transcription = get_groq_client().audio.transcriptions.create(
                file=audio_file,
                model="whisper-large-v3"
            )

        # Clean up temp file
        try:
            os.remove(temp_audio_path)
        except Exception:
            pass

        print("✅ Transcription complete!")
        try:
            print(f"   Transcript length: {len(transcription.text)} chars")
        except Exception:
            pass
        return jsonify({
            'status': 'success',
            'filename': secure_filename(file.filename),
            'transcription': transcription.text,
            'language': getattr(transcription, 'language', 'auto-detected')
        }), 200

    except Exception as e:
        # Clean up temp file on error
        try:
            if os.path.exists(temp_audio_path):
                os.remove(temp_audio_path)
        except Exception:
            pass

        # Provide clearer error messages to the frontend
        msg = str(e)
        err_type = e.__class__.__name__
        tb = traceback.format_exc(limit=3)
        print(f"❌ Transcription error: {err_type}: {msg}\n{tb}")

        # Map common failures to friendly messages
        if "401" in msg or "Unauthorized" in msg:
            friendly = "Groq authentication failed. Check GROQ_API_KEY."
        elif "429" in msg or "rate limit" in msg.lower():
            # Try to extract recommended wait time from the message
            wait_hint = ""
            try:
                # e.g., "Please try again in 4m33s"
                import re
                m = re.search(r"try again in ([0-9]+m[0-9]+s|[0-9]+s)", msg, re.IGNORECASE)
                if m:
                    wait_hint = f" after {m.group(1)}"
            except Exception:
                pass
            friendly = (
                "Groq rate limit reached for whisper-large-v3."
                f" Please retry{wait_hint} or reduce audio length (split the file)."
            )
        elif "413" in msg or "too large" in msg.lower() or "request entity too large" in msg.lower():
            size_part = f" ({file_size_mb:.1f} MB)" if isinstance(file_size_mb, (int, float)) else ""
            friendly = f"File upload failed{size_part}. Large files may timeout during upload. Try: 1) Compress the audio to reduce file size, 2) Convert to MP3 format, or 3) Split into smaller segments."
        elif "model" in msg and "not" in msg and "found" in msg:
            friendly = "Groq model name invalid. Using 'whisper-large-v3'."
        elif "file" in msg and ("not found" in msg or "invalid" in msg):
            friendly = "Uploaded file could not be processed. Try a standard mp3/wav."
        else:
            friendly = "Something went wrong while transcribing. Please try again."

        payload = {'error': friendly}
        if app.debug:
            payload['details'] = f"{err_type}: {msg}"
        return jsonify(payload), 500


@app.route("/api/health", methods=["GET"])
@app.route("/health", methods=["GET"])
def health():
    """Simple health check to verify configuration without exposing secrets."""
    response = {
        "status": "ok",
        "live_api_enabled": live_api_enabled(),
        "audio_formats": sorted(ALLOWED_EXTENSIONS),
        "max_upload_size_mb": app.config.get("MAX_CONTENT_LENGTH", 0) // (1024 * 1024),
    }
    if app.debug:
        response.update({
            "groq_key_present": bool(os.getenv("GROQ_API_KEY")),
            "openai_key_present": bool(os.getenv("OPENAI_API_KEY")),
        })
    return jsonify(response), 200


@app.route("/api/generate-notes", methods=["POST"])
@app.route("/generate-notes", methods=["POST"])
def generate_notes():
    """
    Generate structured notes from transcript text using GPT.
    
    Request JSON:
    {
        "transcript": "The full transcription text...",
        "title": "Optional title for the notes",
        "format": "markdown" (default: markdown, options: markdown, json)
    }
    
    Response: JSON with generated notes
    """
    if not live_api_enabled():
        return jsonify({
            "error": "Live note generation is disabled on this portfolio deployment. Try the sample lecture instead."
        }), 503

    try:
        # Get JSON data
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "Request body must be JSON"}), 400
        
        transcript = data.get("transcript", "")
        if not transcript or len(transcript.strip()) == 0:
            return jsonify({"error": "Transcript text is required"}), 400
        
        title = data.get("title", "Lecture Notes")
        format_type = data.get("format", "markdown").lower()
        
        if format_type not in ["markdown", "json"]:
            return jsonify({"error": "Format must be 'markdown' or 'json'"}), 400
        
        print(f"📝 Generating {format_type} notes with title: '{title}'...")
        print(f"   Transcript length: {len(transcript)} chars")
        
        # Generate notes using GPT with all parameters from notes.py
        # This function will use MODEL_NAME, MAX_COMPLETION_TOKENS, CHUNK_CHAR_LIMIT from notes.py
        notes = generate_structured_notes(
            transcript=transcript,
            title=title,
            format_type=format_type,
            api_key=None  # Will use get_api_key() from notes.py
        )
        
        print(f"✅ Notes generated successfully! Length: {len(notes)} chars")
        
        return jsonify({
            "status": "success",
            "title": title,
            "format": format_type,
            "notes": notes,
            "transcript_length": len(transcript),
            "word_count": len(transcript.split())
        }), 200
    
    except Exception as e:
        error_msg = str(e)
        error_type = e.__class__.__name__
        print(f"❌ Note generation error ({error_type}): {error_msg}")
        import traceback
        print(traceback.format_exc(limit=3))
        message = f"Note generation failed: {error_msg}" if app.debug else "Note generation failed. Please try again."
        return jsonify({"error": message}), 500


@app.route("/", methods=["GET"])
def serve_frontend():
    """Serve the production React build when it is available."""
    if (FRONTEND_DIST / "index.html").exists():
        return send_from_directory(FRONTEND_DIST, "index.html")
    return jsonify({
        "status": "running",
        "message": "React development server is separate. Run `npm run dev` in frontend/.",
        "api_docs": "/api"
    }), 200


@app.route("/<path:path>", methods=["GET"])
def serve_frontend_assets(path: str):
    """Serve built assets and fall back to React for client-side routes."""
    target = FRONTEND_DIST / path
    if target.is_file():
        return send_from_directory(FRONTEND_DIST, path)
    if path.startswith("api/"):
        return jsonify({"error": "API route not found"}), 404
    if (FRONTEND_DIST / "index.html").exists():
        return send_from_directory(FRONTEND_DIST, "index.html")
    return jsonify({"error": "Frontend build not found"}), 404


if __name__ == "__main__":
    print("🚀 Starting Transcrib8 Flask backend...")
    print("🌐 App: http://127.0.0.1:5000/")
    print("📡 API: http://127.0.0.1:5000/api")
    app.run(
        debug=os.getenv("FLASK_DEBUG", "false").lower() == "true",
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "5000")),
    )
