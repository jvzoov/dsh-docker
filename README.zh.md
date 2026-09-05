# dsh-docker

用于运行 DeepSeek Harness Web UI 的 Docker 模板。[English](README.md)

## 快速启动

```sh
cp .env.example .env
docker compose up -d
```

容器会打印包含一次性令牌的官方 DSH 启动 URL。首次访问时打开这个 URL，DSH 会将令牌交换为浏览器会话 Cookie；重定向后即可正常使用干净 URL。

本地运行时可打开 <http://localhost:3080>；首次访问应使用 `docker compose logs dsh` 打印的带令牌 URL。

停止服务：

```sh
docker compose down
```

## 本地数据与实时配置

- `config/` 挂载到容器内的 `/dsh-home`，保存 Harness 状态、凭据和用户配置。
- `workspace/` 挂载到容器内的 `/home/node`，这是 Web UI 默认的工作区位置；在 `.env` 中设置 `DSH_WORKSPACE` 可改用其他宿主目录。
- `dsh plugin` 通过镜像内置的 pnpm 管理 profile 插件。

启动后，通过 Web UI 配置提供方。DSH 会监视 `config/` 下的用户配置和凭据文件；修改后会作用于后续请求，不需要重启容器。

## DSH 更新

每次执行 `docker compose up` 时，Compose 都会重新构建 `dsh` 服务并安装 `@deepseek-ai/dsh@latest`。构建需要访问 npm registry，可能比复用已有镜像耗时更长。镜像会为浏览器客户端应用受保护的兼容补丁，使经过认证的反向代理能够使用设置文档；如果上游客户端结构发生变化，补丁会让构建失败，必须先完成兼容性审查。

## 公网部署

公网部署需要 DNS 记录、TLS 证书、Nginx 和反向代理。不要将 Docker 端口直接暴露到公网。

在 `.env` 中设置公网 authority，以及首次浏览器访问时应打印的 URL：

```env
DSH_PORT=3080
DSH_PUBLIC_URL=https://dsh.example.com
DSH_TRUSTED_HOST=dsh.example.com
```

启动 DSH，并保持宿主端口只监听本机：

```sh
docker compose up -d
docker compose logs dsh
```

从日志中复制 `dsh web:` URL，并通过公网 HTTPS 地址打开。DSH 会将一次性令牌交换为绑定公网 authority 的签名浏览器会话 Cookie。不需要额外的登录服务或 `htpasswd` 文件。

以 [`nginx/dsh.conf.example`](nginx/dsh.conf.example) 为反向代理起点，设置 `server_name`、TLS 证书路径和 HTTPS 监听器，然后从 `.env` 渲染后端端口：

```sh
./scripts/render-nginx-conf.sh | sudo tee /etc/nginx/sites-available/dsh.conf
sudo nginx -t
sudo systemctl reload nginx
```

代理必须为 `Host` 和 `Origin` 保留公网 authority。authority 不匹配或不受信任时，DSH 返回 `403`；请求受信但没有官方浏览器 Cookie 时，DSH 返回 `401`。

最终公网地址为 `https://dsh.example.com`。
