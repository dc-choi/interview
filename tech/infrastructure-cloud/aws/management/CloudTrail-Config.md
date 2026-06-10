---
tags: [aws, cloudtrail, config, security, governance, audit, compliance]
status: done
category: "Infrastructure - AWS"
aliases: ["CloudTrail", "AWS CloudTrail", "AWS Config", "Config Rules"]
---

# CloudTrail & Config

AWS 거버넌스·감사의 두 축. **CloudTrail**은 "**누가** 무엇을 했는가" (API 호출·활동 로그), **Config**는 "**무엇이** 어떻게 구성되어 있는가" (리소스 구성 상태·변경 이력)에 초점.

## 한눈에 비교 — CloudTrail vs Config

| 항목 | CloudTrail | Config |
|------|------------|--------|
| 질문 | "Who did what, when?" | "What is the current/past state of resources?" |
| 단위 | **API 이벤트** (CreateBucket, RunInstances 등) | **리소스 구성 스냅샷** (S3 버킷 정책·SG 규칙 등) |
| 트리거 | API 호출 (콘솔·CLI·SDK) | 리소스 변경 또는 주기적 평가 |
| 보존 | 콘솔 이벤트 기록: **90일** / Trail → S3: 무기한 | 변경 이력 + 스냅샷 (S3 보관) |
| 평가 기능 | Insights (이상 호출 탐지) | **Config Rules** (구성이 규칙 준수하는지) |
| 활성화 | 계정 생성 시 자동(이벤트 기록만) — Trail은 별도 | 리전별 명시 활성화 필요 |

같이 쓰는 패턴: **CloudTrail 이벤트로 변경 주체 파악 → Config 이력으로 변경 전후 상태 비교**.

## CloudTrail

### 구성 요소

1. **이벤트 기록(Event History)**: 콘솔에서 바로 보는 **최근 90일** 이벤트. Trail 없이도 항상 활성.
2. **Trail(추적)**: S3·CloudWatch Logs로 이벤트를 **장기 보관**. 리전 단위 또는 멀티 리전.
3. **Insights 이벤트**: **Write API 호출의 비정상 패턴**(평소 대비 급증·급감) 자동 탐지.
4. **Lake**: CloudTrail 이벤트를 SQL로 질의하는 매니지드 데이터 레이크.

### 이벤트 유형

| 유형 | 내용 | 기본 |
|------|------|------|
| **Management Event** | 리소스 생성·삭제·설정 변경 (제어 평면) | 활성 |
| **Data Event** | S3 객체 GetObject·Lambda Invoke 등 (데이터 평면) | **비활성** (양·비용 큼) |
| **Insights Event** | Write API 이상 호출 | 별도 활성 |

데이터 이벤트는 양이 폭주하므로 **꼭 필요한 버킷·함수만** 선택 활성화.

### Organization Trail

AWS Organizations와 연동해 **조직 내 모든 계정**의 이벤트를 단일 Trail로 수집. 멤버 계정은 비활성화 불가 → 보안 거버넌스 표준.

### 무결성 보장

Trail에 **Log File Validation**을 켜면 SHA-256 다이제스트로 로그 변조 여부 검증 가능. 감사 요건(SOC·PCI·HIPAA)에서 요구.

### CloudWatch Logs 연동

- 이벤트를 CloudWatch Logs로 스트리밍 → **Metric Filter + Alarm**으로 실시간 알림
- 예: `DeleteBucket`·`StopLogging` 같은 위험 API 호출 발생 시 SNS 알림

## AWS Config

### 동작 모델

1. 지원 리소스의 **현재 구성**을 JSON으로 기록 (Configuration Item)
2. 리소스 변경 발생 → 변경 알림 + 새 Configuration Item 저장
3. **Config Rule**이 구성을 평가 → Compliant / Non-Compliant 판정
4. 결과는 **Configuration Recorder**로 S3 보관, SNS·EventBridge로 발신

### Config Rules

리소스 구성이 정책을 준수하는지 평가하는 규칙.

