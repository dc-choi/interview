---
tags: [aws, cloudtrail, config, security, governance, audit, compliance]
status: done
category: "Infrastructure - AWS"
aliases: ["CloudTrail", "AWS CloudTrail", "AWS Config", "Config Rules"]
verified_at: 2026-07-21
---

# CloudTrail & Config

AWS 거버넌스, 감사의 두 축. **CloudTrail**은 "**누가** 무엇을 했는가" (API 호출, 활동 로그), **Config**는 "**무엇이** 어떻게 구성되어 있는가" (리소스 구성 상태, 변경 이력)에 초점.

## 한눈에 비교 — CloudTrail vs Config

| 항목 | CloudTrail | Config |
|------|------------|--------|
| 질문 | "Who did what, when?" | "What is the current/past state of resources?" |
| 단위 | **API 이벤트** (CreateBucket, RunInstances 등) | **리소스 구성 스냅샷** (S3 버킷 정책, SG 규칙 등) |
| 트리거 | API 호출 (콘솔, CLI, SDK) | 리소스 변경 또는 주기적 평가 |
| 보존 | 이벤트 기록: **최근 90일의 관리 이벤트** / Trail → S3: 버킷 수명 주기 정책에 따라 보관 | 변경 이력 + 스냅샷 (구성과 전달 설정에 따라 S3 보관) |
| 평가 기능 | Insights (이상 호출 탐지) | **Config Rules** (구성이 규칙 준수하는지) |
| 활성화 | 계정 생성 시 자동(이벤트 기록만) — Trail은 별도 | 리전별 명시 활성화 필요 |

같이 쓰는 패턴: **CloudTrail 이벤트로 변경 주체 파악 → Config 이력으로 변경 전후 상태 비교**.

## CloudTrail

### 구성 요소

1. **이벤트 기록(Event History)**: 각 리전에서 조회하는 **최근 90일의 관리 이벤트**. Trail 생성 여부와 무관하게 제공.
2. **Trail(추적)**: S3, CloudWatch Logs로 이벤트를 **장기 보관**. 리전 단위 또는 멀티 리전.
3. **Insights 이벤트**: 2026-09-03 AWS 문서 기준, 활성화한 Trail이나 event data store에서 관리 이벤트와 데이터 이벤트의 비정상 호출률, 오류율을 분석하는 선택 기능. 관리 이벤트 Insights는 두 저장 방식 모두 지원하지만 데이터 이벤트 Insights는 Trail에서만 지원한다. 추가 비용을 확인.
4. **Lake**: CloudTrail 이벤트를 SQL로 질의하는 매니지드 데이터 레이크.

### 이벤트 유형

| 유형 | 내용 | 기본 |
|------|------|------|
| **Management Event** | 리소스 생성, 삭제, 설정 변경 (제어 평면) | 활성 |
| **Data Event** | S3 객체 GetObject, Lambda Invoke 등 (데이터 평면) | **비활성** (양, 비용 큼) |
| **Insights Event** | 관리, 데이터 이벤트의 호출률과 오류율 이상. 관리 이벤트의 call rate는 write 호출, error rate는 read와 write 호출을 분석 | 별도 활성 |

데이터 이벤트는 양이 폭주하므로 **꼭 필요한 버킷, 함수만** 선택 활성화.

### Organization Trail

AWS Organizations와 연동해 **조직 내 모든 계정**의 이벤트를 단일 Trail로 수집. 멤버 계정은 비활성화 불가 → 보안 거버넌스 표준.

### 무결성 보장

Trail에 **Log File Validation**을 켜면 SHA-256 다이제스트로 로그 변조 여부 검증 가능. 감사 요건(SOC, PCI, HIPAA)에서 요구.

### CloudWatch Logs 연동

- 이벤트를 CloudWatch Logs로 스트리밍 → **Metric Filter + Alarm**으로 실시간 알림
- 예: `DeleteBucket`, `StopLogging` 같은 위험 API 호출 발생 시 SNS 알림

## AWS Config

### 동작 모델

