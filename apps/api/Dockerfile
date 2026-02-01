FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Railway uses PORT environment variable
ENV PORT=8000
EXPOSE 8000

# Run the application with shell to expand $PORT
CMD ["/bin/sh", "-c", "uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
