---
tags: [observability, aws, cloudwatch, monitoring, logs, metrics]
status: index
category: "Observability"
aliases: ["CloudWatch", "Amazon CloudWatch"]
---

# Amazon CloudWatch (cloudwatch 인덱스)

AWS의 통합 옵저버빌리티 — Metrics, Logs, Alarms, Events, Insights를 한 서비스로 묶는다. 주제별 상세는 아래 문서로 분리.

## 문서
- [x] [[Network-Synthetic-Monitoring|네트워크 합성 모니터링]] — 능동 probe, RTT와 패킷 손실, NHI의 경로 범위와 해석 한계
- [x] [[CloudWatch-Investigations|CloudWatch AI 장애 조사]] — 조사 방식과 권한, 가설 채택과 런북 실행의 구분
- [x] [[Bedrock-Observability|Bedrock 관측]] — 성공 호출과 전체 시도, 지연과 로그 전달, RAG 계측과 피드백 EMF
- [x] [[CloudWatch-Metrics|CloudWatch Metrics (기본 5분 vs 상세 1분, Namespace/Dimension, 카디널리티 함정, EMF)]]
- [x] [[CloudWatch-Logs-Alarms|CloudWatch Logs와 Alarms (Log Group/Stream, Log Insights, Static/Composite Alarm, Anomaly Detection, Billing Alarm, SNS 이메일 구독 점검)]]
- [x] [[CloudWatch-Operations|CloudWatch 운영 (Container/Lambda Insights, Agent, EventBridge, 비용 함정, 면접 체크포인트)]]

## 출처
- AWS 핵심 서비스 정리 — 학습 메모
- AWS SAA C03 학습 자료 (로컬)

## 관련 문서
- [[관측가능성(Observability)|Observability]]
- [[Logs-vs-Metrics|Logs vs Metrics]]
- [[Application-Performance-Monitoring|APM]]
- [[Structured-Logging|구조화 로깅]]
- [[Container-Monitoring|컨테이너 모니터링]]
- [[Ops-Level-Indicator|운영 지표]]
- [[EventBridge|EventBridge]]
- [[EC2|EC2]]
- [[AWS-Lambda|Lambda]]
- [[Auto-Scaling|EC2 Auto Scaling]]
