---
tags: [messaging, aws, sns, pubsub, fanout, decoupling, saa-c03]
status: done
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["SNS", "Amazon SNS", "Simple Notification Service"]
---

# Amazon SNS (Simple Notification Service)

AWS 관리형 **Pub/Sub** 메시징. Topic을 중심으로 다수 Subscriber에게 **Fan-out** 전달. 단순 라우팅, 푸시, SMS, 이메일까지 통합. **Push 기반**(SQS의 Polling 대비)으로 발행 즉시 Subscriber로 메시지가 전달된다. AWS Decoupling 3종(SQS=Queue / SNS=Pub-Sub / Kinesis=Real-time Streaming) 중 Pub-Sub 모델.

## Topic이 정의하는 것

- **메시지를 게시할 수 있는 대상 / 받을 수 있는 대상** (Topic Policy)
- **암호화 여부** (KMS 키 연동)
- **메시지 전송 정책** (재시도, 타임아웃, DLQ)

## 핵심 모델 — Topic / Subscription / Message

| 개념 | 의미 |
|------|------|
| **Topic** | 채널 (Standard / FIFO) |
| **Publisher** | `Publish` API로 메시지 발행 |
| **Subscription** | Topic에 연결된 수신자 |
| **Subscriber Protocol** | SQS, Lambda, HTTPS, Email, SMS, Mobile Push, Kinesis Firehose |

Publisher가 발행하면 모든 Subscription에 **자동 fan-out** — 1:N 메시지 분배.

## Standard vs FIFO Topic

| 측면 | Standard | FIFO |
|------|----------|------|
| 처리량 | 거의 무제한 | 300 msg/s (배치 3,000) |
| 전달 보장 | At-least-once | Exactly-once processing |
| 순서 | Best-effort | MessageGroupId 단위 엄격 |
| Subscriber | SQS, Lambda, HTTP, Email, SMS, Mobile | **SQS FIFO만** |
| 중복 제거 | — | Content-based 또는 explicit ID |
| Topic 이름 | 자유 | `.fifo` 접미사 |

FIFO Topic의 Subscriber는 SQS FIFO만 — 다른 프로토콜 미지원. 결제, 상태 변경처럼 순서, 중복 보장이 필수일 때.

## Fan-out 패턴 — SNS + 다수 SQS

가장 흔한 아키텍처:

```
Producer
  → SNS Topic (OrderEvents)
       ├─ SQS (이메일 발송 워커)
       ├─ SQS (재고 차감 워커)
       ├─ SQS (분석 파이프라인)
       └─ Lambda (알림 푸시)
```

장점:
- Producer는 한 번만 발행, 라우팅은 SNS, SQS가
- 각 Subscriber가 자기 속도로 SQS Pull (백프레셔 격리)
- Subscriber 추가, 삭제가 Producer에 영향 없음
- SQS DLQ로 소비 실패 안전 격리
- 다수 SQS Queue에 직접 fan-out하던 Producer 로직이 비정상 종료/실패해도 일부 Queue만 수신하는 문제 해소 — SNS가 책임지고 전 Subscriber에 전달

### 대표 예시 — S3 Event Fan-out

S3는 버킷당 동일 이벤트에 1개 알림 대상만 직접 지정 가능. 다수 소비자에게 fan-out하려면:

```
S3 Event (단일 규칙) → SNS Topic → 다수의 SQS Queue / Lambda
```

이 패턴이 SAA에서 자주 나오는 fan-out 시나리오. SNS → SQS 쓰기를 허용하는 IAM Policy(Topic Subscription에 SQS 자동 권한 부여)도 필수 구성.

## Message Filtering — Subscription 단위

JSON 정책으로 **Subscription에서 받을 메시지 필터링** — Topic은 모두에게 broadcast하지만 필터로 거름:

```json
{
  "order_type": ["premium", "vip"],
  "amount": [{ "numeric": [">=", 10000] }]
}
```

Publisher가 `MessageAttributes`(또는 message body, 2023+)에 키-값을 붙이면 Subscription 필터가 매칭한 것만 전달.

| 연산자 | 예 |
|--------|-----|
| Exact | `["premium"]` |
| Anything-but | `[{"anything-but": ["test"]}]` |
| Numeric | `[{"numeric": [">", 100]}]` |
| Prefix | `[{"prefix": "order_"}]` |
| Exists | `[{"exists": true}]` |

연산자가 EventBridge보다 단순. 풍부한 필터, 스키마, 리플레이가 필요하면 [[EventBridge]].

## 전달 보장과 재시도

