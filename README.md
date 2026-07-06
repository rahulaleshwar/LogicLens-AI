
# 🛡️ LogicLens AI

> **AI-Powered Multi-Agent Web Application Security Assessment Platform**

<p align="center">
  <img src="docs/images/banner.png" alt="LogicLens AI Banner" width="100%">
</p>

<p align="center">

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)
![Google ADK](https://img.shields.io/badge/Google-ADK-4285F4?logo=google)
![Gemini](https://img.shields.io/badge/Gemini-2.5-8E75B2)
![Cloud Run](https://img.shields.io/badge/Google-Cloud_Run-4285F4?logo=googlecloud)
![Build](https://img.shields.io/badge/Build-Passing-brightgreen)

</p>

---

## 🚀 Overview

LogicLens AI is an AI-powered multi-agent platform for passive web application security assessment built using **Google ADK**, **Gemini 2.5**, **FastAPI**, and **React JS**. Multiple specialized AI agents collaborate to analyze web applications, validate findings, and generate professional security reports.

---

# 🎬 Demo

## Demo Video
https://youtube.com/

## Live Demo
https://logiclens-adk-7fbwe3it3a-ue.a.run.app/
---

# 📸 Screenshots


```md
![Dashboard](https://raw.githubusercontent.com/rahulaleshwar/LogicLens-AI/refs/heads/master/images/landing.png)

![Assessment]()

![Report]()
```

---

# ✨ Features

- Google ADK Multi-Agent Architecture
- Gemini 2.5 Flash & Pro
- Passive Web Reconnaissance
- Technology Fingerprinting
- JavaScript Analysis
- API Discovery
- Authentication Analysis
- Business Logic Analysis
- Workflow Learning
- Collaborative Reasoning
- Evidence Validation
- Risk Scoring
- Professional Security Reports
- Modern React Dashboard

---

# 🏗 Architecture

```md
![Report]()

```

---

# 🤖 Multi-Agent Workflow

```mermaid
flowchart LR

Target --> Planner

Planner --> Recon
Planner --> Tech
Planner --> API
Planner --> JS
Planner --> Auth
Planner --> Logic

Recon --> Knowledge
Tech --> Knowledge
API --> Knowledge
JS --> Knowledge
Auth --> Knowledge
Logic --> Knowledge

Knowledge --> Risk
Risk --> Validation
Validation --> Report
```


---

# 🛠 Tech Stack

## Frontend

- ReactJS (JSX)
- Vite
- Tailwind CSS

## Backend

- FastAPI
- Python
- Uvicorn

## AI

- Google ADK
- Google Gemini API
- Google GenAI SDK
- Gemini 2.5 Flash
- Gemini 2.5 Pro

## Google Cloud

- Cloud Run
- Cloud Build
- Artifact Registry
- Cloud Storage

---

# 🚀 Installation

```bash
git clone https://github.com/<username>/LogicLens-AI.git

cd LogicLens-AI
```

## Backend

```bash
cd backend

python -m venv .venv

pip install -r requirements.txt

uvicorn app.main:app --reload
```

## Frontend

```bash
cd frontend

npm install

npm run dev
```

Open:

http://localhost:5173

Enter your Gemini API key in the UI.

---

# 🔑 Gemini API Key

Users provide their own Gemini API key from the frontend.

The backend does not permanently store the API key.

---

# 🐳 Docker

```bash
docker build -t logiclens-ai .

docker run -p 8000:8000 logiclens-ai
```

---

# ☁ Deploy to Cloud Run

```bash
gcloud builds submit

gcloud run deploy logiclens-ai
```

---

# 📊 Reports

Each assessment contains:

- Executive Summary
- Findings
- Risk Score
- Severity
- Confidence
- AI Reasoning
- Evidence
- Remediation

---

# 🙏 Acknowledgements

- Google ADK
- Google Gemini
- FastAPI
- React
- Docker
- Google Cloud

---

<p align="center">

**LogicLens AI**

AI-Powered Multi-Agent Web Application Security Assessment Platform

Built with ❤️ using Google ADK, Gemini 2.5, FastAPI, React and Google Cloud.

</p>
