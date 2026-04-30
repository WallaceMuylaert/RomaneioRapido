FROM python:3.12-slim

WORKDIR /app

COPY /backend/requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/

ENV TESTING=1
ENV SECRET_KEY=test_secret_key_only_for_build
ENV DATABASE_URL=sqlite:///./ci_test.sqlite
RUN for test_file in backend/tests/test_*.py; do \
        echo "Running ${test_file}" && python -m pytest "${test_file}" -v; \
    done
ENV TESTING=0

CMD ["uvicorn", "backend.server:app", "--host", "0.0.0.0", "--port", "8002", "--reload"]
