---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 프로덕션 검증"]
---

# Next.js 프로덕션 검증

## 기본 최적화가 보장하는 범위

프로덕션 체크리스트는 개발 중 선택과 배포 전 확인을 연결한다. 기본 기능이 있어도 앱이 만든 경계와 외부 인프라까지 자동 검증되지는 않는다.
Server Component 자체의 실행 코드는 브라우저로 보내지 않는다. Client Component 의존성의 번들과 서버가 넘긴 props/payload는 별도로 확인한다.
라우트 세그먼트는 코드를 나누며, 큰 클라이언트 라이브러리는 필요할 때 lazy load할 수 있다.
Link의 viewport prefetch는 설정, 정적/동적 라우트와 loading 경계에 따라 전체 또는 일부 경로를 준비한다. 모든 동적 페이지를 항상 미리 실행한다는 계약은 아니다.
사전 렌더링과 캐시는 렌더 모드와 명시적인 옵션에 따라 다르다. 현재 fetch의 기본값을 과거의 자동 영구 캐시 설명으로 판단하지 않는다.
Cache Components를 켠 앱은 use cache, Suspense와 요청 시점 경계를 기준으로 따로 확인한다.

## 라우팅과 데이터

공유 UI는 layout에 두고 부분 렌더링을 활용한다. 내부 이동에는 Link를 사용하되 prefetch가 비용을 늘리는 경로는 옵션을 검토한다.
존재하지 않는 경로의 not-found, 라우트별 error와 전역 오류를 실제로 발생시켜 UI를 확인한다.
error boundary는 Client Component로 작성하며 자기 자신이나 같은 세그먼트 layout 오류를 모두 잡는다고 가정하지 않는다.
cookies, searchParams 등 요청 시점 데이터의 영향은 사용 위치와 렌더 모드에 따라 달라진다. 기존 모델의 전체 라우트 dynamic 전환과 Cache Components의 동적 부분 스트리밍을 구분한다.
루트 layout에서 요청 정보를 읽으면 영향 범위가 넓으므로 경계를 작게 둔다.
14 시절의 실험 PPR 체크 항목은 역사적 안내다. 현재 Cache Components 설정과 PPR 계약을 기준으로 판단한다.

서버 데이터는 Server Component에서 직접 읽는다. 이미 서버에 있는 컴포넌트가 자기 Route Handler를 HTTP로 다시 호출하면 불필요한 왕복이 생긴다.
클라이언트가 호출할 backend가 필요하면 Route Handler를 사용한다.
loading 또는 Suspense로 느린 부분만 기다리게 하고, 독립 요청은 병렬로 시작해 waterfall을 줄인다.
fetch와 데이터베이스 호출의 실제 캐시 여부를 확인한다. 기존 unstable_cache 예제와 Cache Components의 use cache 모델을 혼동하지 않는다.
public 파일은 정적 URL이라는 이유만으로 1년 immutable 캐시를 보장하지 않는다. 배포 헤더와 변경 가능한 파일명에 맞춰 확인한다.

## UI와 접근성

Server Actions 폼은 서버 검증, 실패 표시와 다시 시도할 상태를 갖춘다.
전역 예외 UI와 404를 키보드, 스크린 리더로 확인한다. global-not-found는 별도 실험 옵션과 제한이 있다.
next/font는 자체 호스팅과 폰트 로딩 배치로 외부 왕복과 layout shift를 줄인다.
Image의 크기, loading, responsive sizes와 실제 제공 형식을 확인한다. 현대 형식 지원만으로 원본의 전달 비용이 사라지지는 않는다.
Script는 전략에 따라 로드를 늦출 수 있지만 실행된 스크립트의 main-thread 비용은 남는다.
ESLint의 jsx-a11y 규칙은 접근성 문제를 찾는 보조 도구다. 실제 사용자 흐름 검증을 대신하지 않는다.

## 보안 경계

인증과 권한 검사는 각각의 Server Action과 데이터 접근 지점에서 수행한다. Proxy나 layout 검사 하나로 모든 직접 호출을 보호하지 않는다.
서버 전용 DAL에는 server-only 경계를 두고, 비용이 큰 작업에는 rate limit 등 서비스별 통제를 적용한다.
실험 taintObjectReference와 taintUniqueValue는 값이 클라이언트로 넘어가는 실수를 줄이는 방어층이다. 접근 권한과 안전한 데이터 형태를 대신하지 않는다.
.env 파일의 Git ignore를 확인하고, NEXT_PUBLIC_ 접두사는 공개할 값에만 사용한다. 서버 값도 HTML/props에 넣으면 노출된다.
CSP는 XSS와 삽입, frame 경계를 제한한다. nonce, 정적 캐시와 third-party script의 요구를 함께 맞춘다.

## 발견 가능성과 타입

title, description, Open Graph 결과를 실제 HTML과 공유 미리보기에서 확인한다.
sitemap과 robots 정책은 인덱싱할 경로와 제외할 경로에 맞춘다. robots 자체를 비밀 데이터 접근 통제로 사용하지 않는다.
Next.js TypeScript 플러그인의 오류와 타입 검사를 확인한다. 개발 서버 성공만으로 프로덕션 빌드의 타입 계약을 확인했다고 판단하지 않는다.

## 배포 전 실행과 지표

next build 뒤 next start로 실행해 개발 전용 기능이 없는 환경에서 확인한다. 빌드 오류, 실제 route 출력, 캐시, 환경 변수와 런타임 실패를 함께 본다.
시크릿 창의 Lighthouse는 확장 기능 영향을 줄인 실험실 측정이다. 장치, 네트워크와 표본의 영향을 고려한다.
useReportWebVitals 또는 분석 서비스로 실제 사용자 지표도 수집한다. 실험실 점수와 field percentile이 같은 결과라고 가정하지 않는다.

## 번들 점검

Webpack 빌드는 @next/bundle-analyzer로 실제 의존성 구성을 확인할 수 있다. Turbopack 프로젝트에는 현재 제공되는 별도 analyze 경로와 지원 상태를 확인한다.
Import Cost는 편집기에서 import 크기를 추정하고, Package Phobia는 설치 크기, Bundle Phobia와 bundlejs는 패키지 번들 비용을 살피는 참고 도구다.
이 숫자는 앱의 tree shaking, 서버/클라이언트 경계와 route splitting 이후 실제 전달 크기와 다를 수 있다.
분석 결과에서 큰 클라이언트 의존성, 중복 코드, 지연 로드할 기능을 찾아 실제 경로의 네트워크 결과로 다시 확인한다.

## 이해 확인

- 개발 서버가 성공해도 next build/next start에서 다시 확인해야 하는 계약 세 가지는 무엇인가?
- root layout의 인증 상태 표시와 Server Action의 권한 검사가 서로 대체되지 않는 이유는 무엇인가?

## 출처

- [Next.js, production-checklist](https://nextjs.org/docs/app/guides/production-checklist)

## 관련 문서

- [[NextJS-Platform-Deployment]]
- [[NextJS-Analytics]]
- [[NextJS-Data-Security]]
- [[NextJS-Build-and-Performance]]