- **At-least-once** — 동일 메시지 2번 이상 전달 가능, 소비자 멱등성 필수
- **재시도 정책**: HTTP/S Subscriber에 한해 3회 즉시 재시도 + 지수 백오프 최대 7일까지
- **DLQ** — Subscription 단위 SQS DLQ 설정. 모든 재시도 실패 시 이동

## 메시지 크기와 한도

| 항목 | 값 |
|------|-----|
| 메시지 크기 | 최대 **256KB** (대용량은 SNS Extended Client + S3) |
| Topic 수 | 계정, 리전당 100,000 |
| Subscription/Topic | 12,500,000 |
| 처리량 | Standard 무제한, FIFO 300/3,000 msg/s |

대용량은 S3에 페이로드 업로드 + SNS는 S3 키만 — Extended Client 라이브러리.

## SNS vs EventBridge — 선택 기준

| 기준 | SNS | EventBridge |
|------|-----|-------------|
| 라우팅 | 토픽 fanout | Rule 기반 콘텐츠 매칭 |
| 필터 | Subscription 단위 (단순) | Rule 단위 (풍부) |
| 스키마 | 없음 | Schema Registry |
| 리플레이 | 불가 | Archive & Replay |
| SaaS 연동 | — | Partner Event Bus |
| 처리량 | 매우 높음 | 리전 TPS 제한 |
| 지연 | 더 낮음 | 약간 높음 |
| 적합 | 단순 fanout, 푸시, SMS | 콘텐츠 라우팅, 스키마 |

## Mobile Push, SMS, Email

SNS는 메시징 이외에:
- **Mobile Push** — APNs(iOS), FCM(Android), ADM, Baidu에 토큰 직접 발송
- **SMS** — 전 세계 휴대폰 (지역별 가격 차이)
- **Email/Email-JSON** — 단순 알림 (대량은 SES 권장)

## 보안

- **Topic Policy** — Resource-based, 누가 Publish, Subscribe 가능한지
- **Cross-Account** — Topic Policy + Subscription Confirmation
- **KMS 암호화** — 저장 시점 암호화
- **VPC Endpoint** — 사설망에서 SNS 호출

## 흔한 실수

- **At-least-once인데 멱등성 없음** — 중복 메시지 처리. messageId, dedupKey로 멱등
- **순서 가정한 Standard Topic 사용** — Best-effort, 순서 깨짐. 순서 필요하면 FIFO
- **Subscription Filter 안 두고 모든 Subscriber가 전체 받기** — 비용↑, 소비자 부담↑. 필터로 분리
- **HTTP Subscriber 짧은 timeout** — 재시도 폭주. SNS 권장 타임아웃 15초
- **DLQ 없는 Subscription** — 실패 메시지 영원히 드롭
- **256KB 초과 페이로드** — Extended Client + S3 패턴
- **EventBridge가 더 적합한 콘텐츠 라우팅에 SNS** — 필터 한계

## 면접 체크포인트

- SNS의 Fan-out 패턴과 SQS 조합이 표준이 된 이유 (백프레셔, 격리)
- Standard vs FIFO Topic 차이와 FIFO 한계 (SQS FIFO만 Subscriber)
- Message Filtering으로 Subscription에서 거르는 메커니즘
- At-least-once의 멱등성 요구사항
- SNS vs EventBridge 선택 기준
- HTTP Subscriber 재시도 정책 (3회 즉시 + 7일 백오프)
- 대용량 페이로드 처리 (S3 + Extended Client)

## 시험 체크포인트 (SAA-C03)

- AWS Decoupling 3종 = SQS / SNS / Kinesis 중 **Push 기반 Pub-Sub** 모델
- Subscriber 프로토콜: HTTP(S), Email, SQS, Lambda, Kinesis Data Firehose, Mobile Push, SMS
- **FIFO Topic의 Subscriber는 SQS FIFO만** 가능 (다른 프로토콜 미지원)
- Fan-out 표준 패턴: 1개 SNS Topic → N개 SQS Queue (S3 이벤트 다중 소비가 대표 시나리오)
- SNS → SQS 쓰기에 필요한 IAM Policy 자동 부여 (콘솔 구독 시), 수동 구성 시 SQS Queue Policy 필요
- KMS Key로 Topic 메시지 SSE 암호화, HTTPS API로 전송 중 암호화, IAM Policy로 API 접근 통제

## 출처
- [AWS 핵심 서비스 정리 — 학습 메모]
- AWS SAA C03 학습 자료 (로컬)

## 관련 문서
- [[SQS|SQS]]
- [[EventBridge|EventBridge]]
- [[Fan-Out-Architecture|Fan-out 아키텍처]]
- [[Messaging-Patterns|메시징 패턴]]
- [[Delivery-Semantics|전달 보장]]
- [[Idempotency-Key|멱등성 키]]
