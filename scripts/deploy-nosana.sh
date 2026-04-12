#!/bin/bash
# Deploy Sentinel Agent to Nosana GPU Network
# Requires: NOSANA_API_KEY environment variable

set -e

API_BASE="https://dashboard.k8s.prd.nos.ci/api"
API_KEY="${NOSANA_API_KEY:?Set NOSANA_API_KEY in your environment}"

MARKET="97G9NnvBDQ2WpKu6BGBEsFRF5MnujBBi9cSVPMnMFcEX"

echo "Creating Sentinel deployment on Nosana..."

RESPONSE=$(curl -s -X POST "$API_BASE/deployments" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "sentinel-agent",
    "market": "'$MARKET'",
    "timeout": 120,
    "replicas": 1,
    "strategy": "SIMPLE",
    "job_definition": '"$(cat nos_job_def/nosana_eliza_job_definition.json)"'
  }')

echo "Response: $RESPONSE"

DEPLOYMENT_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || echo "")

if [ -n "$DEPLOYMENT_ID" ]; then
  echo ""
  echo "Deployment created! ID: $DEPLOYMENT_ID"
  echo ""
  echo "Starting deployment..."
  
  START_RESPONSE=$(curl -s -X POST "$API_BASE/deployments/$DEPLOYMENT_ID/start" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json")
  
  echo "Start response: $START_RESPONSE"
  echo ""
  echo "Check status at: https://deploy.nosana.com"
  echo "Or via API: curl -H 'Authorization: Bearer \$NOSANA_API_KEY' $API_BASE/deployments/$DEPLOYMENT_ID"
else
  echo "Failed to create deployment. Check your API key and credit balance."
fi
