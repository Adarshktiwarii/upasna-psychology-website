#!/bin/bash
set -euo pipefail

rm -rf ./.amplify-hosting

mkdir -p ./.amplify-hosting/compute/default
mkdir -p ./.amplify-hosting/static

cp server.js package.json package-lock.json ./.amplify-hosting/compute/default/
cp -r ./node_modules ./.amplify-hosting/compute/default/node_modules

# Amplify Console env vars are available at build time; bake into compute bundle.
if [ -n "${RAZORPAY_KEY_ID:-}" ] && [ -n "${RAZORPAY_KEY_SECRET:-}" ]; then
  cat > ./.amplify-hosting/compute/default/.env <<EOF
RAZORPAY_KEY_ID=${RAZORPAY_KEY_ID}
RAZORPAY_KEY_SECRET=${RAZORPAY_KEY_SECRET}
EOF
  echo "Razorpay credentials written to compute bundle."
else
  echo "WARNING: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set during build."
fi

cp ./*.html favicon.ico manifest.json ./.amplify-hosting/static/
cp -r css js images ./.amplify-hosting/static/

cp deploy-manifest.json ./.amplify-hosting/deploy-manifest.json
