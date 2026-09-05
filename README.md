# dsh-docker

Docker template for running the DeepSeek Harness Web UI. [简体中文](README.zh.md)

## Quickstart

```sh
cp .env.example .env
docker compose up -d
```

The container prints an official DSH startup URL containing a one-time token. Open that URL once to exchange the token for a browser session cookie. After the redirect, use the clean URL normally.

Open <http://localhost:3080> only when running locally; use the tokenized URL printed by `docker compose logs dsh` for the first visit.

Stop the service with:

```sh
docker compose down
```

## Local data and live configuration

- `config/` is mounted at `/dsh-home` and stores Harness state, credentials, and user configuration.
- `workspace/` is mounted at `/home/node`, the Web UI's default workspace location; set `DSH_WORKSPACE` in `.env` to use another host directory.
- `dsh plugin` manages profile plugins through pnpm, which is bundled in the image.

Configure provider settings after startup through the Web UI. DSH watches user configuration and credential files under `config/`; changes apply to subsequent requests without restarting the container.

## DSH updates

Every `docker compose up` rebuilds the `dsh` service and installs `@deepseek-ai/dsh@latest`. The build requires npm registry access and may take longer than reusing an existing image. The image applies a guarded compatibility patch to the browser client so the authenticated reverse proxy can expose the settings document. The patch fails the build when the upstream client shape changes and requires a deliberate compatibility review.

## Public deployment

Public deployment requires a DNS record, a TLS certificate, Nginx, and a reverse proxy. Do not expose the Docker port directly to the Internet.

Set the public authority and the URL that should be printed for the first browser visit in `.env`:

```env
DSH_PORT=3080
DSH_PUBLIC_URL=https://dsh.example.com
DSH_TRUSTED_HOST=dsh.example.com
```

Start DSH and keep its port bound to localhost:

```sh
docker compose up -d
docker compose logs dsh
```

Copy the `dsh web:` URL from the logs and open it through the public HTTPS address. DSH exchanges its one-time token for an authority-bound, signed browser-session cookie. No separate login service or `htpasswd` file is required.

Use [`nginx/dsh.conf.example`](nginx/dsh.conf.example) as the reverse-proxy starting point, then set its `server_name`, TLS certificate paths, and HTTPS listener. Render the backend port from `.env`:

```sh
./scripts/render-nginx-conf.sh | sudo tee /etc/nginx/sites-available/dsh.conf
sudo nginx -t
sudo systemctl reload nginx
```

The proxy must preserve the public authority for both `Host` and `Origin`. DSH rejects mismatched or untrusted authorities with `403`; a trusted request without the official browser cookie returns `401`.

The public URL is then `https://dsh.example.com`.
