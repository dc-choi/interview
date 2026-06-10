---
tags: [nestjs, guard, authn, authz, execution-context]
status: index
category: "OS & Runtime - NestJS"
aliases: ["NestJS Guards", "CanActivate"]
---

# NestJS Guards — 인증/인가 계층

`CanActivate` 인터페이스를 구현하는 Provider. **요청이 핸들러에 도달하기 전 단계**에서 `true`를 반환해야 통과, `false` 또는 throw 시 즉시 단락(short-circuit)되어 핸들러는 실행되지 않음.

- [[NestJS-Guards-Basics|파이프라인 위치, CanActivate 시그니처, ExecutionContext 활용]]
- [[NestJS-Guards-Patterns|JWT 인증, Reflector 기반 Role 인가, @Public() 우회 패턴]]
- [[NestJS-Guards-Scope|Guard 체인 단락 평가, 적용 범위(전역/모듈/컨트롤러/메서드), throw vs return false]]
- [[NestJS-Guards-Pitfalls|흔한 실수와 면접 체크포인트]]

## 관련 문서

- [[NestJS|NestJS 요청 파이프라인]]
- [[NestJS-ExecutionContext|ExecutionContext 심화]]
- [[NestJS-Custom-Decorator|커스텀 데코레이터 (SetMetadata, Reflector)]]
- [[NestJS-Pipes|Pipes (Guard 다음 단계)]]
