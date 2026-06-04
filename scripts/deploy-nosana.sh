#!/bin/bash
# Deploy Sentinel Agent to Nosana GPU Network
# Requires: NOSANA_API_KEY environment variable

set -e

API_BASE="https://dashboard.k8s.prd.nosana.com/api"
API_KEY="${NOSANA_API_KEY:?Set NOSANA_API_KEY in your environment}"

MARKET="31P9d5ahEY9iSmZuXJ2xwJsbRztFK5AUCdkvgziUM3vn"

echo "Creating Sentinel deployment on Nosana..."

RESPONSE_FILE=$(mktemp)
HTTP_STATUS=$(curl -s -o "$RESPONSE_FILE" -w "%{http_code}" -X POST "$API_BASE/deployments" \
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

echo "Create response: HTTP $HTTP_STATUS; body omitted ($(wc -c < "$RESPONSE_FILE" | tr -d ' ') bytes)"

DEPLOYMENT_ID=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1])).get('id',''))" "$RESPONSE_FILE" 2>/dev/null || echo "")
rm -f "$RESPONSE_FILE"

if [ -n "$DEPLOYMENT_ID" ]; then
  echo ""
  echo "Deployment created! ID: $DEPLOYMENT_ID"
  echo ""
  echo "Starting deployment..."
  
  START_RESPONSE_FILE=$(mktemp)
  START_HTTP_STATUS=$(curl -s -o "$START_RESPONSE_FILE" -w "%{http_code}" -X POST "$API_BASE/deployments/$DEPLOYMENT_ID/start" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json")
  
  echo "Start response: HTTP $START_HTTP_STATUS; body omitted ($(wc -c < "$START_RESPONSE_FILE" | tr -d ' ') bytes)"
  rm -f "$START_RESPONSE_FILE"
  echo ""
  echo "Check status at: https://deploy.nosana.com"
  echo "Or via API: curl -H 'Authorization: Bearer \$NOSANA_API_KEY' $API_BASE/deployments/$DEPLOYMENT_ID"
else
  echo "Failed to create deployment. Check your API key and credit balance."
fi