| 분류 | 설명 |
|------|------|
| **AWS Managed Rules** | AWS 제공 기본 규칙(~200개) — `s3-bucket-public-read-prohibited`, `encrypted-volumes`, `iam-password-policy` 등 |
| **Custom Rules** | Lambda 함수로 직접 평가 로직 작성 |
| **Custom Policy Rules** | Guard DSL로 선언적 규칙 정의 (Lambda 없이) |

### 트리거 방식

- **Configuration changes**: 리소스 변경 시점에 즉시 평가
- **Periodic**: 1·3·6·12·24시간 주기로 평가 (변경 추적이 어려운 리소스 또는 외부 상태 검증)

### Remediation (자동 조치)

Non-Compliant 판정 시 **SSM Automation Document**로 자동 교정 가능.
예: 퍼블릭으로 풀린 S3 버킷 → 자동으로 `BlockPublicAccess` 적용.

### Conformance Pack

규칙·교정 액션을 **YAML로 패키징**해 일괄 배포. CIS·PCI·HIPAA·NIST 같은 컴플라이언스 프레임워크별 샘플 팩 제공. Organizations로 다계정 배포.

### Aggregator (집계)

여러 계정·리전의 Config 데이터를 **단일 뷰**로 집계. 멀티 계정 컴플라이언스 대시보드 구성에 사용.

## 같이 쓰는 패턴

1. **변경 감사**: Config로 "버킷 정책이 언제 풀렸는가" 시점 확인 → CloudTrail로 "누가 PutBucketPolicy 호출했는가" 확인
2. **루트 계정 사용 감지**: CloudTrail → CloudWatch Alarm → SNS
3. **암호화 누락 자동 교정**: Config Rule `encrypted-volumes` + Remediation Action
4. **퍼블릭 S3 차단**: Config Rule + SSM Automation으로 즉시 차단
5. **SCP 위반 추적**: CloudTrail에서 AccessDenied 이벤트 추적

## 비용·운영 주의

- **CloudTrail Management Event**: 첫 Trail 무료, 두 번째부터 이벤트당 과금
- **Data Event**: 양 폭주 — **선택적 활성화** 필수
- **Config**: Configuration Item 기록 건당 과금. **자주 변경되는 리소스**(Auto Scaling 빈번한 EC2) 많으면 비용 큼
- **S3 보관 비용**: 장기 보관 시 Glacier 전환 고려
- **Trail이 멈추면 감사 공백** — CloudTrail Insights·EventBridge로 `StopLogging` 호출을 알람

## 흔한 실수

- **CloudTrail만 켜놓고 Config 안 켬** — "누가" 했는지는 알아도 "변경 전 상태"는 모름
- **Trail에 KMS 암호화·MFA Delete 미설정** — 감사 로그 자체가 변조·삭제 위험
- **Data Event 전체 활성화** — 비용 폭주
- **멀티 리전 Trail 미사용** — 다른 리전에서 발생한 이벤트 누락
- **Config Rule만 만들고 Remediation 없음** — Non-Compliant 알람만 쌓이고 실제 조치는 사람 손
- **Recorder가 일부 리소스 타입만 기록하도록 좁힘** — 감사 누락

## 시험 체크포인트

- CloudTrail = **API/활동 로그** (누가) / Config = **리소스 구성 상태** (무엇이)
- CloudTrail 이벤트 기록은 자동, 보존 **90일** — 장기 보관은 **Trail → S3**
- **Management Event vs Data Event** 구분과 Data Event가 기본 비활성인 이유
- **Insights Event**는 Write API의 비정상 호출 탐지
- **Organization Trail**: 조직 내 모든 계정 단일 수집
- **Config Rule**: 변경 트리거 vs 주기 트리거, Managed vs Custom
- **Conformance Pack**: 컴플라이언스 묶음 배포
- 자동 교정 = **Config + SSM Automation**
- 거버넌스 질문 시 CloudTrail + Config + AWS Organizations + SCP 조합 답변
- CloudTrail Log File **무결성 검증**은 SHA-256 다이제스트

## 출처

- AWS Docs — CloudTrail Concepts / Config Developer Guide
- AWS SAA C03 학습 자료 (로컬)

## 관련 문서

- [[IAM]]
- [[CloudWatch]]
- [[S3]]
- [[KMS]]
- [[Observability]]
