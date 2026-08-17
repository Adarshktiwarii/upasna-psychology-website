#!/bin/bash
# Creates the DynamoDB table used to track paid-but-not-yet-booked sessions.
# Run once with AWS CLI configured for your Amplify account/region.

set -euo pipefail

TABLE_NAME="${BOOKINGS_TABLE_NAME:-heyupasna-bookings}"
AWS_REGION="${AWS_REGION:-ap-south-1}"

echo "Creating DynamoDB table: ${TABLE_NAME} in ${AWS_REGION}"

aws dynamodb create-table \
  --table-name "${TABLE_NAME}" \
  --attribute-definitions AttributeName=payment_id,AttributeType=S \
  --key-schema AttributeName=payment_id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "${AWS_REGION}"

aws dynamodb wait table-exists --table-name "${TABLE_NAME}" --region "${AWS_REGION}"

aws dynamodb update-time-to-live \
  --table-name "${TABLE_NAME}" \
  --time-to-live-specification "Enabled=true, AttributeName=expires_at" \
  --region "${AWS_REGION}"

echo "Done. Add BOOKINGS_TABLE_NAME=${TABLE_NAME} to Amplify environment variables."
echo "Also attach dynamodb:GetItem and dynamodb:PutItem on this table to your Amplify compute IAM role."
