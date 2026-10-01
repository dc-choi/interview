---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js CSP와 nonce"]
---

# Next.js CSP와 nonce

## 정책과 nonce

CSP는 script, style, image, frame 등 리소스의 실행과 로드 출처를 제한하는 응답 정책이다. nonce는 응답마다 새로 생성하는 예측 불가능한 값으로, CSP의 허용 값과 해당 script/style 속성이 일치하도록 연결한다. HTML을 검사해 얻은 고정 nonce를 재사용하면 이 보안 모델이 깨진다.

App Router에서는 Proxy가 nonce를 생성하고 요청의 Content-Security-Policy를 설정하면 렌더러가 이를 읽어 프레임워크 script 등에 붙인다. 응답에도 같은 CSP를 설정해야 브라우저가 시행한다. custom `x-nonce`만 설정하는 것은 자동 추출에 충분하지 않다. 직접 추가하는 Script에는 필요할 때 nonce prop을 전달한다.

## 정적 렌더링과의 충돌

요청별 nonce를 적용하는 경로는 요청 시점 렌더링이 필요하다. 빌드 때 만든 정적 HTML에는 미래 요청의 nonce를 알 수 없으므로 일반적인 ISR/CDN HTML 재사용과 PPR static shell에 그대로 적용할 수 없다. `connection()` 같은 동적 렌더링 수단의 적용 범위를 확인하고, Cache Components의 Suspense 아래에 nonce 읽기만 옮기면 정적 shell 전체가 보호된다고 가정하지 않는다.

정책상 nonce가 필요한 경로와 정적 공개 경로를 분리할 수 있다. 동적 HTML을 공유 캐시에 넣어 여러 사용자에게 같은 nonce를 제공하는 설정은 피한다. 지연과 서버 비용은 실제 요청 경로에서 측정한다.

## 구성할 때 확인할 사항

- matcher가 HTML 요청을 빠뜨리지 않는지 확인한다. 이미지, 정적 assets와 prefetch 제외 규칙은 실제 nonce가 필요한 응답을 제외하지 않아야 한다.
- `strict-dynamic`과 nonce는 script 신뢰를 전파할 수 있으므로 단순 호스트 allowlist와 같은 의미가 아니다.
- `connect-src`, `img-src`, `frame-src`, `worker-src` 등은 script-src와 별도로 데이터 수집, iframe과 service worker 요구를 반영한다.
- 개발 환경의 디버깅에는 `unsafe-eval`이 필요할 수 있다. 이를 생산 정책에 무조건 복사하지 않는다. WebAssembly는 필요한 경우 더 좁은 `wasm-unsafe-eval`을 검토한다.
- CSS-in-JS의 동적 style도 nonce 지원을 확인한다. inline 허용 예시는 엄격한 nonce 정책과 보호 수준이 다르다.

## SRI의 역할과 한계

실험적 `experimental.sri`는 빌드한 JavaScript 파일의 integrity hash를 script에 붙이는 App Router 기능이다. 선택한 bundler와 버전의 지원을 확인해야 한다. 전송 중 파일 변조를 검증하는 SRI와 어떤 script를 실행하도록 허용하는 CSP는 별도 계약이다.

SRI 설정만으로 모든 inline RSC/bootstrap script와 동적 script를 허용하는 CSP hash가 자동 완성된다고 단정하지 않는다. 정적 생성을 유지하려면 실제 생성된 HTML, integrity 속성과 CSP 위반 보고를 함께 확인한다. 동적으로 생성한 script는 빌드 시점 파일 hash만으로 처리할 수 없다.

## 검증

생산 빌드에서 첫 document와 client navigation, 인증 redirect, 외부 analytics, CSS, worker를 확인한다. 서로 다른 HTML 요청의 nonce가 달라야 하고 각 응답 내부의 CSP와 script nonce는 맞아야 한다. CSP 콘솔 위반이 없어도 입력 검증과 서버 인가는 별도로 필요하다.

## Proxy에서 정책과 nonce를 함께 설정

CSP는 XSS/주입과 frame-ancestors를 통한 clickjacking 방어에 쓰이며 script/style/image/font/object/media/iframe 등 리소스별 허용 출처를 정한다. nonce가 엄격한 정책의 일부라면 요청마다 예측 불가능한 새 값이어야 한다.

```ts
// proxy.ts
import { NextResponse, type NextRequest } from 'next/server'
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const dev = process.env.NODE_ENV === 'development'
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' ${dev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    "img-src 'self' blob: data:", "font-src 'self'", "object-src 'none'",
    "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
    ...(dev ? [] : ['upgrade-insecure-requests']),
  ].join('; ')
  const headers = new Headers(request.headers)
  headers.set('x-nonce', nonce)
  headers.set('Content-Security-Policy', policy)
  const response = NextResponse.next({ request: { headers } })
  response.headers.set('Content-Security-Policy', policy)
  return response
}
export const config = {
  matcher: [{
    source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
    missing: [
      { type: 'header', key: 'next-router-prefetch' },
      { type: 'header', key: 'purpose', value: 'prefetch' },
    ],
  }],
}
```

