#!/bin/bash
set -euo pipefail

rm -rf ./.amplify-hosting

mkdir -p ./.amplify-hosting/compute/default
mkdir -p ./.amplify-hosting/static

cp server.js package.json package-lock.json ./.amplify-hosting/compute/default/
cp -r ./node_modules ./.amplify-hosting/compute/default/node_modules

cp ./*.html favicon.ico manifest.json ./.amplify-hosting/static/
cp -r css js images ./.amplify-hosting/static/

cp deploy-manifest.json ./.amplify-hosting/deploy-manifest.json
