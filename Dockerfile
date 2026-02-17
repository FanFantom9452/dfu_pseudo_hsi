FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Generate self-signed certificate for HTTPS (required for camera on non-localhost)
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/* \
    && openssl req -x509 -newkey rsa:2048 -keyout /app/key.pem -out /app/cert.pem -days 365 -nodes \
       -subj "/CN=dfu-clinical-system"

COPY app/ app/

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "120", "--certfile", "/app/cert.pem", "--keyfile", "/app/key.pem", "app:create_app()"]
