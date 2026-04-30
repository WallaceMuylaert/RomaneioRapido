FROM python:3.12-slim

WORKDIR /app

COPY /backend/requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/

ENV TESTING=1
ENV SECRET_KEY=test_secret_key_only_for_build
ENV DATABASE_URL=sqlite:///:memory:
RUN python -m pytest backend/tests/test_routes.py backend/tests/test_security_isolation.py -v
ENV TESTING=0

CMD ["uvicorn", "backend.server:app", "--host", "0.0.0.0", "--port", "8002", "--reload"]
