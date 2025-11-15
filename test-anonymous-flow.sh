#!/bin/bash

# Test script for anonymous generation flow
echo "Testing Anonymous Generation Flow"
echo "================================="

BASE_URL="http://localhost:5000"

# Test 1: Check initial rate limit
echo -e "\n1. Checking initial rate limit..."
RATE_LIMIT=$(curl -s "$BASE_URL/api/check-rate-limit")
echo "Rate limit status: $RATE_LIMIT"

# Test 2: Create a generation session without authentication
echo -e "\n2. Creating anonymous generation session (1/3)..."
SESSION_RESPONSE=$(curl -s -X POST "$BASE_URL/api/sambanova/stream" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Create a simple landing page", "existingFiles": "", "previousPrompts": ""}')
echo "Session response: $SESSION_RESPONSE"

# Extract sessionId if available
SESSION_ID=$(echo "$SESSION_RESPONSE" | grep -o '"sessionId":"[^"]*' | cut -d'"' -f4)
if [ ! -z "$SESSION_ID" ]; then
  echo "Session created successfully: $SESSION_ID"
else
  echo "Failed to create session"
fi

# Test 3: Check rate limit after first generation
echo -e "\n3. Checking rate limit after first generation..."
RATE_LIMIT=$(curl -s "$BASE_URL/api/check-rate-limit")
echo "Rate limit status: $RATE_LIMIT"

# Test 4: Try another generation (2/3)
echo -e "\n4. Creating second anonymous generation session (2/3)..."
SESSION_RESPONSE=$(curl -s -X POST "$BASE_URL/api/cerebras/stream" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Create a portfolio website", "existingFiles": "", "previousPrompts": ""}')
SESSION_ID=$(echo "$SESSION_RESPONSE" | grep -o '"sessionId":"[^"]*' | cut -d'"' -f4)
if [ ! -z "$SESSION_ID" ]; then
  echo "Second session created: $SESSION_ID"
else
  echo "Failed to create second session"
fi

# Test 5: Check rate limit after second generation
echo -e "\n5. Checking rate limit after second generation..."
RATE_LIMIT=$(curl -s "$BASE_URL/api/check-rate-limit")
echo "Rate limit status: $RATE_LIMIT"

# Test 6: Try third generation (3/3)
echo -e "\n6. Creating third anonymous generation session (3/3)..."
SESSION_RESPONSE=$(curl -s -X POST "$BASE_URL/api/sambanova/stream" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Create a blog website", "existingFiles": "", "previousPrompts": ""}')
SESSION_ID=$(echo "$SESSION_RESPONSE" | grep -o '"sessionId":"[^"]*' | cut -d'"' -f4)
if [ ! -z "$SESSION_ID" ]; then
  echo "Third session created: $SESSION_ID"
else
  echo "Failed to create third session"
fi

# Test 7: Check rate limit after third generation (should be 0)
echo -e "\n7. Checking rate limit after third generation..."
RATE_LIMIT=$(curl -s "$BASE_URL/api/check-rate-limit")
echo "Rate limit status: $RATE_LIMIT"

# Test 8: Try fourth generation (should fail with 429)
echo -e "\n8. Attempting fourth generation (should fail)..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/sambanova/stream" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Create another website", "existingFiles": "", "previousPrompts": ""}')
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')
echo "HTTP Status: $HTTP_STATUS"
echo "Response: $BODY"

if [ "$HTTP_STATUS" = "429" ]; then
  echo "✓ Rate limiting is working correctly!"
else
  echo "✗ Rate limiting test failed"
fi

echo -e "\n================================="
echo "Test completed!"