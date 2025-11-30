# ./prelude-user-settings/Dockerfile

# --- Stage 1: Builder (Installs dependencies in a virtual environment) ---
FROM python:3.12-slim as builder

# Set the working directory for the builder stage
WORKDIR /app/build

# --- Install build dependencies ---
RUN apt-get update && \
    apt-get install -y git python3-venv && \
    rm -rf /var/lib/apt/lists/*

# --- Create a virtual environment and install dependencies into it ---
RUN python3 -m venv /opt/venv

# Copy requirements
COPY requirements.txt .

# Install dependencies
RUN . /opt/venv/bin/activate && pip install --no-cache-dir -r requirements.txt

# --- Stage 2: Final Runtime (Uses the virtual environment, does NOT include git) ---
FROM python:3.12-slim

# --- Install Tini in the final stage ---
RUN apt-get update && apt-get install -y tini && rm -rf /var/lib/apt/lists/*

# --- Optional: Create and switch to a non-root user ---
RUN adduser --system --no-create-home appuser
USER appuser

# --- Copy ONLY the created virtual environment from the builder stage ---
COPY --from=builder /opt/venv /opt/venv

# Set the final working directory for the application
WORKDIR /app/prelude-user-settings

# Copy the application source code
COPY . .

# --- Set PATH to include the virtual environment's bin directory ---
ENV PATH="/opt/venv/bin:$PATH"

# --- Use Tini as ENTRYPOINT ---
ENTRYPOINT ["/usr/bin/tini", "--"]

# CMD to run your application using main.py
# The shell will interpret ${PORT:-8080} using the PORT env var provided by Cloud Run (which is 8080).
CMD python main.py

# EXPOSE the port
EXPOSE 8080