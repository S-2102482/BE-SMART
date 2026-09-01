# backend/main.py
#
# A small FastAPI backend that:
#   1. Receives an uploaded photo from the Expo app
#   2. Uploads it to S3
#   3. Calls AWS Rekognition to classify it
#   4. Returns { "verdict": "full" | "not full" }
#
# This same logic can later be lifted almost as-is into an AWS Lambda
# function behind API Gateway -- for now it runs as a normal local server
# so you can develop against it easily.

import os
import uuid
import boto3
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# ---- Configuration (fill these in, or set as environment variables) ----
AWS_REGION = os.environ.get("AWS_REGION", "ap-southeast-2")
S3_BUCKET = os.environ.get("S3_BUCKET", "besmart-resident-uploads-2026")
REKOGNITION_PROJECT_VERSION_ARN = os.environ.get(
    "REKOGNITION_PROJECT_VERSION_ARN",
    "arn:aws:rekognition:ap-southeast-2:936274645076:project/BE-SMART-Dummy-Model/version/BE-SMART-Dummy-Model.2026-08-19T13.15.30/1787116532693",
)
CONFIDENCE_THRESHOLD = 70

# boto3 will automatically pick up credentials from environment variables,
# an AWS profile, or (once deployed) the Lambda execution role. Do NOT
# hardcode access keys here.
s3 = boto3.client("s3", region_name=AWS_REGION)
rekognition = boto3.client("rekognition", region_name=AWS_REGION)

app = FastAPI()

# Allow the Expo app (phone + web) to call this API during development.
# Lock this down to your real domain(s) before going to production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/analyze")
async def analyze(photo: UploadFile = File(...)):
    """
    Accepts a multipart/form-data upload with field name "photo".
    Returns: { "verdict": "full" | "not full", "s3_key": "..." }
    """
    try:
        image_bytes = await photo.read()
        s3_key = f"captures/{uuid.uuid4()}.jpg"

        s3.put_object(Bucket=S3_BUCKET, Key=s3_key, Body=image_bytes, ContentType="image/jpeg")

        verdict = classify_fullness(s3_key)

        return {"verdict": verdict, "s3_key": s3_key}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


def classify_fullness(s3_key: str) -> str:
    """
    Calls Rekognition Custom Labels against the uploaded image.
    Expects your trained model to output a label named "Full".
    """
    response = rekognition.detect_custom_labels(
        Image={"S3Object": {"Bucket": S3_BUCKET, "Name": s3_key}},
        ProjectVersionArn=REKOGNITION_PROJECT_VERSION_ARN,
        MinConfidence=CONFIDENCE_THRESHOLD,
    )

    labels = response.get("CustomLabels", [])
    is_full = any(
        label["Name"].lower() == "full" and label["Confidence"] >= CONFIDENCE_THRESHOLD
        for label in labels
    )

    return "full" if is_full else "not full"

    # --- Alternative using plain DetectLabels (no custom model) ---
    # response = rekognition.detect_labels(
    #     Image={"S3Object": {"Bucket": S3_BUCKET, "Name": s3_key}},
    #     MaxLabels=10,
    #     MinConfidence=CONFIDENCE_THRESHOLD,
    # )
    # is_full = any(
    #     l["Name"].lower() == "full" and l["Confidence"] >= CONFIDENCE_THRESHOLD
    #     for l in response["Labels"]
    # )
    # return "full" if is_full else "not full"


@app.get("/health")
def health():
    return {"status": "ok"}
