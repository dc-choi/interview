---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js Server Action origin과 body 제한", "NextJS-Config-Server-Actions"]
---

# Next.js Server Action origin과 body 제한

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## serverActions

Server Actions는 14부터 안정화되어 기본 활성화된다. 13의 `experimental.serverActions: true`는 당시 opt-in이며 최신 활성화 필수 조건이 아니다. 현재 동작 옵션은 experimental.serverActions object에서 조정한다.

## allowedOrigins

`allowedOrigins: string[]`는 Server Action의 추가 안전 host를 허용한다. request Origin host와 x-forwarded-host 또는 host를 비교해 CSRF를 방어한다. 기본 same-origin이며 Origin이 전혀 없으면 warning과 함께 통과하는 현재 동작이므로 origin check만 인증/권한 검증으로 취급하지 않는다. development와 production 모두에 적용한다.

allowedDevOrigins와 달리 hostname뿐 아니라 명시적 port도 포함한다. `example.com`과 `example.com:8443`은 다르다. `*`는 host label 하나, 시작 `**`는 하나 이상이다. bare host는 별도 항목, partial wildcard와 port wildcard는 지원하지 않는다.

reverse proxy가 public host를 x-forwarded-host에 제대로 전달하면 추가 origin이 필요 없다. 내부 localhost를 전달해 mismatch가 날 때 브라우저가 보는 public host를 목록에 넣거나 forwarding을 바로잡는다. 개발 tunnel은 allowedDevOrigins와 Server Action allowedOrigins 양쪽의 목적을 구분해 설정한다.

## bodySizeLimit

기본 raw request body 상한 1MB다. bytes 숫자 또는 `'500kb'`, `'3mb'` 같은 문자열을 받는다. multipart boundary, part headers와 field metadata도 포함하므로 파일 content size와 같지 않다. 상한에 가까운 upload에는 metadata overhead를 고려한다.

```js
export default {
  experimental: {
    serverActions: {
      allowedOrigins: ['app.example.com:8443'],
      bodySizeLimit: '3mb',
    },
  },
}
```

## proxyClientMaxBodySize

실험 number/string 기본 10MB다. Proxy와 route handler가 body를 여러 번 읽도록 clone/buffer하는 memory 상한이다. 초과하면 첫 N bytes까지만 buffer하고 warning을 남기며 요청을 계속 처리한다. 자동 HTTP error나 rejection을 제공하지 않으므로 upload validation 상한으로 의존하면 안 된다.

```js
export default { experimental: { proxyClientMaxBodySize: '5mb' } }
```

per-request 제한이며 concurrency가 늘면 총 memory가 증가한다. 큰 upload에는 제한 증가와 body 완전성 확인, 별도 upload 경로를 함께 검토한다. Server Action bodySizeLimit과 다른 계층의 제한이다.

## 보안 확인

인증 session, 객체별 권한, 입력 schema와 mutation idempotency를 각 action에서 검증한다. 허용 host/port의 최소 범위, 신뢰할 proxy header, Origin 없음, 초과 payload와 multipart overhead를 확인한다. origin 목록은 CORS 응답 header가 아니며 추가 host를 허용하는 것만으로 client fetch policy가 바뀌지 않는다.

## Proxy buffer의 단위와 read 예시

proxyClientMaxBodySize의 문자열 단위는 b/kb/mb/gb이고 숫자는 bytes다. 1mb 예시는 1048576 bytes에 대응한다. Proxy에서 request.text()를 읽고 underlying route에서도 다시 읽을 수 있도록 clone하지만 초과 시 첫 N bytes만 남을 수 있다. JavaScript string.length는 bytes 측정과 같지 않으므로 body.length로 upload 완전성을 검증하지 않는다.

## multipart 여유와 wildcard port

Server Action bodySizeLimit은 bytes 숫자 또는 bytes parser 문자열이며 기본 1MB다. 일반 multipart에는 boundary/headers/metadata용 10~20KB 여유가 경험적 기준으로 제시되지만 모든 upload의 정확한 고정 overhead는 아니다. host wildcard에도 port를 명시해야 하므로 *.my-proxy.com:8443은 가능하지만 port wildcard는 지원하지 않는다.

## 출처

- [Next.js, app/api-reference/config/next-config-js/serverActions](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions)
- [Next.js, app/api-reference/config/next-config-js/proxyClientMaxBodySize](https://nextjs.org/docs/app/api-reference/config/next-config-js/proxyClientMaxBodySize)
- [Next.js, pages/api-reference/config/next-config-js/proxyClientMaxBodySize](https://nextjs.org/docs/pages/api-reference/config/next-config-js/proxyClientMaxBodySize)

## 관련 문서

- [[NextJS-Config-Development]]
- [[NextJS-Config-HTTP]]
