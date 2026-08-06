---
tags: [messaging, kafka, retry, dlt, spring-kafka]
status: done
verified_at: 2026-08-06
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Kafka Retry DLT", "Kafka 재시도와 DLT", "Non-blocking Retry"]
---

# Kafka 재시도와 DLT 설계

> 상위 인덱스: [[MQ-Kafka|Kafka]]

retry topic은 실패한 메시지를 지연 뒤 다시 소비하기 위해 두는 별도 토픽이고, DLT(Dead Letter Topic)는 재시도 대상이 아니거나 재시도가 끝내 실패한 메시지를 보관하는 최종 실패 토픽이다. 플랫폼 일반 Retry + DLQ 원리는 [[Event-Driven-Patterns|이벤트 드리븐 실전 패턴]]이 정본이고, 이 문서는 Kafka에서 직접 구현할 때의 설계 결정 축과 구현 함정을 다룬다. 프레임워크 동작 서술은 Spring Boot 3.5와 Spring Kafka 3.3 기준이다.

## 문제 — 컨슈머 실패 처리의 표준화

- 컨슈머 실패의 상당수는 일시적이다. 대표 사례가 이벤트 소비 순서 역전: 선행 데이터가 아직 만들어지지 않은 상태에서 후행 이벤트가 먼저 도착해 실패하고, 몇 분 뒤 다시 시도하면 성공하는 패턴이다.
- 유실이 허용되지 않는 도메인(정산, 결제, 재고)에서는 실패하면 로그 남기고 넘어가는 방식이 불가능하므로, 재시도 방식과 최종 실패의 보관 위치, 포맷을 표준화해야 한다. 표준화의 적용 비용이 크면 아무도 안 쓰므로, 어노테이션 한 줄 수준까지 낮추는 것 자체가 설계 목표가 된다.

## 결정 1 — 실패 상태는 Kafka 안에 둔다

인메모리 큐에 실패 메시지를 넣고 스케줄러로 재처리하는 방식은 두 곳이 깨진다.

- 메시지를 큐로 옮기고 리스너가 정상 반환하면 offset이 커밋된다(auto-commit 또는 컨테이너 기본 ack 모드 기준). 실패 상태가 Kafka 밖에만 존재한다.
- 재배포나 비정상 종료 시 대기 메시지가 유실될 수 있고, 실패한 메시지만 골라 되돌릴 수단도 없다 (offset reset은 성공한 메시지까지 함께 되감는다).

실패 상태도 Kafka 토픽(retry topic, DLT)에 두어야 브로커의 내구성과 복구 수단을 그대로 활용한다.

브로커 밖이라도 내구 저장소면 사정이 다르다 — 실패 메시지를 DB 테이블(dead letter table)에 적재하고 운영자가 원인을 해결한 뒤 관리 API로 Kafka에 재발행하는 변형도 유실 없이 성립한다. 실패 조회와 재처리 UI를 DB 위에 얹기 쉬운 대신, 재발행 경로와 중복 방지를 애플리케이션이 직접 유지해야 한다.

## 결정 2 — blocking vs non-blocking 재시도

| 방식 | 동작 | 비용 |
|---|---|---|
| blocking | 리스너 안에서 대기 후 재시도 | 그 파티션의 뒤 메시지가 전부 지연. 대기가 겹치면 max.poll.interval.ms 초과로 컨슈머가 그룹에서 축출되는 2차 장애 |
| non-blocking | 실패 메시지를 retry topic으로 보내고 별도 컨슈머가 지연 후 재소비 | 파티션 순서 역전. 순서 역전과 중복에 안전한 컨슈머가 전제 |

- 분 단위 지연이 필요하면 non-blocking이 사실상 강제다. 순서 의존이 강하고 멱등 처리가 안 되는 컨슈머라면 blocking이 맞는 선택일 수 있다.
- 순서 역전 비용은 원본 좌표(topic, partition, offset)와 멱등 처리로 최종 상태가 수렴하게 설계해 도메인에서 흡수한다.
- Kafka Streams window join이 대안이 못 되는 경우: window는 상대 데이터가 이 시간 구간 안에 온다는 것을 알아야 쓰는 도구다. 도착 시점을 예측할 수 없으면 어떤 window 크기도 보장을 못 주고, 크게 잡을수록 state store만 커진다. 재시도 + DLT 모델은 도착 시점을 몰라도 성립한다.

## 결정 3 — 재시도는 opt-in

