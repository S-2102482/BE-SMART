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
from dotenv import load_dotenv # or just load_dotenv
load_dotenv()  # Loads variables from .env into os.environ

import os
import uuid
import logging

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("bin-analyzer")

# ---- Configuration (fill these in, or set as environment variables) ----
AWS_REGION = os.environ.get("AWS_REGION", "ap-southeast-2")
S3_BUCKET = os.environ.get("S3_BUCKET", "besmart-resident-uploads-2026")
REKOGNITION_PROJECT_VERSION_ARN = os.environ.get(
    "REKOGNITION_PROJECT_VERSION_ARN",
    "arn:aws:rekognition:ap-southeast-2:936274645076:project/BE-SMART-Dummy-Model/version/BE-SMART-Dummy-Model.2026-08-19T13.15.30/1787116532693",
)
CONFIDENCE_THRESHOLD = 70

# boto3's defaults (60s connect + 60s read, per call) mean a flaky AWS
# connection on the server side can hang the request for a long time —
# and this endpoint makes two AWS calls back to back (S3 then Rekognition),
# so worst case that stacks. Fail fast instead: a healthy call to S3 or
# Rekognition normally completes in well under a second.
AWS_CLIENT_CONFIG = Config(
    connect_timeout=5,
    read_timeout=45,
    retries={"max_attempts": 2, "mode": "standard"},
)

# boto3 will automatically pick up credentials from environment variables,
# an AWS profile, or (once deployed) the Lambda/ECS execution role. Do NOT
# hardcode access keys here.
s3 = boto3.client("s3", region_name=AWS_REGION, config=AWS_CLIENT_CONFIG)
rekognition = boto3.client("rekognition", region_name=AWS_REGION, config=AWS_CLIENT_CONFIG)

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

    Any failure here (bad upload, S3 error, Rekognition error, model not
    running, network timeout to AWS, etc.) raises an HTTPException so the
    client gets a clean non-2xx response instead of a payload that looks
    successful or a request that hangs.
    """
    if photo.content_type not in ("image/jpeg", "image/png", "image/jpg"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {photo.content_type}",
        )

    image_bytes = await photo.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty photo upload")

    s3_key = f"captures/{uuid.uuid4()}.jpg"

    try:
        s3.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=image_bytes,
            ContentType="image/jpeg",
        )
    except ClientError as e:
        logger.exception("S3 upload failed for key %s", s3_key)
        raise HTTPException(
            status_code=502,
            detail=f"Could not store photo: {e.response['Error']['Message']}",
        )
    except Exception:
        # Covers connect/read timeouts (EndpointConnectionError etc.), which
        # aren't ClientErrors — this is the "server can't reach AWS" case.
        logger.exception("Network error reaching S3 for key %s", s3_key)
        raise HTTPException(
            status_code=503,
            detail="Could not reach storage right now. Please try again shortly.",
        )

    try:
        verdict = classify_fullness(s3_key)
    except HTTPException:
        # already a clean, specific error — let it propagate as-is
        raise
    except Exception as e:
        logger.exception("Unexpected error analyzing key %s", s3_key)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

    return {"verdict": verdict, "s3_key": s3_key}


def classify_fullness(s3_key: str) -> str:
    """
    Calls Rekognition Custom Labels against the uploaded image.
    Expects your trained model to output a label named "Full".
    """
    logger.info("Attempting to call AWS Rekognition for image: %s", s3_key)
    logger.info("Using Project Version ARN: %s", REKOGNITION_PROJECT_VERSION_ARN)

    try:
        response = rekognition.detect_custom_labels(
            Image={"S3Object": {"Bucket": S3_BUCKET, "Name": s3_key}},
            ProjectVersionArn=REKOGNITION_PROJECT_VERSION_ARN,
            MinConfidence=CONFIDENCE_THRESHOLD,
        )
        logger.info("Successfully received response from AWS Rekognition.")
        
    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        error_message = e.response["Error"]["Message"]
        
        logger.error(f"AWS ClientError [{error_code}]: {error_message}")

        if error_code == "ResourceNotReadyException":
            raise HTTPException(
                status_code=503,
                detail="The bin-detection model is currently offline or still starting up.",
            )
        elif error_code == "AccessDeniedException":
            raise HTTPException(
                status_code=500,
                detail="AWS Access Denied. Check your IAM permissions for Rekognition.",
            )
        elif error_code == "ThrottlingException":
            raise HTTPException(
                status_code=503,
                detail="AWS Rekognition is throttling requests. Please try again shortly.",
            )
        elif error_code == "InvalidImageFormatException":
            raise HTTPException(
                status_code=400,
                detail="The image format could not be processed by Rekognition.",
            )
        else:
            raise HTTPException(
                status_code=502,
                detail=f"AWS Error ({error_code}): {error_message}",
            )
            
    except Exception as e:
        # This catches network drops, DNS failures, and connection timeouts
        logger.exception("CRITICAL: Failed to connect to AWS Rekognition service.")
        raise HTTPException(
            status_code=503,
            detail=f"Network error connecting to AWS Rekognition: {str(e)}",
        )

    labels = response.get("CustomLabels", [])
    logger.info(f"Detected custom labels: {labels}")
    
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