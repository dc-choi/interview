---
tags: [cloudflare, durable-objects, serverless, state, sqlite]
status: done
verified_at: 2026-10-26
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Cloudflare Durable Objects", "Durable Object 상태와 실행"]
---

# Durable Objects: 객체별 상태와 실행

## 객체가 조정의 단위다

Durable Object는 식별 가능한 실행 단위와 그 객체의 영속 저장소를 결합한 Workers 기반 기능이다. 여러 클라이언트가 같은 객체로 요청을 보내 공유 상태를 조정할 수 있다. 채팅방이나 협업 문서처럼 함께 조정할 범위별로 객체를 나누는 설계를 검토할 수 있다.

객체별 저장소는 해당 객체 안에서 접근하며 강한 일관성을 제공한다. 이 설명을 서로 다른 객체 전체에 걸친 트랜잭션 보장으로 확대하지 않는다. 여러 객체로 확장하는 구조와 하나의 객체에 모든 요청을 모으는 구조를 구분한다.

## 메모리와 영속 상태를 구분한다

- Stub을 만드는 것만으로 객체가 실행되지는 않는다. Stub의 메서드를 호출해 요청을 보낼 때 객체의 실행 수명주기가 시작된다.
- 실행 중에는 메모리에 캐시를 둘 수 있지만 hibernation에서는 메모리 상태가 사라진다. 다음 요청에서도 필요한 정보는 영속 저장소에 기록한다.
- Hibernation 뒤 요청이 들어오면 constructor가 다시 실행된다. WebSocket의 연결 유지와 메모리 보존은 같은 보장이 아니다.

운영 제안: 연속 요청만 시험하지 말고 객체가 메모리에서 내려간 뒤에도 저장한 상태를 읽어 복구하는지 확인한다. 요청을 다시 보내는 클라이언트가 있다면 중복 처리 조건도 별도로 정의한다.

## 단일 스레드와 트랜잭션의 범위

실행 모델은 단일 스레드의 협력적 멀티태스킹이다. 단일 스레드라는 이유만으로 비동기 I/O와 외부 시스템까지 포함한 업무가 원자적이라고 가정하지 않는다.

SQLite-backed 객체에서 `sql.exec()`는 SQL을 실행하지만 `BEGIN TRANSACTION`이나 `SAVEPOINT` 같은 트랜잭션 제어문을 실행하는 수단은 아니다. 트랜잭션 API를 사용한다. `transactionSync()`의 callback은 동기적으로 끝나야 하며 Promise를 반환할 수 없고, callback이 예외를 던지면 rollback한다.

운영 제안: 객체 저장소의 갱신과 외부 API 호출을 별도 경계로 보고, 외부 호출의 실패나 재시도에서 중복과 미완료 상태를 어떻게 복구할지 정한다.

## 셀프호스팅과 관리형 서비스의 구분

2026-10-09 공개된 Cloudflare와 Deno의 합류 발표는 celld의 코드와 아이디어를 workerd에 통합해 셀프호스팅을 강화할 계획을 밝혔다. 발표에서 workerd의 기존 Durable Objects 지원은 단일 인스턴스에 제한된다고 설명했고, celld는 여러 머신에 배치와 라우팅, 영속 저장을 연결하는 방향을 다룬다.

이는 통합 계획의 확인이며 관리형 서비스와 자체 운영 환경의 기능 동등성, 데이터 이전이나 운영 복구를 검증한 결과는 아니다. 이전을 검토한다면 API, 저장 데이터와 배포 방식의 호환성, 장애 복구와 운영 책임을 따로 확인한다. 런타임과 호스팅의 지원 계획은 [[Deno-Runtime|Deno 런타임]]에서 구분한다.

## 출처

- [Cloudflare Docs, What are Durable Objects?](https://developers.cloudflare.com/durable-objects/concepts/what-are-durable-objects/)
- [Cloudflare Docs, Lifecycle of a Durable Object](https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/)
- [Cloudflare Docs, SQLite-backed Durable Object Storage](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/)
- [Deno is joining Cloudflare — Cloudflare Blog](https://blog.cloudflare.com/deno-joins-cloudflare)

## 관련 문서

- [[Cloud-Service-Models|클라우드 서비스 모델]]
- [[Deno-Runtime|Deno 런타임과 지원 계획]]
- [[Agent-Email-Interface|Durable Object를 이용한 이메일 에이전트 구조]]
