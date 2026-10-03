# Transcrib8r

Transcrib8r turns lecture recordings into searchable transcripts, focused summaries, key concepts, and practice questions in one study workspace.

The product includes a complete sample lecture, so the interface can be explored without an account or API usage.

## Highlights

- Drag-and-drop audio and video upload
- Groq Whisper transcription
- Structured study notes generated with OpenAI
- Transcript search and source-linked concepts in the sample experience
- Summary, concepts, and practice-question views
- Markdown export
- Responsive React and TypeScript interface
- A no-cost portfolio demo path

## Architecture

```text
React + TypeScript (Vite)
          |
          | /api
          v
      Flask API
       /      \
Groq Whisper  OpenAI
transcription study notes
```

The Vite development server proxies `/api` to Flask. A production React build is served directly by Flask, keeping deployment and API requests on the same origin.

## Technology

- React 19, TypeScript, and Vite
- Flask and Flask-CORS
- Groq `whisper-large-v3`
- OpenAI structured note generation
- Lucide icons

## Run locally

### 1. Start the API

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cp .env.example .env
python backend/app.py
```

Add `GROQ_API_KEY` and `OPENAI_API_KEY` to `.env` to use real uploads. The sample lecture in the frontend works without either key.

### 2. Start the React app

```bash
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

### Explore without API keys

Start only the React app and select **Try a sample lecture** or **Open sample**. The complete transcript, notes, concepts, and questions are imported from `frontend/src/data/demo.ts`; this path does not contact Flask, Groq, or OpenAI.

## Production build

```bash
cd frontend
npm install
npm run build
cd ..
python backend/app.py
```

Flask will serve `frontend/dist` at `http://127.0.0.1:5000`.

## Deploy to Render

The repository includes a multi-stage `Dockerfile` and `render.yaml`, so the React frontend and Flask API deploy as one web service.

1. Commit these changes and push them to the `main` branch on GitHub.
2. Sign in to [Render](https://dashboard.render.com/) and select **New → Blueprint**.
3. Connect `hiyab-tesfay/Transcrib8r`.
4. Render will detect `render.yaml`. Review the `transcrib8r` service and apply the Blueprint.
5. Wait for the Docker build and `/api/health` check to pass, then open the generated `onrender.com` URL.

The Blueprint deploys in safe portfolio mode with `LIVE_API_ENABLED=false`. The complete sample experience works, but public visitors cannot spend your Groq or OpenAI credits.

To enable real uploads later:

1. Open the service's **Environment** page in Render.
2. Add `GROQ_API_KEY` and `OPENAI_API_KEY` as secret values.
3. Change `LIVE_API_ENABLED` to `true` and redeploy.

Do not enable the paid APIs on a public URL until authentication and rate limiting are added. Otherwise, anyone who finds the endpoint can use your API credits.

Render's free web service is suitable for a portfolio demonstration, but it sleeps after inactivity and can take roughly a minute to wake up again.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api` | Service information |
| `GET` | `/api/health` | Configuration health check |
| `POST` | `/api/transcribe` | Upload and transcribe media |
| `POST` | `/api/generate-notes` | Generate structured notes from a transcript |

## Privacy

Uploaded media is written to a temporary file for transcription and removed after the request completes. The application does not include a persistent recording database.

## Project ownership

Designed and built by a team during AI Collective (UC Davis Club) during a project building cohort. This version is an improved version built by Hiyab as a full-stack portfolio project focused on making recorded lectures more useful after class.
