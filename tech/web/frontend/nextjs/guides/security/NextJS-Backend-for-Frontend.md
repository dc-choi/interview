---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js BFF와 HTTP 경계"]
---

# Next.js BFF와 HTTP 경계

## BFF의 범위

Route Handler는 프런트엔드에 맞춘 공개 HTTP endpoint다. 여러 데이터 소스를 집계하고 JSON, XML, 파일, stream과 callback을 제공할 수 있다. App Router의 `app/api/route.ts`와 Pages Router의 `pages/api`는 다른 API다. 긴 작업, durable queue, WebSocket과 독립 서비스 요구는 배포 환경에 맞춰 분리한다.

Server Component가 같은 앱의 Route Handler를 HTTP로 돌아서 호출하면 왕복 비용이 생긴다. 빌드 시점에는 내부 서버가 실행 중이지 않을 수 있으므로 공유 DAL이나 데이터 원천을 직접 호출한다. 브라우저 전용 위치/파일 API와 polling은 client fetching의 별도 이유가 된다.

## 요청과 응답 처리

Request의 `.json()`, `.formData()`, `.text()`는 body stream을 소비한다. 여러 번 읽어야 한다면 소비 전에 clone하거나 파싱한 값을 재사용한다. 큰 body의 clone에는 메모리 비용이 있다. 파싱 오류, schema 오류, 권한 실패, upstream 장애를 구분하고 내부 예외 메시지를 그대로 반환하지 않는다.

사용자가 만든 XML/HTML을 문자열로 합칠 때 해당 문맥에 맞게 escape한다. MIME, 크기, timeout과 업로드 경로를 제한한다. 큰 사용자 파일은 적절한 저장 서비스에 직접 업로드하고 URI를 저장하는 구조도 가능하다.

## 프록시와 헤더

Proxy는 경로 앞에서 redirect/rewrite/응답을 처리하며 프로젝트당 하나의 진입 파일을 둔다. Route Handler로 외부 API를 중계할 수도 있다. 외부 목적지는 allowlist와 정규화로 제한하고, 임의 URL이나 path가 open proxy/SSRF를 만들지 않게 한다. incoming Authorization과 Cookie를 무작정 외부 upstream에 전달하지 않는다.

`NextResponse.next({ request: { headers } })`는 upstream 요청 헤더를 바꾼다. `NextResponse.next({ headers })`와 response.headers는 클라이언트 응답으로 나간다. 양자를 혼동하면 토큰 누출이나 RSC 응답 Content-Type 손상이 생긴다.

## 콘텐츠 협상과 캐시

Accept에 따라 같은 URL에서 HTML과 Markdown을 나누려면 rewrite/handler와 캐시 키를 함께 설정한다. `Vary: Accept`를 응답에 표시하고 CDN이 실제로 이를 존중하는지 확인한다. 헤더만 적었다고 모든 CDN 설정에서 분리가 보장되는 것은 아니다. `/docs/md/...` 같은 대상 경로는 직접 접근도 가능한 endpoint다.

자동 OPTIONS 응답의 Allow는 구현한 HTTP method를 알리는 기능이다. 필요한 Access-Control-Allow-Origin 등 CORS 정책을 자동 완성하는 것은 아니다.

## Webhook과 인증 callback

Webhook은 발신자 서명이나 비밀을 검증하고 이벤트 중복을 처리한 뒤 cache invalidation 같은 작업을 한다. 변경 endpoint에 GET과 URL 비밀을 쓰면 prefetch, 로그와 재실행 위험을 검토해야 한다. 서비스의 실제 webhook 계약에 맞는 method와 서명 검증을 사용한다.

인증 callback은 redirect URL의 origin을 제한하는 것 외에 인증 제공자의 응답, state와 토큰을 검증해야 한다. URL에서 받은 session_token을 그대로 쿠키에 넣는 것만으로 로그인 검증이 완료되지 않는다. 공개 endpoint별 rate limit과 민감 정보가 빠진 로그를 둔다.

## 배포 제약

정적 export에는 runtime 서버가 없다. 요청 정보가 필요 없는 GET 결과를 빌드 때 파일로 만드는 범위와 실제 API 실행을 구분한다. serverless handler의 메모리/파일은 요청 간 공유 저장소로 의존하지 않고 timeout과 연결 수명을 확인한다. WebSocket이 필요한 서비스는 선택한 runtime의 지속 연결 지원을 별도로 검증한다.

## 구체적인 구현 흐름

endpoint 생성, RSS/XML, Accept rewrite, body 소비와 중계, callback과 라이브러리 factory는 [[NextJS-HTTP-Recipes]]에서 이어서 설명한다.

## 출처

- [Next.js, backend-for-frontend](https://nextjs.org/docs/app/guides/backend-for-frontend)

## 관련 문서

- [[NextJS-Data-Security]]
- [[NextJS-Self-Hosting]]
