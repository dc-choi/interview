---
tags: [nodejs, http, proxy, tls]
status: done
verified_at: 2026-10-01
category: "OS & Runtime"
---

# Node.js 프록시와 인증서 설정

사내망에서는 외부 요청을 프록시로 보내거나 조직의 CA를 신뢰해야 할 수 있다. 프록시는 요청 경로를 정하고 CA는 상대 인증서의 신뢰를 정한다. 한쪽 설정으로 다른 쪽 문제가 해결되지는 않는다.

## 환경 변수 프록시

```bash
HTTP_PROXY=http://proxy.example.com:8080 \
HTTPS_PROXY=http://proxy.example.com:8080 \
NO_PROXY=localhost,127.0.0.1,.example.com \
NODE_USE_ENV_PROXY=1 node app.js
```

지원 버전에서 `NODE_USE_ENV_PROXY=1` 또는 `--use-env-proxy`로 환경 프록시 사용을 활성화한다. Fetch의 환경 변수 지원은 v24.0.0, HTTP/HTTPS와 CLI flag는 v24.5.0부터이며 v22.21.0에도 제공된다. 단순히 `HTTPS_PROXY`만 설정하고 활성화 옵션을 생략하지 않는다.

`NO_PROXY`는 정확한 호스트, 도메인 접미사, 포트 등 문서화된 제외 규칙을 적용한다. `*`는 전체 우회다. 다른 언어나 도구의 NO_PROXY 문법과 자동으로 같다고 가정하지 않는다. 프록시 인증 정보가 든 URL은 로그, 명령 기록과 저장소에 남기지 않는다.

## Agent와 Fetch dispatcher

```js
import https from 'node:https';

const agent = new https.Agent({
  proxyEnv: { HTTPS_PROXY: 'http://proxy.example.com:8080' },
});
const request = https.request('https://service.example.com', { agent }, response => {
  response.resume();
});
request.on('error', console.error);
request.end();
```

요청별 Agent를 지정하면 그 정책이 적용된다. `http.globalAgent`와 `https.globalAgent` 변경은 해당 HTTP API에 적용되며 Fetch에는 적용되지 않는다. Fetch의 연결 정책은 Undici dispatcher 계층에서 설정한다. 사용자 지정 Agent가 환경 프록시를 의도치 않게 우회하는지도 확인한다.

## 신뢰 저장소

```bash
node --use-system-ca app.js
NODE_EXTRA_CA_CERTS=/path/to/company-ca.pem node app.js
```

일반적인 Node 배포는 번들 CA를 사용한다. 시스템 CA 옵션은 OS 저장소를 추가로 사용하고 `NODE_EXTRA_CA_CERTS`는 PEM 인증서를 추가한다. 시스템 CA의 저장 위치는 Windows 인증서 저장소, macOS Keychain, Linux의 OpenSSL 구성에 따라 다르다.

환경 변수 `NODE_USE_SYSTEM_CA`는 v22.19.0과 v24.6.0부터 지원된다. `--use-system-ca` flag의 도입 시점과 환경 변수의 도입 시점은 다르므로 사용하는 Node 버전의 CLI 문서를 확인한다.

`NODE_EXTRA_CA_CERTS`는 시작 시 읽는다. 실행 후 `process.env`에 경로만 대입해도 기존 TLS 설정이 다시 구성되지 않는다. 요청에 `ca`를 명시하면 기본 CA 집합을 대체하므로 기본 신뢰까지 필요한지 함께 결정한다.

`tls.getCACertificates()`로 확인한 기본 집합과 시스템 집합을 합쳐 `tls.setDefaultCACertificates()`에 전달하는 방식도 있다. 적용 이후의 연결과 실행 스레드 범위를 확인하고, 이미 열린 연결까지 다시 검증한다고 가정하지 않는다.

## 진단 순서

DNS와 연결 실패, 프록시 인증 실패, TLS 인증서 검증 실패를 나눠 본다. 인증서 오류를 해결하기 위해 검증을 끄는 대신 누락된 중간 인증서, 대상 호스트 이름, 유효 기간과 신뢰 CA를 확인한다. 프록시 우회 목록에 내부 대상이 정확히 포함되는지도 확인한다.

## 출처

- [Node.js, Enterprise network configuration](https://nodejs.org/learn/http/enterprise-network-configuration)
- [Node.js, Command-line API](https://nodejs.org/api/cli.html)
- [Node.js, TLS](https://nodejs.org/api/tls.html)

## 관련 문서

- [[HTTP-Networking]]
- [[Command-Line]]
- [[tech/os-runtime/nodejs/Security|Node.js 보안]]
