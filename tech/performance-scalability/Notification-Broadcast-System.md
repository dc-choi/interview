---
tags: [performance, scalability, notification, fan-out, system-design, sqs, fcm, apns]
status: done
verified_at: 2026-07-24
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

## 상태 전이 알림의 중복 방지

캠페인성 팬아웃은 대상 목록에 한 번 발송하면 되지만, 상태 전이 알림은 이전 상태와 현재 상태의 차이로 발송 여부를 결정한다. 따라서 수신자 fan-out과 별도로 상태, 이벤트 식별자와 전송 결과의 생명주기를 설계한다.

### 프로세스 로컬 dedup과 재시작

- 메모리 map에 이미 알린 상태를 보관하면 배포, crash 복구와 autoscaling으로 프로세스가 바뀔 때 상태가 사라진다. 진행 중인 상태를 신규 전이로 오인해 재발송할 수 있고, 여러 replica는 각자 다른 상태를 본다.
- `seed-on-boot`는 첫 판독에서 발송하지 않고 현재 상태만 baseline으로 기록하는 완화책이다. 이미 진행 중인 상태의 재발송은 막지만, 부팅과 첫 판독 사이에 발생한 실제 전이도 baseline에 흡수해 놓칠 수 있다.
- 따라서 seed는 의도적으로 허용한 알림 공백이 있을 때, 단일 활성 평가자와 함께만 임시로 사용한다. 다중 인스턴스 조정이나 전송 중 crash의 정합성을 보장하지 않는다.

### 영속 상태, 전이 이벤트와 Outbox

| 레코드 | 필수 내용 |
|---|---|
| `risk_state` | 대상 ID, 정규화한 사유 집합, 상태 revision |
| `notification_event` | `event_id`, 전이 종류, 재발송을 막을 유니크 전이 키 |
| `outbox` | 발송할 `event_id`, 대상 범위, 시도와 결과 |

한 DB 트랜잭션에서 현재 상태를 잠그거나 조건부 갱신하고, 상태 revision 갱신, `notification_event`의 유니크 insert, outbox insert를 함께 커밋한다. 전이 키는 대상만으로 만들지 말고 시작, 가중, 해제 같은 전이 종류와 변경 revision을 구분해야 한다. 사유가 해제됐다가 다시 생기거나 동일 사유의 심각도가 바뀌는 경우도 어떤 재알림이 필요한지 정책으로 정의한다.

Relay는 outbox를 읽어 provider에 전달하고 재시도한다. DB 커밋과 외부 provider 호출은 하나의 원자 트랜잭션이 아니므로, provider 수락 결과가 불명확한 실패에서는 at-least-once 전송을 전제로 설계하고 [[Idempotent-Consumer|멱등 컨슈머]]와 클라이언트 dedup으로 효과를 흡수한다.

### Provider 수락, 전달, 표시와 등록 정보

| 단계 | 확인 근거 | 보장하지 않는 것 |
|---|---|---|
| provider 수락 | FCM message ID, send 응답 | 기기 수신과 사용자 표시 |
| 기기 수신 | 지원되는 플랫폼의 FCM 집계 지표, 클라이언트 수신 기록 | 알림이 실제로 보였는지 |
| 표시 또는 열람 | 클라이언트 표시와 분석 이벤트 | provider가 중복 요청을 받지 않았는지 |

- FCM send 성공은 FCM이 메시지를 전달 대상으로 수락했다는 뜻이지 기기 도착을 뜻하지 않는다. `event_id`, provider message ID와 클라이언트 표시 이벤트를 함께 기록해야 원인을 구분할 수 있다.
- FCM registration token 또는 FID는 물리 기기 자체가 아니라 client app instance의 식별자이며 변경될 수 있다. 서버에는 사용자와 별도로 registration, 마지막 동기화 시각, 플랫폼과 무효 상태를 보관하고, 로그아웃과 다중 계정의 연결 정책을 명시한다.
- FCM의 collapse 기능은 아직 전달되지 않은 이전 메시지를 더 최신 메시지로 교체할 수 있게 할 뿐이다. 이미 전달되거나 표시된 이벤트의 중복을 취소하지 않고 전달 순서도 보장하지 않으므로, 영속 `event_id`와 멱등 처리를 대신하지 못한다.
- 모든 payload에 안정적인 `event_id`를 넣고, 클라이언트는 이미 표시한 ID를 지속 저장소에서 중복 제거한다. 시스템이 백그라운드 notification을 자동 표시해 앱 코드가 실행되지 않는 경로는 이 dedup을 우회할 수 있으므로 payload 유형과 플랫폼 동작을 검증한다.

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
- [Firebase Cloud Messaging — Best practices for FCM registration management](https://firebase.google.com/docs/cloud-messaging/manage-tokens)
- [Firebase Cloud Messaging — Set the lifespan of a message](https://firebase.google.com/docs/cloud-messaging/customize-messages/setting-message-lifespan)
- [Firebase Cloud Messaging — Non-collapsible and collapsible messages](https://firebase.google.com/docs/cloud-messaging/customize-messages/collapsible-message-types)
- [Firebase Cloud Messaging — Understanding message delivery](https://firebase.google.com/docs/cloud-messaging/understand-delivery)
- [Firebase Cloud Messaging — Receive messages in Android apps](https://firebase.google.com/docs/cloud-messaging/android/receive-messages)
- [Duolingo — 6M Notifications Within 5 Seconds](https://medium.com/@dmosyan/duolingo-sending-6m-notifications-within-5-seconds-c630145038c3)
- [재배포했더니 이미 보낸 푸시가 또 갔다 — whale-tail](https://whale-tail.tistory.com/entry/Troubleshooting-%EC%9E%AC%EB%B0%B0%ED%8F%AC%ED%96%88%EB%8D%94%EB%8B%88-%EC%9D%B4%EB%AF%B8-%EB%B3%B4%EB%82%B8-%ED%91%B8%EC%8B%9C%EA%B0%80-%EB%98%90-%EA%B0%94%EB%8B%A4-%E2%80%94-FCM-%EC%95%8C%EB%A6%BC-%EC%A4%91%EB%B3%B5-%EB%B0%9C%EC%86%A1-%EC%9E%A1%EA%B8%B0)

## 관련 문서
- [[Fan-Out-Architecture|Fan-Out Architecture (1:N 분배)]]
- [[SQS|SQS (FIFO, in-flight 한계)]]
- [[Traffic-Scaling-Playbook|Traffic Scaling Playbook]]
- [[Capacity-Planning|캐퍼시티 플래닝]] — 푸시 컴포넌트의 스파이크 장애 사례와 대비 사이클
- [[First-Come-Coupon-Patterns|선착순 이벤트 패턴]]
- [[MQ-Kafka|Kafka]]
- [[Transactional-Outbox|Transactional Outbox]]
