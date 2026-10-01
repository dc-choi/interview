---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 배포 플랫폼의 기능 계약"]
---

# Next.js 배포 플랫폼의 기능 계약

## 실행 모델과 최소 조건

Next.js는 컴포넌트 경계에서 정적 결과와 동적 실행을 섞는다. 배포 플랫폼을 고를 때 단일 HTML 호스팅 여부보다 앱이 사용하는 서버 계약을 먼저 확인한다.
Node.js 서버 하나의 next start도 RSC, ISR, Cache Components 기반 PPR, Server Actions, Proxy, after를 실행할 수 있다.
이미지 최적화에는 sharp를 사용할 수 있어야 한다. 여러 인스턴스의 상태 공유, CDN과 edge 조합은 추가 운영 선택이다.
HTTP/1.1 chunked 또는 HTTP/2 스트리밍을 중간 프록시가 버퍼링하지 않아야 점진적 응답이 사용자에게 도달한다.
버퍼링 서버에서 최종 응답이 동작하는 것과 스트리밍 기능의 충실도는 구분한다. 기능 표의 streaming required는 점진적 동작을 보존할 조건이다.

## 기능별 인프라 요구

| 기능 | 스트리밍 | 공유 캐시 | edge 실행 | 운영 의미 |
| --- | --- | --- | --- | --- |
| RSC | 점진적 응답에 필요 | 불필요 | 불필요 | 서버 컴포넌트 payload 전달 |
| 시간 기반 ISR | 불필요 | 권장 | 불필요 | 단일 인스턴스는 자기 캐시 사용 |
| 요청 기반 ISR | 불필요 | 권장 | 불필요 | 다중 인스턴스 태그 무효화 전파 |
| PPR | 필요 | 권장 | 선택 | 정적 셸과 동적 부분의 조합 |
| Cache Components/use cache | 필요 | 권장 | 불필요 | 재사용 캐시와 동적 스트림 |
| Proxy | 불필요 | 불필요 | 불필요 | 현재 Proxy는 Node.js 런타임 |
| Server Actions | 스트림 응답 보존에 필요 | 불필요 | 불필요 | POST 실행과 UI 응답 |
| after | 불필요 | 불필요 | 불필요 | 응답 뒤 작업을 위한 종료 수명 관리 |

이 표는 App Router 계약이다. Pages Router의 getStaticProps나 API Routes에 use cache 계약을 그대로 적용하지 않는다.
공유 저장소 없이 여러 서버를 운영하면 한 서버의 on-demand invalidation이 다른 서버의 캐시까지 자동 전파되지 않는다.
종료 신호를 처리하는 graceful shutdown은 after 작업과 진행 중 요청의 수명을 보존할 운영 조건이다.

## CDN과 저장소 조합

| 사업자 | edge 계산 | 키-값 저장소 | 객체 저장소 | PPR 구성 예시 |
| --- | --- | --- | --- | --- |
| Cloudflare | Workers | KV | R2 | Worker |
| Akamai | EdgeWorkers | EdgeKV | Object Storage | Worker |
| AWS CloudFront | Lambda@Edge | KeyValueStore | S3 | Lambda |
| Fastly | Compute | KV Store | Object Storage | WASM |
| Azure | Functions | Managed Redis | Blob Storage | 서버 |
| Google Cloud | Cloud Run | 여러 KV 선택 | Cloud Storage | 서버 |

이는 사용할 수 있는 부품 목록이며 완성된 Next.js 통합을 보장하지 않는다. 실제 어댑터가 해당 부품을 연결하고 HTTP 헤더, 스트리밍, 캐시 수명을 보존해야 한다.
현재 어댑터는 Node.js/Docker 실행을 기본으로 삼는 경우가 많다. CDN의 Vary 처리 제한도 확인한다.

## 어댑터와 캐시 인터페이스

어댑터 API는 공개된 빌드 시점 API다. 특정 업체의 접근 권한 없이 누구나 배포 통합을 만들 수 있다.
adapterPath는 빌드 출력과 플랫폼 배포를 연결한다. cacheHandler는 ISR, Route Handler, 패치된 fetch, unstable_cache, 이미지 캐시의 기존 서버 저장소를 다룬다.
cacheHandlers는 use cache 계열의 별도 인터페이스다. 같은 이름처럼 보여도 기능과 수명 계약을 구분한다.
앱 코드의 캐시 경계와 플랫폼 캐시의 저장, 만료, 무효화 전달을 함께 맞춰야 한다.

## 검증된 어댑터의 의미

공식 검증 절차는 어댑터가 공개 호환성 테스트를 실행하고 어떤 기능이 지원되는지 공개하도록 한다.
오픈 소스 어댑터와 테스트 결과를 읽을 수 있어야 확인된 목록에 들어간다. 플랫폼 팀이 유지하고 Next.js GitHub 조직에서 협업하는 구조다.
Vercel 통합도 공개 API를 사용한다는 것이 이 문서의 계약이다. 비공개 hook 사용을 전제로 대안을 평가하지 않는다.
협업 그룹은 주요 버전 전에 테스트, 초기 RFC/RC 검토와 직접 지원을 연결한다.
닫힌 소스 어댑터도 공개 API와 테스트를 사용할 수 있지만 공식 확인 목록과는 구분한다.
테스트 통과는 해당 suite의 검증 범위를 만족한 증거다. 모든 앱의 운영, 지연, 데이터 일관성이 증명됐다는 의미로 확대하지 않는다.

## 선택을 바꾸는 조건

기능 호환성과 성능은 별개다. PPR 셸의 CDN 전달 속도, ISR stale 응답의 지연, 여러 서버 사이의 짧은 무효화 전파 시간은 배포 구조에 따라 달라진다.
컴포넌트별 정적/동적 조합을 유지하려면 플랫폼이 그 경계의 서버 실행과 스트림을 처리할 수 있어야 한다.
정적 export로 충분한 앱과 인증, Actions, 요청 기반 렌더링이 필요한 앱은 요구 조건부터 다르다.

## 이해 확인

- 어댑터 테스트가 통과해도 공유 캐시 없는 두 서버가 서로 다른 ISR 결과를 줄 수 있는 이유는 무엇인가?
- 프록시 버퍼링은 최종 HTML 성공 여부와 점진적 RSC/PPR 경험을 어떻게 다르게 바꾸는가?

## 출처

- [Next.js, deploying-to-platforms](https://nextjs.org/docs/app/guides/deploying-to-platforms)

## 관련 문서

- [[NextJS-Self-Hosting]]
- [[NextJS-Config-Cache-Handlers]]
- [[NextJS-Static-Export]]
