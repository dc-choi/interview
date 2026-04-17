---
tags: [observability, logging, aws]
status: done
category: "관측가능성(Observability)"
aliases: ["Log Pipeline", "로그 파이프라인"]
---

# Log Pipeline

## 초기 로그 시스템은 버려진다 (원칙)

서비스 초기에 구축한 로그 시스템은 **서비스가 성장하면서 대부분 버려지거나 재구축**된다. 그 이유:

- **트래픽 증가로 원래 구조가 한계에 봉착** — 초기 CloudWatch·DB 저장이 비용·스케일 문제
- **분석 요구 변화** — 초기엔 단순 에러 추적이지만, 성장하면 BI·이상 탐지·보안 감사가 필요
- **조직 구성 변화** — 데이터 팀·보안 팀 생기면 다른 목적의 로그 요구

실용 전략:
- **초기엔 단순·저비용** (Sentry + CloudWatch 기본)
- **PMF 검증 후 본격 파이프라인** (ELK·FluentBit→Firehose→S3)
- **처음부터 완벽 설계 지양** — 과도한 선제 투자는 낭비

예외: **결제·거래 로그는 처음부터 ACID DB에** — 소급 재구축 불가. 초기 설계 실수가 법적·재무적 사고로 이어짐.

## 아키텍처 변천 (300$ -> 2$)

### 1단계: CloudWatch Logs
- 버튼 한번으로 적재 가능
- 단점: **비용이 너무 비쌈**

### 2단계: FluentBit + Firehose + S3 (최종)

```
Application -> FluentBit(사이드카) -> Firehose -> S3
```

#### FluentBit 선택 이유
- **경량성**: 저사양 인스턴스에 적합
- Firehose와 쉬운 통합
- 간단한 구성

#### 사이드카 패턴
메인 프로세스 옆에서 돌아가는 서브 프로세스이다.
로그 관리 로직을 애플리케이션 레벨에서 직접 처리하는 번거로움을 피하고, 애플리케이션과 로그 관리 로직을 **디커플링**하기 위해 사용한다.

#### Firehose를 거치는 이유
FluentBit에서 S3로 직접 적재 가능하지만, S3 호출비용이 있어서 중간에 Firehose를 두어 배치 처리한다.

## 백프레셔 문제

- 1초에 1000건까지 처리 가능
- 초과 시 앞단에 **Kinesis Data Streams** 도입 고려

## Fail-over

FluentBit/Fluentd의 fail-over 문제에 대한 추가 검토 필요

## S3 데이터 관리

S3에 데이터가 많이 쌓이는 문제에 대한 lifecycle 정책 필요

## 출처
- [TS Backend Meetup 1 — 로그 적재 비용 개선기](https://woowa.tech/ts-backend-meetup-1)
- [supims (brunch) — 안정적인 Node.js 기반 백엔드 시스템 8편 (로그)](https://brunch.co.kr/@supims/129)

## 관련 문서
- [[Structured-Logging|Structured logging]]
- [[Correlation-ID|Correlation ID / Trace ID]]
- [[Logs-vs-Metrics|로그 vs 메트릭]]
