#!/bin/sh
set -e

# Create persistent directories (HF Spaces provides /data as persistent volume)
# Fall back to local directory if /data is not available
if [ -d "/data" ] && [ -w "/data" ]; then
    echo "Using persistent storage at /data"
    mkdir -p /data/logs
    export DATABASE_URL="sqlite:////data/farmhelp.db"
    export LOG_FILE="/data/logs/app.log"
else
    echo "Persistent storage not available, using ephemeral storage"
    mkdir -p /app/backend/logs
    export DATABASE_URL="sqlite:////app/backend/farmhelp.db"
    export LOG_FILE="/app/backend/logs/app.log"
fi

# Initialize database and load data
echo "Initializing database..."
python init_db.py

echo "Loading government schemes..."
python -m app.scripts.populate_schemes

echo "Seeding additional data..."
python seed_data.py || true

echo "Starting server on port ${PORT:-7860}..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}
