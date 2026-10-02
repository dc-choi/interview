---
tags: [nestjs, authentication, storage, concurrency]
status: done
verified_at: 2026-10-01
category: "OS & Runtime - NestJS"
aliases: ["NestJS 인증 상태 저장소"]
---

# NestJS 인증 상태 저장소

인증 상태는 singleton store를 여러 인스턴스가 공유하고, 읽기 때 만료를 적용하며, token 사용/회전/폐기를 조건부 쓰기로 결정해야 한다. 애플리케이션 업무 transaction과 별도로 기록한다.

## 등록과 계약 선택

Session, Refresh, MFA, Magic, OIDC state, Email의 저장소 계약을 `AuthenticationStorage.registerSource()`에 이름별로 등록한다. 한 class가 여러 계약을 구현할 수 있다. 생성자에서 등록하는 singleton provider를 사용한다. 중복은 explicit replace가 없으면 거부하고 module 초기화 이후 registry는 잠긴다.

production에서 사용하는 계약에 공유 store가 없으면 시작 오류다. `allowInMemoryStorage: true`는 restart 때 MFA와 세션 등 상태를 잊고 인스턴스끼리 공유하지 못하는 선택이다. 로그인 경로는 MFA 확인을, 전체 폐기는 session/refresh store를 사용하므로 UI에서 해당 기능을 숨겼다고 store가 불필요해지지 않는다. 사용하지 않는 계약의 미등록 오류가 처음 접근 때 드러날 수도 있다.

store 메서드는 애플리케이션 transaction 인자를 받지 않는다. 업무 transaction rollback과 함께 이미 수행한 인증 폐기를 되돌리는 구조로 만들지 않는다.

## 원자성이 필요한 동작

| 상태 | 필요한 쓰기 계약 |
|---|---|
| 세션 touch | 존재하는 row만 update, lastActive 단조 증가, 삭제된 row를 upsert로 부활시키지 않음 |
| 세션 delete/rotate | 삭제한 row 여부를 반환해 동시 rotation 승자 한 명만 새 세션 발급 |
| refresh 사용 | unused 조건부 update, used token은 한 번만 승리 |
| refresh family 폐기 | 폐기와 경쟁하며 늦게 삽입된 후속 token까지 family 폐기가 적용됨 |
| TOTP 저장 | 기존 lastStep을 낮추지 않는 UPSERT/GREATEST |
| TOTP step claim | 이전보다 큰 step만 conditional update |
| recovery code 소비 | 해당 code만 conditional delete, 한 번만 성공 |
| recovery code 교체 | 기존 삭제와 새 삽입을 한 transaction에서 처리 |
| magic/OIDC/email token 소비 | purpose까지 일치하는 DELETE RETURNING 등 한 동작 |

MFA 실패 제한은 실패 row를 **먼저 commit한 뒤** 별도 statement로 횟수를 센다. 삽입과 count를 하나의 transaction 안에 묶어 병렬 실패가 서로의 미commit row를 못 보는 구조를 피한다.

회전/소비 메서드는 read 후 별도 write로 구현하지 않는다. 서로 다른 연결에서 두 caller가 동일한 읽기 결과를 얻을 수 있기 때문이다. 조건은 DB가 실제로 쓰는 statement 안에 있어야 한다.

## ORM 구현 경계

- TypeORM `save()`가 row를 읽고 쓰거나 upsert하면 폐기된 세션을 복원할 수 있다. touch에는 update와 affected를 사용한다.
- Prisma는 updateMany/deleteMany의 count로 승자를 확인하고 TOTP의 GREATEST 등 표현할 수 없는 동작은 parameterized raw query를 사용한다.
- 단일 row delete에서 not-found는 expected loser다. Prisma P2025 등만 해당 결과로 바꾸고 다른 DB 장애는 숨기지 않는다.
- raw query의 snake_case 반환과 model의 camelCase 필드를 명시적으로 매핑한다.
- 만료 row는 삭제 job을 기다리지 않고 무효다. pending token은 만료와 최대 개수(기본 100,000) 관리가 필요하며 초과 시 가장 이른 만료 항목부터 정리한다.

## 검증해야 할 경쟁

`@nestjs/authentication/testing`의 contract cases는 store의 수명, rotation, 단일 소비와 조건부 쓰기를 확인하는 근거다. 동시에 여러 연결을 사용하는 실제 DB pool에서 concurrency cases를 실행해야 한다. PGlite의 단일 연결에서 순서대로 성공한 결과만으로 다중 인스턴스 경쟁을 입증할 수 없다.

인증 복구 token, 암호화 key와 raw credential은 log/backup 접근 범위까지 관리한다. DB 공유만으로 token 재사용 탐지가 자동 완성되지는 않는다.

## 출처

- [NestJS Documentation, Authentication](https://docs.nestjs.com/security/authentication)

## 관련 문서

- [[NestJS-Authentication]]
- [[NestJS-Account-Recovery-and-MFA]]
