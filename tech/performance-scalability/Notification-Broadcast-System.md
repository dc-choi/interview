---
tags: [performance, scalability, notification, fan-out, system-design, sqs, fcm, apns]
status: done
verified_at: 2026-07-21
category: "Performance & Scalability"
aliases: ["Notification Broadcast", "Mass Notification", "대규모 알림 시스템", "Push 팬아웃"]
---

# 대규모 알림 시스템 — 수백만 명 발송 사례에서 배우는 설계

이커머스 쿠폰, 라이브 방송 시작, 광고 캠페인에서는 짧은 시간에 대규모 푸시 알림을 보내야 할 수 있다. 아래는 공개된 600만 건 발송 사례를 바탕으로 한 한 가지 설계 패턴이다. 필요한 계층 수와 격리 수준은 목표 시간, APNs/FCM 응답, SQS 할당량, 비용과 백엔드 수용량을 부하 테스트로 정한다.

## 문제의 본질

- **외부 게이트웨이 수용량**: APNs는 연결별 동시 스트림 수를 고정값으로 가정하지 말라고 안내하며 한 요청은 한 device token을 대상으로 한다. FCM의 프로젝트 할당량과 API별 배치 한도도 확인해야 함
- **큐 in-flight 제한**: SQS는 큐 유형과 활성 message group에 따른 in-flight 한도가 있음
- **백엔드 동시 부하**: 모든 사용자가 알림을 받고 **동시에 앱 진입** → 백엔드 순간 트래픽 폭증 (Thundering Herd)
- **데이터 조회 비용**: 수백만 사용자의 디바이스 토큰을 DB에서 즉시 조회하면 병목

이 4가지를 **각각의 단계**에서 풀어야 한다.

## 계층적 팬아웃 구조

```
캠페인 시작
  ↓
(데이터 준비) S3 → 메모리 사전 로드
  ↓
API Tier: 50+ 분할 메시지를 FIFO SQS에 투입
  ↓
Interim Worker Tier: 각 분할을 10,000+ SQS 메시지로 확장
  ↓
Final Worker Tier: 대상 목록을 APNs/FCM 요청으로 전개하고 응답별 재시도, 폐기 판단
  ↓
provider 요청 결과 수집 완료
```

각 단계가 앞단의 100~10,000배로 **메시지 수를 증폭**시키는 구조. 한 번에 수백만을 꺼내려 하지 않고 **점진적으로 확장**한다.

### 단계별 역할

| 단계 | 역할 | 핵심 기법 |
|---|---|---|
| **데이터 준비** | 캠페인 시점의 대량 DB 조회를 줄임 | 사례에서는 미리 S3에 저장한 대상 목록을 메모리에 로드 |
| **API Tier** | 초기 분할 (Fan-out 시작) | 50~100개 partition으로 쪼개 FIFO SQS 투입 |
| **Interim Worker** | 실제 메시지 확장 | 각 partition을 10K+ SQS 메시지로 쪼갬 |
| **Final Worker** | 외부 게이트웨이 호출 | APNs는 token별 HTTP/2 요청, FCM Admin SDK multicast는 호출당 최대 500대, 오류별 재시도 |

## Batching 전략 — SQS 한계 회피

### SQS in-flight 제한
- Standard 큐는 약 120K in-flight 한도가 있고, FIFO 큐도 in-flight와 message group별 순차 처리 제약을 함께 고려해야 함
- SQS backlog 자체와 in-flight는 다르다. 메시지를 많이 적재할 수 있어도 consumer가 받아 삭제하지 않은 in-flight 메시지가 한도에 닿으면 추가 수신이 막힐 수 있음

### 배치 크기 설정
- 큐 메시지 하나에 여러 대상을 담는 크기는 메시지 최대 크기, 처리 시간, visibility timeout과 실패 격리 단위로 결정
- FCM Admin SDK의 multicast 호출은 최대 500개 token 또는 FID를 받을 수 있음
- APNs Provider API는 device token별 POST 요청이므로 큐 안에서 묶었더라도 worker가 token별 요청과 응답을 관리
- 묶음이 너무 크면 일부 실패 재처리 비용이 커지고, 너무 작으면 큐 요청 수와 in-flight 수가 늘어나는 트레이드오프가 있음

### FIFO vs Standard 선택
- **FIFO**: `MessageGroupId` 안의 순서와 5분 deduplication window를 제공. visibility timeout 전에 처리와 삭제를 끝내지 못하면 같은 메시지가 다시 처리될 수 있으므로 consumer 멱등성이 필요
- **Standard**: 매우 높은 API 처리량을 자동 확장하지만 in-flight와 기타 서비스 할당량은 적용된다. 순서가 필요 없고 at-least-once 중복을 처리할 수 있는 단계에 활용

## 인프라 격리 — 알림 시스템과 메인 백엔드 분리

알림 시스템이 **메인 백엔드와 동일 클러스터**에 있으면 알림 폭주로 본 서비스가 영향받는다.