1. 지원 리소스의 **현재 구성**을 JSON으로 기록 (Configuration Item)
2. 리소스 변경 발생 → 변경 알림 + 새 Configuration Item 저장
3. **Config Rule**이 구성을 평가 → Compliant / Non-Compliant 판정
4. Configuration Recorder가 구성 항목을 기록하고, delivery channel과 EventBridge를 통해 스냅샷, 알림, 이벤트를 전달

### Config Rules

리소스 구성이 정책을 준수하는지 평가하는 규칙.

| 분류 | 설명 |
|------|------|
| **AWS Managed Rules** | AWS가 유지하는 규칙 — `s3-bucket-public-read-prohibited`, `encrypted-volumes`, `iam-password-policy` 등. 지원 수와 리전은 카탈로그에서 확인 |
| **Custom Rules** | Lambda 함수로 직접 평가 로직 작성 |
| **Custom Policy Rules** | Guard DSL로 선언적 규칙 정의 (Lambda 없이) |

### 트리거 방식

- **Configuration changes**: 지원 리소스의 구성 변경이 기록될 때 평가
- **Periodic**: 1, 3, 6, 12, 24시간 주기로 평가 (변경 추적이 어려운 리소스 또는 외부 상태 검증)

### Remediation (자동 조치)

Non-Compliant 판정 시 **SSM Automation Document**로 자동 교정 가능.
예: 퍼블릭으로 풀린 S3 버킷에 승인된 SSM Automation remediation을 실행해 `BlockPublicAccess` 적용. 자동 조치는 재시도, 권한, 동시성 한도 때문에 즉시 성공을 보장하지 않는다.

### Conformance Pack

규칙, 교정 액션을 **YAML로 패키징**해 일괄 배포. CIS, PCI, HIPAA, NIST 같은 컴플라이언스 프레임워크별 샘플 팩 제공. Organizations로 다계정 배포.

### Aggregator (집계)

여러 계정, 리전의 Config 데이터를 **단일 뷰**로 집계. 멀티 계정 컴플라이언스 대시보드 구성에 사용.

## 같이 쓰는 패턴

1. **변경 감사**: Config로 "버킷 정책이 언제 풀렸는가" 시점 확인 → CloudTrail로 "누가 PutBucketPolicy 호출했는가" 확인
2. **루트 계정 사용 감지**: CloudTrail → CloudWatch Alarm → SNS
3. **암호화 누락 자동 교정**: Config Rule `encrypted-volumes` + Remediation Action
4. **퍼블릭 S3 교정**: Config Rule + SSM Automation으로 탐지 후 승인된 교정 수행
5. **SCP 위반 추적**: CloudTrail에서 AccessDenied 이벤트 추적

## EventBridge로 계정 활동과 유지보수 알림 받기

2026-10-14 AWS 공식 문서 대조 기준이며, 이 절만 추가 대조했다. 작은 팀이 계정 보안과 유지보수 신호를 놓치지 않기 위한 최소 구성이다. CloudWatch Logs 지표 필터 경로와 달리 로그 그룹 없이 default 이벤트 버스의 규칙으로 받는다.

| 신호 | 이벤트 식별 | 수신 조건과 주의 |
|---|---|---|
| API 변경 호출(access key 생성 등) | `detail-type: AWS API Call via CloudTrail`과 `detail.eventName` | 쓰기 관리 이벤트는 일반 `ENABLED` 규칙이 받고, 읽기 전용 관리 이벤트는 `ENABLED_WITH_ALL_CLOUDTRAIL_MANAGEMENT_EVENTS` 상태의 규칙만 받는다 |
| 콘솔 로그인 | `source: aws.signin`과 `detail.eventName: ConsoleLogin` | 기록 리전이 사용자 유형과 로그인 엔드포인트에 따라 다르다. root 로그인은 us-east-1, us-east-2, us-west-2 중 한 곳에 기록된다 |
| ECR 이미지 push | `detail-type: ECR Image Action`과 `detail.action-type: PUSH` | ECR이 best effort로 보낸다 |
| 유지보수 예정과 서비스 장애 | `source: aws.health`와 `detail-type: AWS Health Event` | 리전별 규칙이 필요하다. IAM처럼 리전에 속하지 않는 전역 Health 이벤트는 us-east-1 규칙이 받는다 |

