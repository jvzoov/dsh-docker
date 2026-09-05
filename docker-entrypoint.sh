#!/bin/sh
set -eu

proxy_pid=
cleanup() {
  if [ -n "${proxy_pid:-}" ]; then
    kill "$proxy_pid" 2>/dev/null || true
    wait "$proxy_pid" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# The published host port forwards to DSH's loopback web server without
# weakening its bind address. DSH itself prints the official tokenized URL.
socat TCP-LISTEN:3080,bind=0.0.0.0,reuseaddr,fork TCP:127.0.0.1:3081 &
proxy_pid=$!

# DSH's startup URL is generated against the container-local web port. Rewrite
# only its display value so the copied URL reaches the published host port.
port="${DSH_PORT:-3080}"
display_url="${DSH_PUBLIC_URL:-http://localhost:${port}}"
display_url=${display_url%/}

trusted_args=
if [ -n "${DSH_TRUSTED_HOST:-}" ]; then
  trusted_args="--trusted-host $DSH_TRUSTED_HOST"
fi

set +e
# Keep startup diagnostics line-buffered so the tokenized URL is visible in
# `docker compose logs` immediately after the service becomes ready.
dsh web --no-open --port 3081 \
  --trusted-host "localhost:${port}" \
  --trusted-host "127.0.0.1:${port}" \
  $trusted_args "$@" 2>&1 | while IFS= read -r line; do
    printf '%s\n' "$line" | sed "s#http://127.0.0.1:3081#${display_url}#g"
  done
status=0
set -e
exit "$status"
