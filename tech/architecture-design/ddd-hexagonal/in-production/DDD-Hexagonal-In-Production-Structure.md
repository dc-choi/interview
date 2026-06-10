---
tags: [architecture, ddd, hexagonal, bounded-context, spring, production]
status: done
category: "아키텍처&설계(Architecture&Design)"
aliases: ["DDD 헥사고날 구조", "멀티 바운디드 컨텍스트 디렉토리"]
---

# DDD + Hexagonal — 구조와 통신 규칙

## 왜 두 패턴을 함께 쓰는가

두 패턴은 해결하는 문제가 다르므로 **상호보완적**이다.

| 패턴 | 해결하는 문제 |
|---|---|
| **Hexagonal** | 외부 기술과 내부 비즈니스의 경계 — 기술 독립성 |
| **DDD** | 비즈니스 복잡성 — 도메인 모델 중심 설계 |

결합의 결과: **비즈니스 규칙이 프레임워크, 프로토콜과 무관하게 유지된다.** 같은 비즈니스 로직을 REST, gRPC, CLI, Kafka consumer, cron에서 동일하게 재사용 가능.

## 적용 판단 — 소프트웨어의 두 가치

소프트웨어가 만드는 가치는 두 종류다.

1. **현재 요구사항 충족** — MVC 프레임워크가 최적화돼 있다
2. **미래 요구사항 대응** — DDD + Hexagonal이 비용을 투자하는 영역

일회성 프로젝트에는 1번만 있으면 되므로 헥사고날은 과한 구조다. 수년간 유지보수할 코어 서비스에서는 2번의 가치가 누적되어 회수가 크다.

## Port/Adapter 안에서 DDD 구성요소의 위치

```
domain/                     # 순수 도메인 (프레임워크 import 금지)
  Entity                    # 식별자로 동일성 판단
  Value Object              # 값으로 동일성 판단, 불변
  Aggregate Root            # 상태 변경 진입점, 트랜잭션 경계
  Domain Event              # 도메인 안에서 일어난 "사실"
application/                # 애플리케이션 서비스 (조율만)
  port/
    inbound/                # 유스케이스 인터페이스
    outbound/               # 리포지토리, 외부 API 포트
  service/                  # 유스케이스 구현 = 도메인 모델 조율 + TX 경계
adapter/
  inbound/                  # REST, gRPC, CLI, Kafka consumer, Cron
  outbound/                 # JPA 구현, 외부 API 클라이언트, 메시지 발행자
```

**핵심 원칙**: 도메인 로직은 Entity/Aggregate **안**에, 서비스는 **조율만**. 서비스가 if/else 분기로 규칙을 전부 다루기 시작하면 "빈약한 도메인 모델(anemic model)" 증상.

## 멀티 바운디드 컨텍스트 디렉토리 구조

단일 모듈에 모든 도메인을 섞지 않고 **컨텍스트별 수직 슬라이스**로 나눈다.

```
bootstrap/
  CommerceApplication.java
  config/
order/                      # 바운디드 컨텍스트 1
  adapter/
  application/
  domain/
product/                    # 바운디드 컨텍스트 2
  ...
address/                    # 바운디드 컨텍스트 3
  ...
```

**컨텍스트 간 통신 규칙** (이게 무너지면 MSA를 해도 모놀리스):

- 같은 DB 테이블을 두 컨텍스트가 직접 쓰지 않는다
- 컨텍스트 간에는 **도메인 이벤트** 또는 **공개 API(포트)** 로만 통신
- 컨텍스트 내부 엔티티는 **외부로 노출 금지** (DTO/응답 캐리어로 변환)

## Tell, Don't Ask — 모델에게 메시지 보내기

서비스가 모델의 상태를 읽어 판단하고 setter로 바꾸는 패턴 대신, **모델이 스스로 상태를 바꾸게** 한다.

나쁜 패턴 (서비스에 규칙 누적):
```java
if (order.getStatus() == CREATED && order.getPaid() == true) {
  order.setStatus(CONFIRMED);
  order.setConfirmedAt(now);
}
```

좋은 패턴 (모델이 규칙을 안다):
```java
order.confirm();   // 내부에서 상태 검증 + 전환 + 이벤트 발행
```

서비스의 책임은 3단계로 축소된다:
1. DTO → 도메인 모델 매핑
2. 모델에 메시지 전달 (`confirm()`, `cancel()`, `decorate(visitor)`)
3. 리포지토리로 영속화 + 트랜잭션 커밋
