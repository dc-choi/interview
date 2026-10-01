---
tags: [nextjs, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 12 HMR WebSocket proxy 설정"]
---

# Next.js 12 HMR WebSocket proxy 설정

Next.js 16.3.8 공식 문서를 기준으로 설명한다. 과거 버전 변경은 해당 버전으로 한정한다.

## SSE에서 WebSocket으로 변경된 연결

v12 HMR은 SSE 대신 WebSocket을 사용한다. dev server 앞의 proxy는 Upgrade 요청을 전달해야 한다. 당시 경로는 `/_next/webpack-hmr`, v16부터 `/_next/hmr`이므로 설치된 major의 실제 endpoint로 모든 설정을 같이 바꾼다. 다음은 v12의 역사적 예제이며 host/port/server name/TLS 설정은 배포 환경에 맞춘다.

## Nginx

```nginx
location /_next/webpack-hmr {
    proxy_pass http://localhost:3000/_next/webpack-hmr;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

## Apache 2.x

HTTP와 WebSocket reverse proxy module 및 rewrite 설정이 활성화되어 있어야 한다. 다음은 원문에서 query transport 조건을 요구하는 버전별 예제이므로 실제 upgrade request가 그 조건에 맞는지도 확인한다.

```apache
<VirtualHost *:443>
 ServerName "${WEBSITE_SERVER_NAME}"
 ProxyPass / http://localhost:3000/
 ProxyPassReverse / http://localhost:3000/
 <Location /_next/webpack-hmr>
    RewriteEngine On
    RewriteCond %{QUERY_STRING} transport=websocket [NC]
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule /(.*) ws://localhost:3000/_next/webpack-hmr/$1 [P,L]
    ProxyPass ws://localhost:3000/_next/webpack-hmr retry=0 timeout=30
    ProxyPassReverse ws://localhost:3000/_next/webpack-hmr
 </Location>
</VirtualHost>
```

## custom Express server

원문의 `nextjsRequestHandler`는 `nextApp.getRequestHandler()`로 준비한 handler다. 특정 GET만 등록하는 대신 모든 method를 이 endpoint로 전달하는 예제다. 사용한 server가 WebSocket upgrade를 별도 처리하는지 확인하며 단순 route 등록을 모든 Express 버전의 upgrade 지원 보장으로 읽지 않는다.

```js
app.all('/_next/webpack-hmr', (req, res) => {
  nextjsRequestHandler(req, res)
})
```

## 출처

- [Next.js, version 12](https://nextjs.org/docs/pages/guides/upgrading/version-12)

## 관련 문서

- [[NextJS-Pages-Upgrade-History]]
- [[NextJS-Pages-Deployment]]