배열을 join해 HTTP header 줄바꿈을 없앴다. default-src는 개별 지시어의 fallback, object-src none은 object를, base-uri self는 base URL 변경을, form-action self는 외부 폼 제출을 제한한다. frame-ancestors none은 다른 페이지의 embedding을 막는다. img의 blob/data 허용은 실제 필요에 맞춰 줄인다. production의 upgrade-insecure-requests는 HTTP 리소스를 HTTPS로 올린다. 로컬 HTTP 개발에 같은 정책을 강제하면 접속이 깨질 수 있어 예제에서는 production에 적용했다.

렌더러는 요청 CSP의 nonce 패턴을 읽어 framework/runtime/page bundle 및 생성한 inline script/style에 연결한다. 임의로 추가한 요소와 라이브러리에는 해당 nonce 전달 지원을 확인한다. `x-nonce`는 직접 읽기 위한 보조 header다.

## 동적 페이지와 외부 스크립트

```tsx
// app/page.tsx
import { connection } from 'next/server'
import { headers } from 'next/headers'
import Script from 'next/script'
export default async function Page() {
  await connection()
  const nonce = (await headers()).get('x-nonce') ?? undefined
  return <Script src="https://www.googletagmanager.com/gtag/js"
    strategy="afterInteractive" nonce={nonce} />
}
```

headers()가 이미 동적 요청 API이지만 connection은 들어온 요청을 기다리는 의도를 명시한다. 올바른 header/렌더 설정이 빠지면 build가 성공해도 브라우저에서 script가 막힐 수 있다. 요청별 HTML 생성은 지연/서버 부하/호스팅 비용에 영향을 주며 정적 CDN 재사용을 기본으로 기대할 수 없다. unsafe-inline을 금지하거나 특정 inline만 허용해야 하는 보안 요구와 비용을 함께 비교한다.

`@next/third-parties/google`의 `<GoogleTagManager gtmId="GTM-XYZ" nonce={nonce} />`도 같은 nonce를 전달한다. GTM script 출처, Google Analytics 연결과 이미지 요청을 각각 script-src/connect-src/img-src에 반영한다. 예컨대 connect-src에 `https://www.google-analytics.com`을 추가해도 script 실행 정책이 자동 변경되지는 않는다. 실제 사용하는 endpoint 목록을 network/CSP 위반으로 확인한다.

## nonce 없는 정책과 SRI 설정

nonce가 필요 없는 정책은 `next.config.js`의 `headers()`에서 `source: '/(.*)'`에 Content-Security-Policy를 설정할 수 있다. script/style에 unsafe-inline을 넣는 예시는 inline 실행을 허용하므로 strict nonce와 보호 수준이 다르다. 개발 unsafe-eval을 production에 넣지 않는다.

```js
module.exports = {
  experimental: { sri: { algorithm: 'sha256' } },
  async headers() {
    return [{ source: '/(.*)', headers: [{
      key: 'Content-Security-Policy',
      value: [
        "default-src 'self'",
        `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
        "style-src 'self' 'unsafe-inline'", "img-src 'self' blob: data:",
        "font-src 'self'", "object-src 'none'", "base-uri 'self'",
        "form-action 'self'", "frame-ancestors 'none'",
        ...(process.env.NODE_ENV === 'development' ? [] : ['upgrade-insecure-requests']),
      ].join('; '),
    }] }]
  },
}
```

SRI algorithm은 sha256/sha384/sha512를 선택한다. 위 코드는 nonce 없이 inline script/style을 허용하는 원문의 기본 정책이다. 외부 script와 연결 정책은 생성된 HTML과 앱 요구에 맞춰 추가한다. SRI는 CSP와 독립적으로 integrity를 제공하며 동적 페이지의 nonce와 함께 쓸 수도 있다. build-time 파일 해시는 정적 생성/CDN과 함께 사용할 수 있고 요청별 nonce 생성 비용을 피하지만 inline/dynamic script 허용을 자동으로 해결하지 않는다.

## 위반 점검과 버전 이력

| 증상 | 확인할 위치 |
| --- | --- |
| nonce 미적용 | 필요한 document 경로의 Proxy matcher와 request CSP |
| Next 정적 자원 차단 | script-src와 실제 asset origin, 동적 import |
| inline style 차단 | nonce 지원 CSS-in-JS 또는 외부 CSS 이동 |
| 외부 분석/iframe 차단 | script/connect/img/frame 지시어 각각 |
| WebAssembly 실패 | 필요한 경우 wasm-unsafe-eval |
| service worker 차단 | worker script 정책과 실제 worker origin |

v13.4.20은 nonce/CSP parsing 처리를 위한 권장 기준으로 기록됐고 v14.0.0에 실험 SRI가 추가됐다. SRI는 App Router 전용이며 Pages Router에는 제공되지 않는다. 실험 기능은 변경/제거될 수 있고 build 뒤 생성한 script는 대상이 아니다. 공식 with-strict-csp 예제와 선택한 bundler의 현재 지원을 함께 확인한다.

## 출처

- [Next.js, content-security-policy](https://nextjs.org/docs/app/guides/content-security-policy)

## 관련 문서

- [[NextJS-Data-Security]]
- [[NextJS-Scripts-and-Third-Party]]
