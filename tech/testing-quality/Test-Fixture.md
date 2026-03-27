---
tags: [testing, fixture]
status: done
category: "테스트&품질(Testing&Quality)"
aliases: ["Test Fixture", "테스트 픽스처"]
---

# Test Fixture 전략

테스트에 필요한 사전 조건(데이터, 환경, 상태)을 일관되게 준비하는 방법이다. 좋은 fixture 전략은 테스트를 읽기 쉽고, 유지보수하기 쉽게 만든다.

## Fixture란

테스트 실행 전에 필요한 모든 준비물:
- **테스트 데이터** — 엔티티 객체, DB 레코드
- **목(Mock) 객체** — 외부 의존성의 대역
- **환경 설정** — 환경변수, 설정값

## Factory 패턴

가장 권장되는 방식. 테스트 데이터를 생성하는 팩토리 함수를 만든다.

**설계 원칙:**
- `createMockAccount()`, `createMockStudent()` 등 엔티티별 팩토리 함수
- 기본값을 제공하되 오버라이드 가능하게 설계
- 자동 증가 ID로 각 호출마다 고유한 데이터 생성 (`let counter = 100; return BigInt(counter++)`)
- `resetIdCounter()` 함수로 테스트 간 ID 카운터 초기화

**장점:**
- 테스트에서 관심 있는 필드만 명시하면 됨
- 엔티티 구조 변경 시 팩토리만 수정

## Mock 계층 구성

외부 의존성을 계층별로 모킹한다.

**DB 계층 Mock:**
- ORM(Prisma) 클라이언트의 모든 모델별 CRUD 메서드를 mock
- Query Builder(Kysely)는 체이닝 가능한 mock 객체로 구성
- `execute()` 호출 시 큐에 넣어둔 결과를 반환하는 방식

**인프라 Mock:**
- 메일 서비스, 외부 API 클라이언트 등 사이드이펙트가 있는 인프라를 mock
- 환경변수를 테스트용 값으로 교체 (예: `JWT_SECRET=test-secret`)
- 로거는 에러/fatal 수준만 출력하도록 제한

## tRPC Caller Factory

HTTP 서버를 띄우지 않고 tRPC 프로시저를 직접 호출하는 패턴이다.

- `createPublicCaller()` — 비인증 프로시저 테스트
- `createAuthenticatedCaller(accountId, name)` — 인증된 사용자 컨텍스트
- `createScopedCaller(accountId, name, orgId, orgName)` — 조직 스코프 컨텍스트
- Mock Express Request/Response 객체로 HTTP 없이 테스트

**장점:** 네트워크 오버헤드 없이 빠르게 테스트, 컨텍스트를 자유롭게 조작 가능

## Setup 파일 구성

Vitest의 `setupFiles`로 모든 테스트 전에 공통 mock을 설정한다.

**setup에서 처리하는 것:**
- 전역 mock 설정 (`vi.mock()`)
- 환경변수 오버라이드
- 로거 설정
- ORM 클라이언트 mock 주입

## 면접 포인트

Q. 테스트 데이터는 어떻게 관리하는가?
- Factory 패턴으로 엔티티별 생성 함수, 자동 증가 ID로 고유성 보장
- 기본값 제공 + 오버라이드 가능하여 테스트에서 관심 필드만 명시

Q. 외부 의존성은 어떻게 처리하는가?
- DB: ORM 클라이언트 전체를 mock하여 실제 DB 없이 테스트
- 인프라: 메일, 외부 API 등을 mock하여 사이드이펙트 제거

## 관련 문서
- [[Test-Isolation|Test isolation]]
- [[Service-Layer-Testing|서비스 레이어와 테스트 경계]]
