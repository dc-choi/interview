---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js HTTP 전달 설정", "NextJS-Config-HTTP"]
---

# Next.js HTTP 전달 설정

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## compress

boolean 기본 활성화다. next start 또는 custom server에서 rendered content와 static files에 gzip을 적용한다. custom server에서 이미 압축하면 Next.js가 추가하지 않는다. nginx/CDN이 Brotli 등을 처리할 때 `compress: false`로 중복을 피할 수 있다. 단순 비활성화는 bandwidth를 늘린다. Accept-Encoding 요청과 Content-Encoding 응답을 확인한다.

## crossOrigin

`'anonymous'` 또는 `'use-credentials'` 문자열로 next/script의 script crossorigin attribute를 설정한다. Pages Router는 next/head가 생성한 script에도 적용한다. credential 전송 허용과 원격 resource CORS 응답을 함께 확인한다. 이 옵션은 API endpoint의 Access-Control-Allow-Origin을 설정하지 않는다.

## generateEtags

boolean 기본 true로 HTML pages의 ETag를 생성한다. `generateEtags: false`는 host/CDN에서 다른 cache strategy를 사용할 때 선택한다. browser freshness policy인 Cache-Control과 동일한 옵션은 아니다. 조건부 요청 If-None-Match 및 304 response를 확인한다.

## poweredByHeader

boolean 기본 true이며 `poweredByHeader: false`면 Next.js의 x-powered-by를 생략한다. framework 식별 정보 하나를 숨기는 설정이며 인증이나 보안 경계를 제공하는 기능은 아니다.

## httpAgentOptions

`httpAgentOptions: { keepAlive: false }`로 server fetch 연결 재사용을 조정한다. 공식 설명의 undici polyfill은 Node.js 18 이전 맥락이다. 이를 현재 모든 Node.js fetch의 transport 구현 설명으로 일반화하지 않는다. Next.js production HTTP server의 keep-alive timeout은 [[NextJS-CLI]]의 `--keepAliveTimeout`과 별개다.

## 요청 크기와 timeout 구분

Server Action bodySizeLimit은 parsing input 상한, Proxy의 proxyClientMaxBodySize는 clone buffer 상한, keepAliveTimeout은 idle TCP 수명이다. payload가 큰 upload에 keepAliveTimeout만 늘려서는 메모리와 body 잘림 문제가 해결되지 않는다. [[NextJS-Config-Server-Actions]]에서 두 body 옵션을 비교한다.

## 출처

- [Next.js, app/api-reference/config/next-config-js/compress](https://nextjs.org/docs/app/api-reference/config/next-config-js/compress)
- [Next.js, pages/api-reference/config/next-config-js/compress](https://nextjs.org/docs/pages/api-reference/config/next-config-js/compress)
- [Next.js, app/api-reference/config/next-config-js/crossOrigin](https://nextjs.org/docs/app/api-reference/config/next-config-js/crossOrigin)
- [Next.js, pages/api-reference/config/next-config-js/crossOrigin](https://nextjs.org/docs/pages/api-reference/config/next-config-js/crossOrigin)
- [Next.js, app/api-reference/config/next-config-js/generateEtags](https://nextjs.org/docs/app/api-reference/config/next-config-js/generateEtags)
- [Next.js, pages/api-reference/config/next-config-js/generateEtags](https://nextjs.org/docs/pages/api-reference/config/next-config-js/generateEtags)
- [Next.js, app/api-reference/config/next-config-js/poweredByHeader](https://nextjs.org/docs/app/api-reference/config/next-config-js/poweredByHeader)
- [Next.js, pages/api-reference/config/next-config-js/poweredByHeader](https://nextjs.org/docs/pages/api-reference/config/next-config-js/poweredByHeader)
- [Next.js, app/api-reference/config/next-config-js/httpAgentOptions](https://nextjs.org/docs/app/api-reference/config/next-config-js/httpAgentOptions)
- [Next.js, pages/api-reference/config/next-config-js/httpAgentOptions](https://nextjs.org/docs/pages/api-reference/config/next-config-js/httpAgentOptions)

## 관련 문서

- [[NextJS-CLI]]
- [[NextJS-Config-Headers]]
- [[NextJS-Config-Server-Actions]]