- CloudTrail 경유 이벤트(API 호출, 콘솔 로그인)는 로깅 중인 trail이 있어야 받을 수 있고, best effort로 전달되며 default 버스로만 들어온다. IAM과 CloudFront 이벤트, STS 전역 엔드포인트(`sts.amazonaws.com`) 호출은 us-east-1에 기록되고 STS 리전 엔드포인트 호출은 그 리전에 기록되므로, 다른 리전의 규칙이 반응하지 않으면 규칙의 리전부터 확인한다. 콘솔 로그인 규칙의 `detail-type` 문자열은 콘솔의 샘플 이벤트로 확인한다.
- AWS Health는 durable 방식으로 최소 한 번 전달을 시도하며, 규칙은 자기 계정의 이벤트만 받는다. 여러 계정의 유지보수 알림을 한곳에서 보려면 AWS Organizations(all features)에서 organizational view를 켜 관리 계정이나 위임 관리자 계정이 조직 전체 이벤트를 하나의 흐름으로 받게 한다. 조직 이벤트는 90일까지 보관된다. 계정마다 장기 access key를 보관해 조회하는 방식은 장기 자격 증명을 늘리므로 피한다([[IAM-Best-Practices|IAM 모범 사례]]).
- 한 계정에서 여러 리전의 계정별 Health 이벤트를 규칙 하나로 받으려면 us-west-2에 중앙 규칙을 둘 수 있다. 이 방식은 공개 이벤트를 받지 못하고 고가용성 구성이 아니며, AWS는 조치가 필요한 이벤트 수집에만 권한다.
- 표준 파티션에서 us-west-2는 다른 리전 Health 이벤트의 백업 수신 리전이라, 리전별 규칙과 us-west-2 규칙을 함께 두면 같은 이벤트를 두 번 받는다. 백업이 필요 없으면 us-west-2 규칙에서 `detail.backupEvent`가 false인 이벤트만 받고, 고가용성을 위해 둘 다 받으면 `detail.communicationId`로 중복을 거른다.
- Slack 같은 채팅 채널로는 SNS 주제를 Amazon Q Developer in chat applications(구 AWS Chatbot)에 연결해 보낸다. 직접 만든 알림 구성의 규칙에 따라 AWS 서비스 이벤트를 콘솔 알림 센터, 이메일, 채팅과 모바일 푸시로 보내는 AWS User Notifications도 EventBridge를 기반으로 동작한다.
- 알림 전달은 조치 완료가 아니다. 알림마다 담당자와 대응 절차를 함께 정한다.

## 비용, 운영 주의

- **CloudTrail Management Event**: S3로 전달되는 관리 이벤트의 첫 번째 복사본은 리전별로 CloudTrail 요금이 없고, 추가 복사본과 CloudTrail Lake, 데이터 이벤트, 네트워크 활동 이벤트 등은 별도 과금. S3와 CloudWatch Logs 요금도 별도
- **Data Event**: 양 폭주 — **선택적 활성화** 필수
- **Config**: Configuration Item 기록 건당 과금. **자주 변경되는 리소스**(Auto Scaling 빈번한 EC2) 많으면 비용 큼
- **S3 보관 비용**: 장기 보관 시 Glacier 전환 고려
- **Trail이 멈추면 감사 공백** — EventBridge 또는 CloudWatch Logs 필터로 `StopLogging`, `DeleteTrail`, 설정 변경 이벤트를 감시하고 조직 차원의 권한 통제를 함께 적용

## 흔한 실수

