FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    BIOCLIP_DEVICE=auto \
    BIOCLIP_FALLBACK_MODE=auto

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

COPY cmi_species_model ./cmi_species_model
COPY catalog ./catalog

EXPOSE 8000

CMD ["uvicorn", "cmi_species_model.app:app", "--host", "0.0.0.0", "--port", "8000"]
