---
tags: [nestjs, devtools, dependency-injection, diagnostics]
status: done
verified_at: 2026-10-01
category: "OS & Runtime - NestJS"
aliases: ["NestJS Devtools와 진단"]
---

# NestJS Devtools와 진단

Devtools는 Nest가 실제 등록한 module/provider/entrypoint와 enhancer 연결을 시각화한다. 정적 설계도와 현재 앱 구성의 차이를 찾는 도구이며 요청의 성공, 권한 정책의 타당성, 외부 DB 준비 완료를 증명하지는 않는다.

## 로컬 introspection과 playground

- `NestFactory.create(AppModule, { snapshot: true })`로 부팅 중 graph metadata를 수집하고 `DevtoolsModule.register({ http: ... })`로 introspection server를 켠다. 기본 포트는 8000이며 production에서는 module/server를 노출하지 않는다.
- Playground는 인증을 우회해 provider나 endpoint 관련 코드를 실행할 수 있다. startup마다 새 sandbox session token이 발급되므로 token과 server 접근을 보호한다. 정상 API 권한 검사를 통과했다는 테스트로 취급하지 않는다.
- dependency bootstrap 실패는 `abortOnError: false`와 `PartialGraphHost.toString()`으로 partial graph를 저장해 진단할 수 있다. 정상 init/listen 뒤에는 `SerializedGraph`를 export한다. graph 공유 전 앱 내부 구조의 공개 범위를 확인한다.
- Route explorer는 HTTP뿐 아니라 GraphQL, gRPC, WebSocket entrypoint와 실제 guard/interceptor/pipe의 연결을 보여준다. bootstrap analyzer의 class instantiation timing은 전체 외부 호출 지연 측정과 구분한다.

## CI graph와 preview의 한계

현재 공식 문서는 CI/CD graph publishing을 Enterprise 기능으로 설명한다. 구매 여부와 별개로 다음 실행 계약을 이해한다.

- `snapshot: true, preview: true`는 graph를 만들되 constructor와 lifecycle hook을 실행하지 않는다. DB 없이 graph를 분석하는 장점이 있지만 실제 앱 startup나 resource readiness 검증을 대체하지 않는다.
- GraphPublisher는 repository/owner/current SHA/target SHA/branch/trigger를 받아 snapshot을 공개한다. 비교 대상 graph가 이미 registry에 있어야 구조 변화 report가 생성된다.
- API key는 CI secret으로 전달하고 fork PR에서 token 접근을 분리한다. graph publishing이 외부 전달이라는 사실도 프로젝트의 공개 범위에 맞춰 결정한다.
- scope 변화, guard 연결 누락 같은 graph 차이는 검토 신호다. 통합/e2e 검증과 현재 코드의 정책 판단을 함께 사용한다.

## 관련 문서

- [[NestJS-Cold-Start-Optimization|부팅 비용 측정]]
- [[NestJS-Circular-Dependency|DI 순환 의존]]
- [[NestJS-Lifecycle-Hooks|앱 초기화]]

## 출처

- [NestJS — Devtools overview](https://docs.nestjs.com/devtools/overview)
- [NestJS — Devtools CI/CD](https://docs.nestjs.com/devtools/ci-cd-integration)
