# Production image for the UniBridge Django AI assistant (Render).
# Uses gunicorn (added to requirements.txt) and binds Render's injected $PORT.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
  && pip install --no-cache-dir -r requirements.txt

COPY . .

# Static files for Django admin (served by whitenoise once DEBUG=False).
RUN python manage.py collectstatic --noinput || true

EXPOSE 8000

# Shell form so ${PORT} expands. Long timeout: LLM calls are slow.
CMD gunicorn unibridge_ai.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --threads 4 --timeout 180
