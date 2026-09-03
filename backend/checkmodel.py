import boto3

# Initialize the Rekognition client
client = boto3.client('rekognition', region_name='ap-southeast-2')

response = client.describe_project_versions(
    ProjectArn='arn:aws:rekognition:ap-southeast-2:936274645076:project/BE-SMART-Dummy-Model'
)

for version in response.get('ProjectVersionDescriptionStatuses', []):
    print(f"Version: {version['VersionName']}")
    print(f"Status: {version['Status']}")
    print("-" * 30)