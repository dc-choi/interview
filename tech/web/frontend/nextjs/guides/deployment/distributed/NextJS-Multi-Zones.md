---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js Multi-Zones"]
---

# Next.js Multi-Zones

## 경로 소유와 이동 비용

한 도메인의 /blog/*, /dashboard/*, 나머지 /*를 독립 Next.js 앱으로 나누는 micro-frontend 구성이다.
관련 없는 페이지를 분리하면 각 앱의 빌드 크기와 전용 코드를 줄일 수 있고 개발/배포를 독립시키며 다른 프레임워크와도 조합할 수 있다.
같은 zone의 /와 /products 이동은 soft navigation이다. /에서 다른 zone의 /dashboard 이동은 현재 리소스를 내리고 새 앱을 로드하는 hard navigation이다.
자주 함께 방문하는 페이지는 같은 zone에 둔다. 분리된 앱의 빌드 절감과 사용자 이동 비용을 함께 평가한다.
각 URL 경로의 소유 zone은 하나여야 한다. 두 앱이 /blog를 동시에 제공하면 라우팅이 충돌한다.

## assetPrefix와 버전 조건

zone은 일반 Next 앱이며 assetPrefix: '/blog-static'처럼 독립 JavaScript/CSS 경로를 둔다.
리소스는 /blog-static/_next/... 아래 제공되어 다른 zone과 충돌하지 않는다. 나머지 경로의 기본 앱은 prefix가 없어도 된다.
15 이전 버전은 beforeFiles rewrite로 /blog-static/_next/:path+를 /_next/:path+에 보내는 추가 규칙이 필요할 수 있었다.
15 이후에는 이 내부 asset rewrite를 추가할 필요가 없다. 현재 설정과 과거 migration용 규칙을 구분한다.
assetPrefix는 페이지 경로의 소유권이나 public 파일 전체를 자동으로 바꾸는 설정이 아니다.

## 요청 전달

HTTP reverse proxy 또는 하나의 Next 앱이 도메인의 경로를 각 zone에 보낸다.
rewrites는 /blog, /blog/:path+, /blog-static/:path+를 블로그 앱의 같은 경로로 전달한다.
destination은 scheme과 domain이 있는 실제 zone URL이다. production 도메인뿐 아니라 개발 localhost URL도 사용할 수 있다.
페이지와 그 페이지의 asset 경로를 모두 전달해야 정상적인 로딩을 얻는다.
정적 결정은 rewrites로 처리해 추가 지연을 줄인다. migration feature flag처럼 요청마다 결정이 달라질 때 Proxy를 사용한다.
Proxy는 request.nextUrl의 pathname과 search를 함께 유지해 NextResponse.rewrite한다. 쿼리를 잃지 않고 실제 조건과 목표 domain을 검증한다.

## 링크, 코드 공유와 Actions

다른 zone으로 가는 링크는 a 태그를 사용한다. 상대 Link는 현재 앱의 prefetch/soft navigation을 시도하므로 다른 앱 경계를 넘는 데 맞지 않는다.
zone은 서로 다른 저장소 또는 monorepo에 둘 수 있다. monorepo는 공유 코드를 쉽게 다루며 별도 저장소는 public/private NPM 패키지로 공유할 수 있다.
서로 다른 시점에 release되므로 feature flag로 동시에 기능을 켜거나 끄는 조율이 가능하다.
App Router Server Actions는 사용자에게 보이는 공통 도메인을 experimental.serverActions.allowedOrigins에 명시한다.
예: allowedOrigins: ['app.example.com']. 이는 origin 검사 허용 목록이며 사용자 인증과 권한 검사를 대체하지 않는다.
Pages Router API Routes에는 이 Server Action 설정을 동일한 호출 계약으로 적용하지 않는다.

## 이해 확인

- /blog 경로만 rewrite하고 /blog-static 경로를 빼면 어떤 요청이 실패하는가?
- zone별 독립 배포가 가능한데 공통 feature flag가 필요한 경우는 언제인가?

## Rewrite와 동적 분기 예제

~~~js
// next.config.mjs, BLOG_DOMAIN=https://blog.example.com
export default {
  async rewrites() {
    const origin = process.env.BLOG_DOMAIN
    return [
      { source: '/blog', destination: origin + '/blog' },
      { source: '/blog/:path+', destination: origin + '/blog/:path+' },
      { source: '/blog-static/:path+', destination: origin + '/blog-static/:path+' },
    ]
  },
}
// blog zone의 config: { assetPrefix: '/blog-static' }
~~~

~~~js
// proxy.js, 실제 flag service로 조건을 바꿀 수 있다.
import { NextResponse } from 'next/server'
export function proxy(request) {
  if (request.nextUrl.pathname === '/your-path' &&
      process.env.ROUTE_TO_NEW_ZONE === 'true') {
    const target = new URL(process.env.NEW_ZONE_ORIGIN)
    target.pathname = request.nextUrl.pathname
    target.search = request.nextUrl.search
    return NextResponse.rewrite(target)
  }
}
~~~

목표 origin 환경 값이 없는 경우를 배포 검증에서 차단한다.

## 출처

- [Next.js, multi-zones](https://nextjs.org/docs/app/guides/multi-zones)

## 관련 문서

- [[NextJS-Config-URL]]
- [[NextJS-Config-Rewrites]]
- [[NextJS-Actions-and-Forms]]