- 역직렬화 실패, 비즈니스 검증 실패는 몇 분 뒤 다시 시도해도 똑같이 실패한다. 이런 실패의 재시도는 DLT 도달만 늦추는 장애 은폐다.
- 기본값을 재시도 없음으로 뒤집고, 기다리면 되는 실패라고 코드가 명시한 예외 타입(전용 재시도 예외)만 재시도 대상에 include한다. 그 외 모든 예외는 즉시 DLT로 보낸다.
- 재시도가 의미 있는 실패와 사람이 봐야 하는 실패가 코드에서 명시적으로 구분된다. [[Event-Driven-Patterns#오류 분류 — 재시도 vs 즉시 DLQ|오류 분류(일시 vs 영구)]]와 같은 축이되 기본값의 방향이 반대다: 분류하지 않은 실패는 재시도가 아니라 DLT로 간다.

## 결정 4 — 재시도 정책과 retry topic 수

- 백오프 선택: 실패 원인이 선행 데이터 미도착처럼 도착 예상 시간이 있는 유형이면 지수 백오프보다 고정 지연이 적합하다. 이런 실패는 공유 다운스트림의 회복을 기다리는 게 아니라서 지수 백오프와 jitter가 주는 몰림 분산 이점이 크지 않다. 원인 불명의 외부 장애 회복 대기 유형이라면 기본값은 [[Event-Driven-Patterns|지수 백오프]] 쪽이다.
- retry topic 수: Spring Kafka 3.1 이하는 시도 수보다 하나 적은 수만큼 retry topic(`-retry-0`, `-retry-1`)을 만드는 것이 기본이었다. 3.2부터는 `@RetryableTopic`의 sameIntervalTopicReuseStrategy 기본값이 SINGLE_TOPIC이라 고정 지연이면 `{topic}-retry` 1개로 접힌다 (프로그래밍 방식 RetryTopicConfigurationBuilder는 3.3까지 MULTIPLE_TOPICS 기본, 4.1부터 SINGLE_TOPIC). 버전에 기대지 말고 정책을 어노테이션 기본값에 명시해 리스너당 retry topic 1개를 보장한다. 토픽 수는 곧 운영 비용(모니터링, ACL, 파티션)이다.
- 네이밍은 규칙으로 못 박는다 (예: `retry.{originTopic}`). 단 consumer group이 이름에 없으면 같은 토픽을 여러 그룹이 각자 재시도할 때 retry topic이 충돌한다. 이 충돌은 네이밍에 groupId를 포함하는 opt-in 옵션으로 풀 수 있고, 그 옵션을 넣기 전까지는 사용 제한으로 막아야 하는 잔여 공백이다.

## 결정 5 — DLT는 공통 1개 + 표준 envelope

- 리스너마다 `{topic}-dlt`가 프레임워크 기본이지만, 실패 처리의 뒷단(DB 적재, 알림, 재처리 도구)이 공통이라면 DLT도 공통 1개로 모으는 쪽이 운영이 단순하다.
- 서로 다른 스키마가 한 토픽에 섞이므로 발행 시점에 표준 envelope로 감싼다. 필수 필드는 둘이다.
  - 원본 좌표 — retry topic이 아니라 origin 기준의 topic, partition, offset
  - payload 원문 — 정상 payload는 파싱 가능한 JSON으로, 역직렬화 실패 payload는 raw 문자열로 최대한 원문 그대로
- DLT는 종착지가 아니라 사람이 확인한 뒤 원본 topic으로 재발행(re-drive)해 정상 소비 경로를 태우는 대기열이다. envelope에 원문과 좌표를 보존하는 이유가 재발행이다.
- 선후관계가 중요한 이벤트는 단순 재발행만으로 부족할 수 있다 — 재발행 시점에는 이미 다른 이벤트가 앞질러 소비됐을 수 있으므로, 처리 단계와 선행 단계 완료 여부를 기록해 후속 단계가 선행 완료 이후에만 실행되게 게이트하는 방법이 있다.
- 발행 라이브러리의 책임은 DLT 발행까지다. DLT 소비(저장, 알림, 재처리)는 read-side로 분리해야 모든 컨슈머 서비스가 DB와 알림 의존성을 끌고 들어가지 않는다.

## Spring Kafka 구현 지도

- 리스너가 붙이는 진입점은 `@RetryableTopic`을 감싼 meta-annotation으로 만든다. 정책 기본값(횟수, 백오프, SINGLE_TOPIC, opt-in 예외)을 어노테이션에 고정하고 `@AliasFor`로 조정 가능한 값만 연다. 기본값을 벗어나는 코드는 리뷰에서 바로 보인다.

```java
@CommonKafkaRetry(backoff = @Backoff(delayExpression = "${kafka.retry.order-completed.delay-ms}"))
@KafkaListener(topics = "${kafka.consumer.order-completed.topic}", groupId = "...")
public void consume(ConsumerRecord<String, OrderCompleted> record) {
    orderCompletedService.completedOrder(record.value());
}
```

- 네이밍과 DLT payload는 서로 다른 확장 포인트에 있다. `RetryTopicConfigurationSupport`를 상속해 `RetryTopicComponentFactory`에서 네이밍 전략(RetryTopicNamesProviderFactory)과 DeadLetterPublishingRecovererFactory 두 곳만 교체한다.
- 네이밍은 topic 이름만 바꾸면 안 된다. retry 컨슈머의 consumer group, client-id, endpoint id에도 일관된 suffix를 줘야 main 컨슈머와 그룹이 분리되고 모니터링에서 어느 컨슈머가 retry인지 식별된다.
- `DeadLetterPublishingRecoverer`는 retry hop 발행과 DLT 발행이 같은 코드 경로다. `createProducerRecord`를 override해 목적지가 공통 DLT일 때만 envelope로 교체하고, retry hop은 기본 발행 흐름을 유지한다.
- 발행 경로 전체(ObjectMapper, ProducerFactory, KafkaTemplate)는 전용 빈으로 격리해 호스트 서비스의 직렬화 설정에 영향받지 않게 한다. 날짜 포맷처럼 소비 측이 의존하는 값은 라이브러리가 고정한다.

## 구현 함정 — 정상 메시지만 테스트하면 놓친다

1. **역직렬화 실패 원문 소실**: 역직렬화가 실패한 레코드는 record.value()가 null이고 원문은 raw byte[]에만 있다. 역직렬화된 값으로만 발행하면 분석과 재처리에 필요한 실패 원문이 사라지고, 반대로 raw byte[]를 JsonSerializer로 보내면 Base64로 이중 직렬화되며 StringSerializer에 byte[]가 들어가면 ClassCastException이 난다. 해법은 타입별 serializer 위임(DelegatingByTypeSerializer): byte[]는 ByteArraySerializer, 일반 객체는 JsonSerializer, 문자열 key는 StringSerializer. 최종 DLT에서는 raw key/value가 있으면 UTF-8 문자열로 변환해 우선 보존한다.
2. **확장 포인트 교체는 숨은 wiring까지 책임진다**: createProducerRecord에는 예외 객체가 전달되지 않아 진입점 accept()에서 ThreadLocal에 보관했다 꺼내는 우회가 필요한데, 이는 두 메서드가 같은 리스너 스레드에서 실행된다는 전제를 깐다. retry topic의 backoff 인프라는 스케줄러 빈을 요구한다(RetryTopicSchedulerWrapper, 단일 TaskScheduler, taskScheduler 이름 빈 순서로 탐색하고 없으면 컨텍스트가 실패). Boot는 retry topic 전용 스케줄러를 등록하지 않고 자동 구성 taskScheduler는 @EnableScheduling이 있을 때만 생기므로, 라이브러리가 RetryTopicSchedulerWrapper로 전용 스케줄러를 제공해야 한다 — 이 래퍼는 다른 프레임워크가 쓰는 Boot 스케줄러 자동 구성을 깨지 않기 위한 장치다. 프레임워크 확장점을 갈아끼울 때는 메서드 시그니처만이 아니라 실행 전제와 보조 빈까지 확인한다.
3. **원본 좌표와 DLT partition의 혼동**: retry topic을 거친 레코드의 record.topic()/partition()/offset()은 원본이 아니라 retry topic의 좌표다. 원본 좌표는 Spring Kafka가 남기는 ORIGINAL_TOPIC/PARTITION/OFFSET 헤더의 첫 번째 값에서 복원해야 재처리 시 원본 추적이 된다. 반대로 공통 DLT에 발행할 때 원본 partition을 그대로 지정하면 안 된다 — 원본 토픽과 DLT의 파티션 수가 다를 수 있다. partition은 null로 두어 producer가 고르게 하고, 원본 좌표는 envelope 필드로 보존한다.

## DLT 컨슈머의 방어선

- 원본 좌표(topic + partition + offset)에 UNIQUE 제약을 걸어 저장 자체가 원자적 중복 제거가 되게 한다(INSERT 충돌은 성공한 중복으로 처리). 조회로 확인한 뒤 저장하는 check-then-act는 [[Idempotent-Consumer|멱등 컨슈머]]가 경고하는 경쟁 버그다. 좌표를 확인할 수 없는 깨진 레코드는 유실보다 중복이 낫다고 보고 우선 저장한다.
- 저장 실패 시 offset을 진행하지 않는다. 지수 백오프로 컨테이너를 pause/resume(ExponentialBackOff + ContainerPausingBackOffHandler)하며 저장에 성공한 레코드만 커밋한다.
- 저장 컬럼 한도(TEXT byte)를 넘는 payload는 UTF-8 byte 기준으로 축약해 영구 실패 레코드가 되지 않게 한다.
- 알림은 부가 경로다. 일시 실패는 재시도하되 끝내 실패해도 DB의 실패 기록은 남는다. 저장이 본선이고 알림이 곁가지라는 순서를 뒤집지 않는다.

## 테스트 — wire format을 단언한다

- 전용 ObjectMapper, Serializer, Template처럼 wiring을 갈아끼우는 작업은 잘못돼도 어디서도 예외가 나지 않는다. 깨진 포맷이 조용히 발행되고 한참 뒤 다른 서비스의 역직렬화 실패로 나타난다.
- 빈 wiring이 아니라 직렬화된 바이트(wire format) 자체를 단언하는 회귀 테스트를 둔다. 날짜 포맷 하나만 틀어져도 이 테스트가 먼저 깨진다.
- end-to-end는 @EmbeddedKafka 통합 테스트로 재시도 발행부터 DLT envelope의 origin 필드까지 검증하고, 분 단위 backoff는 테스트에서만 ms 단위로 override한다.

## 체크포인트

- non-blocking retry 도입 전 첫 질문: 이 컨슈머는 순서 역전과 중복에 안전한가. 아니라면 blocking이 맞을 수 있다.
- 재시도 기본값은 opt-in인가 전부 재시도인가. 분류하지 않은 실패는 어디로 가는가.
- DLT envelope에 원본 좌표와 원문이 남는가. 재발행(re-drive) 경로까지 설계돼 있는가.
- retry topic 네이밍에 consumer group이 필요한 구조인가.
- NestJS(KafkaJS) 스택이라면: @RetryableTopic 같은 프레임워크 지원이 없으니 retry topic 발행, 지연 소비, DLT envelope를 직접 구현할 준비가 됐는가. 결정 축(재시도 위치, opt-in 분류, envelope 설계)과 함정 1, 3(원문 소실, 원본 좌표 혼동)은 직접 구현에서도 그대로 마주치고, 함정 2는 Spring 확장점 한정이다.

## 관련 문서

- [[Event-Driven-Patterns|이벤트 드리븐 실전 패턴 (Retry + DLQ 일반 원리, 오류 분류)]]
- [[MQ-Kafka-Event-Ordering|Kafka 순서 보장]]
- [[Idempotent-Consumer|멱등 컨슈머]]
- [[At-Least-Once|At-Least-Once]]
- [[Backfill-Resource-Isolation|Replay와 Backfill 자원 격리]]
- [[MQ-Kafka-Consumer|Kafka 컨슈머 구현 (NestJS)]]

## 출처

- [Spring Kafka Reference — Non-Blocking Retries](https://docs.spring.io/spring-kafka/reference/retrytopic.html)
- [실패한 메시지는 어디로 가야 할까? Kafka Retry/DLT 설계와 운영에서 밟은 3가지 함정 — 여기어때 기술블로그](https://techblog.gccompany.co.kr/%EC%8B%A4%ED%8C%A8%ED%95%9C-%EB%A9%94%EC%8B%9C%EC%A7%80%EB%8A%94-%EC%96%B4%EB%94%94%EB%A1%9C-%EA%B0%80%EC%95%BC-%ED%95%A0%EA%B9%8C-kafka-retry-dlt-%EC%84%A4%EA%B3%84%EC%99%80-%EC%9A%B4%EC%98%81%EC%97%90%EC%84%9C-%EB%B0%9F%EC%9D%80-3%EA%B0%80%EC%A7%80-%ED%95%A8%EC%A0%95-dd7a71a07954)
- [Kafka를 사용해도 데이터 정합성은 자동으로 보장되지 않는다 — velog](https://velog.io/@shyeon4643/Kafka%EB%A5%BC-%EC%82%AC%EC%9A%A9%ED%95%B4%EB%8F%84-%EB%8D%B0%EC%9D%B4%ED%84%B0-%EC%A0%95%ED%95%A9%EC%84%B1%EC%9D%80-%EC%9E%90%EB%8F%99%EC%9C%BC%EB%A1%9C-%EB%B3%B4%EC%9E%A5%EB%90%98%EC%A7%80-%EC%95%8A%EB%8A%94%EB%8B%A4)
