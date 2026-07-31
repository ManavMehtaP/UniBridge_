# UniBridge

<p align="center">
  <h3 align="center">🎓 Makes University Life Easy</h3>
  <p align="center">
    A comprehensive university management platform designed to simplify academic administration and enhance the experience of students, faculty, HODs, and the university ecosystem through modern web technologies and AI-powered features.
  </p>
</p>

---

## 📖 Table of Contents

- [About](#-about)
- [Key Features](#-key-features)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [AI Capabilities](#-ai-capabilities)
- [Deployment](#-deployment)
- [Contributors](#-contributors)
- [Future Roadmap](#-future-roadmap)

---

# 📌 About

UniBridge is an all-in-one university management platform built to bridge the gap between students, faculty members, HODs, and university administration.

From academic management to AI-assisted learning, UniBridge provides a centralized platform that streamlines university operations while improving productivity and accessibility for everyone involved.

The project is production-ready and actively evolving with new features and continuous improvements.

---

# ✨ Key Features

## 👨‍🎓 Student Portal

- Student Dashboard
- Attendance Tracking
- Academic Performance
- Result Management
- Semester Progress
- Subject Management
- Study Planner
- AI Assistant
- Personalized Learning
- Notes Management
- Previous Year Question Analysis
- Marks Prediction
- Academic Insights

---

## 👩‍🏫 Faculty Portal

- Course Management
- Student Monitoring
- Notes Upload
- Attendance Management
- Academic Analytics
- AI-assisted Educational Tools

---

## 🏛️ HOD & Administration

- Department Management
- Faculty Management
- Student Management
- Reports & Analytics
- Semester Management
- Promotion of students between semesters
- Centralized Academic Control

---

## 🤖 AI Powered Features

- AI Academic Assistant
- Subject-specific AI Chat
- Smart Study Planner
- Marks Prediction
- Previous Year Question Analysis
- OCR-based Notes Processing
- Intelligent Academic Insights
- AI-powered Learning Assistance
- Multi-model AI Support

---

# 🛠 Technology Stack

## Frontend

- React
- Vite
- TypeScript

## Backend

- Node.js
- Django

## Database

- PostgreSQL
- Prisma ORM

## AI Stack

- FreeLLMAPI
- Gemini
- Multiple LLM Providers

## Containerization

- Docker
- Docker Compose

---

# 📂 Project Structure

```text
UniBridge_
│
├── Frontend/
│   ├── React
│   ├── TypeScript
│   └── Vite
│
├── Backend/
│   └── Node.js Backend
│
└── AI Assistant/
    ├── Django AI Assistant/
    └── FreeLLMAPI/
```

---

# 🚀 Getting Started

## Clone Repository

```bash
git clone https://github.com/ManavMehtaP/UniBridge_.git

cd UniBridge_
```

---

## Run with Docker

Simply execute:

```bash
docker compose up
```

Docker will handle the required services and dependencies.

---

# ⚙ Environment Variables

Create the necessary `.env` files before running the application.

Example variables:

```env
DATABASE_URL=

FREELLMAPI_API_KEY=

FREELLMAPI_BASE_URL=

DJANGO_SECRET_KEY=

DJANGO_ALLOWED_HOSTS=

DJANGO_DEBUG=

POSTGRES_USER=

POSTGRES_PASSWORD=

POSTGRES_DB=

POSTGRES_HOST=

POSTGRES_PORT=
```

Additional environment variables may be required depending on the deployment configuration and selected AI providers.

---

# 🤖 AI Capabilities

UniBridge integrates multiple Large Language Models through FreeLLMAPI to provide intelligent educational assistance.

Current AI capabilities include:

- AI Chat Assistant
- Multi-model Support
- OCR Processing
- Smart Note Analysis
- Personalized Learning Assistance
- Previous Year Question Analysis
- Marks Prediction
- Intelligent Academic Recommendations

The architecture allows easy integration of additional AI models in the future.

---

# 🎯 Mission

UniBridge aims to make university life easier for:

- Students
- Faculty Members
- Heads of Departments
- University Administration

By combining automation, centralized management, and AI-powered educational tools, UniBridge helps reduce manual effort while improving the overall academic experience.

One of its primary goals is enabling effortless management and promotion of students across semesters while maintaining an efficient academic workflow for every stakeholder.

---

# 🚀 Deployment

The project is production-ready and supports deployment using Docker-based infrastructure.

---

# 👥 Contributors

- [@ManavMehtaP](https://github.com/ManavMehtaP)
- [@AagamShah0312](https://github.com/AagamShah0312)
- [@Kavy522](https://github.com/Kavy522)

---

# 🛣 Future Roadmap

- More AI-powered academic tools
- Enhanced analytics and dashboards
- Additional LLM integrations
- Improved OCR capabilities
- Advanced recommendation systems
- Performance optimizations
- Feature enhancements based on user feedback

---

# ⭐ Support

If you find this project useful, consider giving it a ⭐ on GitHub.

Your support motivates us to continue improving UniBridge.
