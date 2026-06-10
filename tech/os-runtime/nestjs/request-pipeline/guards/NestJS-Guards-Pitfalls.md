---
tags: [nestjs, guard, authn, authz, execution-context]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS Guard 흔한 실수", "Guard 면접 체크포인트"]
---

# NestJS Guards — 흔한 실수와 면접 체크포인트

## 흔한 실수

- **Pipe로 인가 검증**: Pipe는 변환, 검증 계층 — 인가는 Guard. 책임 경계 흐려짐.
- **request 객체에 mutate 후 의존**: Guard가 `request.user`를 주입하는 건 표준이지만, 너무 많은 mutation은 추적 어려움. Param Decorator로 명시적 추출이 깔끔.
- **getAllAndOverride 대신 get**: 메서드 데코레이터로 클래스 데코레이터를 덮어쓰려는 의도면 `getAllAndOverride` 필수.
- **APP_GUARD 없이 useGlobalGuards로 DI 시도**: DI 안 됨 — `APP_GUARD` 토큰으로 등록해야 ConfigService, JwtService 같은 Provider 주입 가능.
- **무거운 검증을 Guard 앞쪽에**: DB, 외부 호출 Guard를 가벼운 JWT Guard보다 앞에 두면 단락 효과 사라짐.

## 면접 체크포인트

- Guard가 요청 파이프라인 어디에 위치하는지, Middleware와의 차이
- `ExecutionContext`로 http/ws/rpc 분기 처리
- `Reflector` + `SetMetadata`로 메서드/클래스 메타데이터 읽기 (`getAllAndOverride` vs `getAll`)
- Guard 체인 단락 평가 — 순서가 비용 효율에 미치는 영향
- `APP_GUARD` 토큰 등록 vs `useGlobalGuards` 차이 (DI 가능/불가)
- 401 vs 403 — 인증 실패와 인가 실패 구분
- `@Public()` 패턴으로 전역 Guard 우회