- **CloudTrail만 켜놓고 Config 안 켬** — "누가" 했는지는 알아도 "변경 전 상태"는 모름
- **Trail에 KMS 암호화, MFA Delete 미설정** — 감사 로그 자체가 변조, 삭제 위험
- **Data Event 전체 활성화** — 비용 폭주
- **멀티 리전 Trail 미사용** — 다른 리전에서 발생한 이벤트 누락
- **Config Rule만 만들고 Remediation 없음** — Non-Compliant 알람만 쌓이고 실제 조치는 사람 손
- **Recorder가 일부 리소스 타입만 기록하도록 좁힘** — 감사 누락

## 시험 체크포인트

- CloudTrail = **API/활동 로그** (누가) / Config = **리소스 구성 상태** (무엇이)
- CloudTrail 이벤트 기록은 자동, 보존 **90일** — 장기 보관은 **Trail → S3**
- **Management Event vs Data Event** 구분과 Data Event가 기본 비활성인 이유
- **Insights Event**는 관리, 데이터 이벤트의 호출률과 오류율 이상 탐지. 관리 이벤트의 call rate는 write, error rate는 read/write 호출을 분석하며 데이터 이벤트 Insights는 Trail에서만 지원
- **Organization Trail**: 조직 내 모든 계정 단일 수집
- **Config Rule**: 변경 트리거 vs 주기 트리거, Managed vs Custom
- **Conformance Pack**: 컴플라이언스 묶음 배포
- 자동 교정 = **Config + SSM Automation**
- 거버넌스 질문 시 CloudTrail + Config + AWS Organizations + SCP 조합 답변
- CloudTrail Log File **무결성 검증**은 SHA-256 다이제스트
- CloudTrail 경유 이벤트를 EventBridge로 받을 때의 trail 조건, 읽기 전용 관리 이벤트의 규칙 상태와 이벤트가 기록되는 리전

## 출처

- [CloudTrail 개념](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-concepts.html)
- [CloudTrail 요금 이해](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-costs.html)
- [AWS Config 작동 방식](https://docs.aws.amazon.com/config/latest/developerguide/how-does-config-work.html)
- [AWS Config Managed Rules 목록](https://docs.aws.amazon.com/config/latest/developerguide/managed-rules-by-aws-config.html)
- [CloudTrail Insights 이벤트 로깅](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-insights-events-with-cloudtrail.html)
- [CloudTrail 경유 AWS 서비스 이벤트(EventBridge)](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-service-event-cloudtrail.html)
- [콘솔 로그인 이벤트(CloudTrail)](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-event-reference-aws-console-sign-in-events.html)
- [AWS Sign-In 이벤트(EventBridge)](https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-signin.html)
- [Amazon ECR 이벤트와 EventBridge](https://docs.aws.amazon.com/AmazonECR/latest/userguide/ecr-eventbridge.html)
- [EventBridge로 AWS Health 이벤트 모니터링](https://docs.aws.amazon.com/health/latest/ug/cloudwatch-events-health.html)
- [AWS Health 이벤트의 리전별 EventBridge 규칙](https://docs.aws.amazon.com/health/latest/ug/choosing-a-region.html)
- [AWS Health 이벤트의 계정 간 집계](https://docs.aws.amazon.com/health/latest/ug/aggregate-events.html)
- [AWS Health organizational view와 위임 관리자의 EventBridge 수신](https://docs.aws.amazon.com/health/latest/ug/aggregating-health-events.html)
- [Amazon Q Developer in chat applications 개요](https://docs.aws.amazon.com/chatbot/latest/adminguide/what-is.html)
- [AWS User Notifications 개요](https://docs.aws.amazon.com/notifications/latest/userguide/what-is-service.html)
- [IAM 보안 모범 사례](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [스타트업 관점에서 본 AWS 선택과 집중 — Amazon Web Services Korea](https://www.youtube.com/watch?v=rkr8ToCiiL0)
- [일본 시골 개발자의 AWS 활용기 — Amazon Web Services Korea](https://www.youtube.com/watch?v=9oBS8X7TNEQ)

## 관련 문서

- [[IAM]]
- [[IAM-Best-Practices|IAM 모범 사례]]
- [[EventBridge|EventBridge]]
- [[CloudWatch]]
- [[S3]]
- [[KMS]]
- [[관측가능성(Observability)|Observability]]
