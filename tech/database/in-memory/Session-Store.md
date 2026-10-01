---
tags: [database, redis, cache]
status: done
verified_at: 2026-09-30
category: "Data & Storage - Cache & KV"
aliases: ["Session Store"]
---

# Session Store

세션 스토어는 여러 애플리케이션 인스턴스가 로그인 상태를 공유하는 서버 측 저장소다. 클라이언트에는 추측하기 어려운 세션 ID만 두고, 사용자 ID와 권한 같은 의미 있는 상태는 서버에 저장한다. 이 구조는 로드 밸런서의 sticky session 없이도 어느 인스턴스에서든 같은 세션을 확인하게 한다.

## 저장 계약

- **키**: CSPRNG로 만든 불투명한 세션 ID에 namespace와 schema version을 붙인다. ID에 사용자 정보나 PII를 넣지 않는다.
- **값**: 사용자 ID, 권한 version, 생성 시각, 마지막 활동 시각과 필요한 최소 상태만 둔다. 사용자 정본은 DB에 남긴다.
- **TTL**: idle timeout과 absolute timeout을 모두 서버에서 적용한다. 활동 때 idle TTL을 연장하더라도 최초 생성 기준 absolute timeout은 넘기지 않는다.
- **원자성**: 세션 값과 TTL을 한 연산으로 기록한다. 값만 남거나 TTL만 빠지는 부분 실패를 만들지 않는다.
- **폐기**: 로그아웃과 만료 시 서버 측 세션을 삭제한다. 로그인, 권한 상승과 비밀번호 변경 뒤에는 기존 ID를 폐기하고 새 ID를 발급한다.

JWT 같은 self-contained token의 blacklist가 꼭 필요하면 원문 token 대신 `jti`나 token hash를 키로 저장하고, token의 남은 유효기간만큼 TTL을 둔다. 즉시 철회가 기본 요구라면 blacklist가 계속 커지는 구조보다 짧은 access token과 회전 가능한 refresh session을 우선 검토한다.

## Redis 구현 패턴

- 세션은 거의 모든 요청에서 조회되는 가장 잦은 읽기이고 만료 요구가 붙어 있다. DB에 두면 만료 컬럼과 정리 작업을 직접 운영해야 하지만 인메모리 저장소는 TTL이 정리를 대신한다.
- 기본형은 `SET session:<id> <userId> EX 1800`이다. 조회 결과가 nil이면 만료된 세션으로 보고 재인증을 요구한다.
- 로그인 시점부터 고정 TTL만 두면 활동 중인 사용자가 결제 직전에 끊긴다. 요청 처리 미들웨어에서 idle TTL을 다시 거는 슬라이딩 만료를 적용하고, `GETEX session:<id> EX 1800`(6.2+)으로 조회와 연장을 한 왕복에 처리한다. 연장과 별개로 값에 둔 생성 시각이 absolute timeout을 넘었으면 세션을 폐기한다.
- 등급, 로그인 시각, 마지막 활동 시각처럼 필드가 늘고 일부만 읽거나 고치게 되면 Hash로 펼친다. TTL은 키에 한 번 걸고, `HSET` 같은 필드 수정은 기존 TTL을 유지한다. 반대로 String 세션을 `EX` 없이 `SET`으로 덮어쓰면 TTL이 사라져 만료되지 않는 세션이 남는다 ([[TTL|TTL 전략]]).

## 장애와 정합성

- 보호된 요청에서 스토어를 읽지 못하면 인증 성공으로 간주하지 않는다. 장애 시 로그인과 인증 요청이 실패할 수 있으므로 timeout, 재시도 상한과 fallback을 명시한다.
- 복제와 failover가 있어도 최근 쓰기 유실 가능성은 제품과 설정에 따라 다르다. 세션 유실 허용 범위, RPO와 RTO를 정하고 장애 전환을 시험한다.
- 세션 키가 일반 캐시와 eviction 경쟁을 하지 않도록 인스턴스나 memory budget을 분리한다. eviction은 보안 우회가 아니라 강제 로그아웃으로 끝나야 한다.
- 사용자 차단이나 전체 로그아웃을 즉시 반영하려면 사용자별 session index나 권한 version을 두고, 대량 폐기 경로를 함께 설계한다.

## 보안과 운영

- 쿠키에는 `Secure`, `HttpOnly`, 적절한 `SameSite`, 좁은 `Domain`과 `Path`를 적용하고 전체 세션에서 HTTPS를 사용한다.
- 세션 ID 원문을 로그에 남기지 않는다. 필요하면 salted hash로 상관관계만 추적한다.
- 스토어 접근은 사설 네트워크, TLS와 최소 권한으로 제한하고 저장 값의 민감도에 따라 암호화를 적용한다.
- 활성 세션 수, 생성과 폐기율, 만료와 eviction, 조회 지연과 오류율, failover 및 복제 지연을 관측한다.

## 저장소 선택

Redis는 낮은 지연, TTL과 수평 확장이 필요한 세션에 적합하지만 persistence와 복제가 강한 일관성을 자동 보장하지는 않는다. 강한 내구성과 복잡한 조회가 우선이면 RDB를 선택할 수 있다. 어떤 저장소든 세션 데이터만으로 사용자 정본과 감사 기록을 대체하지 않는다.

## 출처

- [OWASP, Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Redis Docs, EXPIRE](https://redis.io/docs/latest/commands/expire/)
- [Redis Docs, Key eviction](https://redis.io/docs/latest/develop/reference/eviction/)
- [Redis Docs, Redis persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)
- [Valkey Docs, GETEX](https://valkey.io/commands/getex/)
- [Valkey Docs, EXPIRE](https://valkey.io/commands/expire/)
- [인프런, Hong, String vs Hash 비교하기 & 캐시의 또다른 사용번 세션 스토어](https://www.inflearn.com/courses/lecture?courseId=343676&unitId=481445)

## 관련 문서

- [[Session]]
- [[TTL|TTL 전략]]
- [[Redis-Memory-Eviction|Redis 메모리와 eviction]]
- [[Redis-Data-Structures|Redis 자료구조]]
