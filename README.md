# AI Research Workspace (Multi-Agent System)

Welcome to the **AI Research Workspace**, a premium, production-ready multi-agent system designed for automated research, document analysis, and dynamic knowledge management. Powered by **Google Gemini LLMs**, orchestrated with **LangGraph**, and styled with a sleek modern UI.

This workspace consists of:
*   **Backend**: Python FastAPI service utilizing LangGraph for complex agentic workflows, SQLAlchemy for database operations, and PostgreSQL with pgvector for high-performance vector semantic search.
*   **Frontend**: Next.js (App Router) interface with modern styling, fluid animations using Framer Motion, and responsive layouts.

---

## 🛠️ Tech Stack

*   **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS, Lucide Icons, Framer Motion
*   **Backend**: FastAPI, Python 3.10, LangGraph, Google Generative AI (Gemini), SQLAlchemy
*   **Database & Memory**: PostgreSQL with pgvector (vector search) & SQLite (local fallback)
*   **Caching & State**: Redis (caching) & Local in-memory caching fallback
*   **Containerization**: Docker, Docker Compose

---

## 📁 Repository Structure

```text
├── backend/            # FastAPI Python server
│   ├── app/            # Core application code
│   │   ├── agents/     # LangGraph agent definitions
│   │   ├── api/        # REST endpoints (v1)
│   │   ├── core/       # Database & config settings
│   │   ├── models/     # SQLAlchemy database models
│   │   └── services/   # Caching, vector store, embeddings
│   ├── Dockerfile      # Backend container definition
│   └── requirements.txt
├── frontend/           # Next.js React frontend
│   ├── app/            # Next.js App Router pages
│   ├── hooks/          # React hooks
│   ├── lib/            # API client configurations
│   ├── Dockerfile      # Frontend container definition
│   └── package.json
├── docker-compose.yml  # Local multi-container orchestration
└── render.yaml         # Render Infrastructure-as-Code blueprint
```

---

## 🚀 Getting Started (Local Development)

You can run the entire stack locally using Docker (recommended) or run services manually.

### Prerequisites
*   [Docker Desktop](https://www.docker.com/products/docker-desktop/) (For Docker deployment)
*   Python 3.10+ & Node.js 20+ (For manual running)
*   A **Gemini API Key** (Get one from [Google AI Studio](https://aistudio.google.com/))

### Option A: Run with Docker (Recommended)
This starts Postgres (with vector support), Redis, the backend, and the frontend with a single command.

1.  **Configure environment variables**:
    Create a `.env` file in the `backend/` directory:
    ```bash
    cp backend/.env.example backend/.env
    ```
    Open `backend/.env` and update the `GEMINI_API_KEY`:
    ```env
    GEMINI_API_KEY=your_actual_gemini_api_key
    DATABASE_MODE=postgres
    ```

2.  **Spin up the containers**:
    From the root directory, run:
    ```bash
    docker-compose up -d --build
    ```

3.  **Access the applications**:
    *   **Frontend UI**: [http://localhost:3000](http://localhost:3000)
    *   **Backend API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Option B: Run Manually (Without Docker)
If you don't have Docker installed, you can run the services on your local machine using SQLite (in-memory db fallback) and local memory caching:

#### 1. Run the Backend
1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Set up a virtual environment and install dependencies:
    ```bash
    python -m venv venv
    # On Windows:
    .\venv\Scripts\activate
    # On macOS/Linux:
    source venv/bin/activate
    
    pip install -r requirements.txt
    ```
3.  Configure `.env` file:
    ```bash
    cp .env.example .env
    ```
    Set `DATABASE_MODE=sqlite` in `.env` (this uses a local `research_workspace.db` file).
4.  Run the FastAPI development server:
    ```bash
    uvicorn app.main:app --reload
    ```
    The backend will run on [http://localhost:8000](http://localhost:8000).

#### 2. Run the Frontend
1.  Open a new terminal and navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install packages:
    ```bash
    npm install
    ```
3.  Start the Next.js development server:
    ```bash
    npm run dev
    ```
    The frontend will run on [http://localhost:3000](http://localhost:3000).

---

## 🌐 Cloud Deployment (Render)

This project is pre-configured for one-click deployment to **Render** using the [render.yaml](render.yaml) blueprint file.

1.  Push your project codebase to a GitHub or GitLab repository.
2.  Log in to your [Render Dashboard](https://dashboard.render.com).
3.  Click **New +** and select **Blueprint**.
4.  Connect your Git repository.
5.  Render will read the `render.yaml` configuration and list the components to deploy:
    *   **PostgreSQL Database** (with native `pgvector` enabled)
    *   **FastAPI Backend** (Dockerized)
    *   **Next.js Frontend** (Dockerized)
6.  Provide your **`GEMINI_API_KEY`** in the prompted variables.
7.  Click **Apply**. Render will automatically wire up internal connections and deploy the system.

---

## 🔒 Security & Best Practices
*   **Environment Secrets**: Never commit `.env` or configuration secrets. A `.gitignore` is provided in the root/sub-directories to keep them local.
*   **JWT Secret Key**: In production, change the `SECRET_KEY` in the backend environment to a cryptographically secure key.
*   **Caching Fallback**: If Redis is not configured, the backend automatically falls back to in-memory caching to save cloud resources.
