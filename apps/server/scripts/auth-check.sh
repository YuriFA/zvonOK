#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-"http://localhost:3000"}
EMAIL=${EMAIL:-"test$(date +%s)@example.com"}
USERNAME=${USERNAME:-"user$(date +%s)"}
PASSWORD=${PASSWORD:-"Password123"}
COOKIE_JAR=${COOKIE_JAR:-"/tmp/webrtc-auth-cookies.txt"}
WAIT_ACCESS_EXPIRY_SECONDS=${WAIT_ACCESS_EXPIRY_SECONDS:-""}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_cmd curl
require_cmd jq
require_cmd grep

echo "Base URL: $BASE_URL"
echo "Cookie jar: $COOKIE_JAR"

rm -f "$COOKIE_JAR"

echo "\n[1/9] Register"
register_response=$(curl -sS -i -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -c "$COOKIE_JAR" \
  -d "{\"email\":\"$EMAIL\",\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

echo "$register_response" | sed -n '1,5p'

echo "Checking Set-Cookie flags for register response"
if ! echo "$register_response" | grep -qi "Set-Cookie: access_token=.*HttpOnly"; then
  echo "Missing HttpOnly on access_token" >&2
  exit 1
fi

if ! echo "$register_response" | grep -qi "Set-Cookie: refresh_token=.*HttpOnly"; then
  echo "Missing HttpOnly on refresh_token" >&2
  exit 1
fi

echo "\n[2/9] Login"
login_response=$(curl -sS -i -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -c "$COOKIE_JAR" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

access_token=$(echo "$login_response" | awk 'BEGIN{p=0} /^\r?$/{p=1;next} p==1{print}' | jq -r '.accessToken')

if [[ -z "$access_token" || "$access_token" == "null" ]]; then
  echo "Failed to extract accessToken from login response" >&2
  exit 1
fi

echo "Login OK, accessToken extracted"

echo "Checking Set-Cookie flags for login response"
if ! echo "$login_response" | grep -qi "Set-Cookie: access_token=.*HttpOnly"; then
  echo "Missing HttpOnly on access_token" >&2
  exit 1
fi

if ! echo "$login_response" | grep -qi "Set-Cookie: refresh_token=.*HttpOnly"; then
  echo "Missing HttpOnly on refresh_token" >&2
  exit 1
fi

echo "\n[3/9] Refresh with cookie (rotation)"
old_refresh_token=$(awk '/\trefresh_token\t/ {print $7}' "$COOKIE_JAR" | tail -n 1)
if [[ -z "$old_refresh_token" ]]; then
  echo "Failed to read refresh_token from cookie jar" >&2
  exit 1
fi

refresh_cookie_response=$(curl -sS -i -X POST "$BASE_URL/auth/refresh-token" \
  -b "$COOKIE_JAR" -c "$COOKIE_JAR")

echo "$refresh_cookie_response" | sed -n '1,5p'

echo "Checking Set-Cookie flags for refresh response"
if ! echo "$refresh_cookie_response" | grep -qi "Set-Cookie: access_token=.*HttpOnly"; then
  echo "Missing HttpOnly on access_token" >&2
  exit 1
fi

if ! echo "$refresh_cookie_response" | grep -qi "Set-Cookie: refresh_token=.*HttpOnly"; then
  echo "Missing HttpOnly on refresh_token" >&2
  exit 1
fi

echo "\n[4/9] Refresh with Bearer"
refresh_bearer_response=$(curl -sS -i -X POST "$BASE_URL/auth/refresh-token" \
  -H "Authorization: Bearer $access_token")

echo "$refresh_bearer_response" | sed -n '1,5p'

echo "\n[5/9] Refresh reuse detection (should be 401)"
reuse_response=$(curl -sS -i -X POST "$BASE_URL/auth/refresh-token" \
  -H "Cookie: refresh_token=$old_refresh_token")
reuse_status=$(echo "$reuse_response" | head -n 1)
echo "$reuse_status"

if echo "$reuse_status" | grep -q "401" && echo "$reuse_response" | grep -q "REFRESH_REUSE_DETECTED"; then
  echo "Reuse detection OK"
else
  echo "Expected 401 REFRESH_REUSE_DETECTED, got: $reuse_status" >&2
  exit 1
fi

if [[ -n "$WAIT_ACCESS_EXPIRY_SECONDS" ]]; then
  echo "\n[6/9] Wait for access token expiry: ${WAIT_ACCESS_EXPIRY_SECONDS}s"
  sleep "$WAIT_ACCESS_EXPIRY_SECONDS"

  echo "\n[7/9] Logout with expired access token (should be 401)"
  expired_logout=$(curl -sS -i -X POST "$BASE_URL/auth/logout" -b "$COOKIE_JAR")
  expired_status=$(echo "$expired_logout" | head -n 1)
  echo "$expired_status"

  if ! echo "$expired_status" | grep -q "401"; then
    echo "Expected 401 after access token expiry, got: $expired_status" >&2
    exit 1
  fi
fi

echo "\n[8/9] Logout (requires access token cookie)"
logout_response=$(curl -sS -i -X POST "$BASE_URL/auth/logout" -b "$COOKIE_JAR")
echo "$logout_response" | sed -n '1,5p'

echo "\n[9/9] Refresh after logout (should be 401)"
refresh_after_logout=$(curl -sS -i -X POST "$BASE_URL/auth/refresh-token" \
  -b "$COOKIE_JAR")

status_line=$(echo "$refresh_after_logout" | head -n 1)
echo "$status_line"

if echo "$status_line" | grep -q "401"; then
  echo "Refresh after logout correctly returned 401"
else
  echo "Expected 401 after logout, got: $status_line" >&2
  exit 1
fi

echo "\nDone."