- **전용 ECS/EKS 클러스터**: 사례처럼 compute capacity와 autoscaling 경합을 격리. 네트워크나 계정 서비스 할당량까지 자동 분리되는 것은 아님
- **전용 SQS 큐**: backlog, consumer scaling, DLQ와 장애 영향을 워크로드별로 격리. 서비스와 계정 수준의 다른 할당량이 사라지는 것은 아님
- **전용 DynamoDB 테이블**: 토큰, 구독 정보의 데이터 경계와 capacity 설정을 분리. 리전별 서비스 할당량은 별도 확인
- **전용 Auto Scaling Group**: 캠페인 직전 사전 확대

## 다운스트림 장애 흡수

사용자가 알림을 받고 동시에 앱에 진입하면 백엔드가 폭주한다.

- **시차 발송(Staggered Rollout)**: 백엔드 수용량에 맞춘 간격과 batch 크기로 피크 분산
- **백엔드 준비도 확인**: 메트릭 임계값 기반 자동 속도 조절
- **Zombie 모드 시뮬레이션**: 백엔드가 살아나는 과정을 **실제와 유사하게 재현**하는 테스트 도구로 사전 검증

## 실전 테스트 원칙

설계 검토만으로 실제 처리량을 보장할 수 없다. 스텁 게이트웨이를 이용한 부하 테스트, 제공자 sandbox나 검증 기능, 제한된 프로덕션 리허설을 조합한다.

- **전송 없는 파이프라인 시험**: APNs/FCM 호출부를 스텁으로 바꾸거나 FCM dry-run처럼 제공되는 검증 기능 사용. silent push는 사용자에게 UI를 표시하지 않을 뿐 실제 기기로 전송되는 요청이므로 무발송 테스트가 아님
- **점진 확장**: 수만 → 100만 → 400만 → 600만 단계별 실전 부하
- **런타임, connection pool과 직렬화 같은 숨은 병목**은 소규모 테스트에서 보이지 않을 수 있으므로 목표 처리량에 가까운 리허설로 확인
- **실패 시나리오 플레이북**: 특정 단계 실패 시 대응 절차 문서화

## 결과 지표 예

Duolingo 사례를 재구성한 글의 참고 수치이며 다른 시스템의 보장값이 아니다. 글의 `out` 지표는 기기 표시 완료가 아니라 provider로 요청을 내보낸 단계의 측정으로 해석해야 하며, 원 발표의 계측 정의가 문서에 구체적으로 제시되지는 않았다.
- 6백만 건 이상 요청 중 **99%가 5.7초 이내**, **95%가 3.9초 이내** provider 송신 단계 통과로 보고됨
- 기존 용량 **1만/초 대비 80배** 단기 처리
- 슈퍼볼 광고 같은 **결정적 순간**에 대응하는 수준

## 흔한 실수

- **backlog와 in-flight를 같은 한도로 계산** → 큐에 쌓인 전체 수가 아니라 receive 후 미삭제 메시지를 측정해야 함
- **메인 클러스터와 공유** → 알림 스파이크가 본 서비스 장애 유발
- **목표 규모의 토큰 DB 조회 비용을 측정하지 않음** → 병목이면 사례처럼 대상 목록 사전 생성이나 캐시를 검토
- **APNs를 다중 token 배치 API로 가정** → APNs는 token별 요청과 응답을 관리해야 함. FCM multicast도 현재 API 한도를 확인
- **소규모 테스트만 하고 프로덕션 출시** → 사용 런타임의 thread/process 모델, connection pool, 메모리 병목을 놓칠 수 있음
- **다운스트림 준비 없이 발송** → 알림 수신 → 앱 진입 동시성으로 백엔드 다운

## 면접 체크포인트

- **계층적 팬아웃**이 왜 필요한지 (큐 in-flight, 게이트웨이 rate limit)
- APNs의 token별 요청과 FCM multicast 한도 차이를 반영한 묶음 크기 설계
- **전용 인프라 격리**로 메인 서비스 보호
- **Zombie 시뮬레이션, 점진 부하 테스트**의 역할
- 사용자 동시 진입으로 인한 **Thundering Herd 방어**
- SQS FIFO vs Standard의 단계별 선택 기준

## 출처
- [Amazon SQS Developer Guide — FIFO queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-fifo-queues.html)
- [Amazon SQS Developer Guide — Outage recovery scenarios](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/designing-for-outage-recovery-scenarios.html)
- [Amazon SQS Developer Guide — Visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)
- [Amazon SQS Developer Guide — Standard queue quotas](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-queues.html)
- [Apple Developer — APNs connection and requests](https://developer.apple.com/documentation/usernotifications/establishing-a-connection-to-apns)
- [Firebase — Admin SDK multicast messaging](https://firebase.google.com/docs/cloud-messaging/send/admin-sdk)
- [Duolingo — 6M Notifications Within 5 Seconds](https://medium.com/@dmosyan/duolingo-sending-6m-notifications-within-5-seconds-c630145038c3)

## 관련 문서
- [[Fan-Out-Architecture|Fan-Out Architecture (1:N 분배)]]
- [[SQS|SQS (FIFO, in-flight 한계)]]
- [[Traffic-Scaling-Playbook|Traffic Scaling Playbook]]
- [[Capacity-Planning|캐퍼시티 플래닝]] — 푸시 컴포넌트의 스파이크 장애 사례와 대비 사이클
- [[First-Come-Coupon-Patterns|선착순 이벤트 패턴]]
- [[MQ-Kafka|Kafka]]
