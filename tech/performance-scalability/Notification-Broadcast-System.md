---
tags: [performance, scalability, notification, fan-out, system-design, sqs, fcm, apns]
status: done
category: "Performance & Scalability"
aliases: ["Notification Broadcast", "Mass Notification", "대규모 알림 시스템", "Push 팬아웃"]
---

# 대규모 알림 시스템 — 수백만 명에게 수 초 내 전송

이커머스 쿠폰·라이브 방송 시작·광고 캠페인 같은 시나리오에서는 **수 초 내에 수백만 ~ 수천만 건**의 푸시 알림을 보내야 한다. APNS·FCM의 rate limit, SQS in-flight 상한, 백엔드 동시 부하를 **단일 파이프라인**으로 처리할 수는 없고, 사전 준비·계층적 팬아웃·격리 인프라의 조합으로 해결한다.

## 문제의 본질

- **외부 게이트웨이 rate limit**: APNS·FCM이 초당 받을 수 있는 배치 크기·connection 수 제한
- **큐 in-flight 제한**: SQS는 계정당 120K in-flight 메시지 (FIFO는 더 엄격)
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
Final Worker Tier: APNS/FCM에 배치 호출 (iOS 500건·Android 250건 단위)
  ↓
알림 전송 완료
```

각 단계가 앞단의 100~10,000배로 **메시지 수를 증폭**시키는 구조. 한 번에 수백만을 꺼내려 하지 않고 **점진적으로 확장**한다.

### 단계별 역할

| 단계 | 역할 | 핵심 기법 |
|---|---|---|
| **데이터 준비** | 사용자·디바이스 ID 조회 비용 제거 | S3 객체를 메모리에 사전 로드 |
| **API Tier** | 초기 분할 (Fan-out 시작) | 50~100개 partition으로 쪼개 FIFO SQS 투입 |
| **Interim Worker** | 실제 메시지 확장 | 각 partition을 10K+ SQS 메시지로 쪼갬 |
| **Final Worker** | 외부 게이트웨이 호출 | APNS/FCM 배치 API (플랫폼별 최적 크기) |

## Batching 전략 — SQS 한계 회피

### SQS in-flight 제한
- 계정당 120K in-flight, FIFO는 더 낮음
- 수백만 메시지를 1:1로 큐에 넣으면 한도 즉시 초과

### 배치 크기 설정
- iOS(APNS): **메시지당 500 사용자** 묶음
- Android(FCM): **메시지당 250 사용자** 묶음
- 플랫폼 API의 배치 한도와 맞춰 조정
- 메시지 수 = 사용자 수 ÷ 배치 크기 → in-flight 제한 안에 들어옴

### FIFO vs Standard 선택
- **FIFO**: 순서 보장·exactly-once 처리. Fan-out 단계에서 한 그룹이 순서 지켜 발송되게
- **Standard**: 처리량 무제한. Final Worker → APNS/FCM 호출처럼 순서 무관한 단계에 활용

## 인프라 격리 — 알림 시스템과 메인 백엔드 분리

알림 시스템이 **메인 백엔드와 동일 클러스터**에 있으면 알림 폭주로 본 서비스가 영향받는다.

- **전용 ECS/EKS 클러스터**: 스케일링 이벤트가 서로 간섭하지 않음
- **전용 SQS 큐**: 계정 수준 in-flight 제한을 독립 소비
- **전용 DynamoDB 테이블**: 토큰·구독 정보를 메인 DB와 분리
- **전용 Auto Scaling Group**: 캠페인 직전 사전 확대

## 다운스트림 장애 흡수

사용자가 알림을 받고 동시에 앱에 진입하면 백엔드가 폭주한다.

- **시차 발송(Staggered Rollout)**: 1~2초 간격으로 batch 전송 → 트래픽 피크 분산
- **백엔드 준비도 확인**: 메트릭 임계값 기반 자동 속도 조절
- **Zombie 모드 시뮬레이션**: 백엔드가 살아나는 과정을 **실제와 유사하게 재현**하는 테스트 도구로 사전 검증

## 실전 테스트 원칙

완벽한 설계는 없다. 실제 규모로 **반복 테스트**가 유일한 검증 수단.

- **조용한 payload**로 연습: silent push로 실제 전송 없이 파이프라인만 검증
- **점진 확장**: 수만 → 100만 → 400만 → 600만 단계별 실전 부하
- **Python GIL 같은 숨은 병목**은 소규모 테스트에서 안 보임 → 반드시 **대규모 리허설**
- **실패 시나리오 플레이북**: 특정 단계 실패 시 대응 절차 문서화

## 결과 지표 예

참고 사례 수치:
- 6백만 건 알림, **99%가 5.7초 이내**, **95%가 3.9초 이내** 전송
- 기존 용량 **1만/초 대비 80배** 단기 처리
- 슈퍼볼 광고 같은 **결정적 순간**에 대응하는 수준

## 흔한 실수

- **단일 큐로 수백만 메시지 펌프** → in-flight 제한 직격
- **메인 클러스터와 공유** → 알림 스파이크가 본 서비스 장애 유발
- **토큰 DB를 실시간 조회** → 토큰 조회 단계에서 병목 발생. 사전 로드 필요
- **배치 크기를 게이트웨이 한도보다 크게** → APNS 거부·재시도 폭증
- **소규모 테스트만 하고 프로덕션 출시** → GIL·connection pool·메모리 튜닝 이슈 발견 못함
- **다운스트림 준비 없이 발송** → 알림 수신 → 앱 진입 동시성으로 백엔드 다운

## 면접 체크포인트

- **계층적 팬아웃**이 왜 필요한지 (큐 in-flight·게이트웨이 rate limit)
- **iOS 500 / Android 250** 같은 플랫폼별 배치 크기 설계
- **전용 인프라 격리**로 메인 서비스 보호
- **Zombie 시뮬레이션·점진 부하 테스트**의 역할
- 사용자 동시 진입으로 인한 **Thundering Herd 방어**
- SQS FIFO vs Standard의 단계별 선택 기준

## 출처
- [Duolingo — 6M Notifications Within 5 Seconds](https://medium.com/@dmosyan/duolingo-sending-6m-notifications-within-5-seconds-c630145038c3)

## 관련 문서
- [[Fan-Out-Architecture|Fan-Out Architecture (1:N 분배)]]
- [[SQS|SQS (FIFO·in-flight 한계)]]
- [[Traffic-Scaling-Playbook|Traffic Scaling Playbook]]
- [[First-Come-Coupon-Patterns|선착순 이벤트 패턴]]
- [[MQ-Kafka|Kafka]]
