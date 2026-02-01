FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Make start script executable
RUN chmod +x start.sh

# Railway uses PORT environment variable
ENV PORT=8000
EXPOSE 8000

# Run the application
ENTRYPOINT ["./start.sh"]
