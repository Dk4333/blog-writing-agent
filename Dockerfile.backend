FROM python:3.11-slim

WORKDIR /app

# Install system deps for psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps first (layer cache)
COPY requirements.txt .
# Replace editable install with direct src copy
RUN pip install --no-cache-dir $(grep -v '^-e' requirements.txt | grep -v '^#' | grep -v '^$')

# Copy source
COPY src/ ./src/
COPY pyproject.toml .
RUN pip install --no-cache-dir --no-deps -e .

EXPOSE 8000

CMD ["uvicorn", "blog_agent.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
