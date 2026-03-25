---
tags: [observability, logging, aws]
status: done
category: "관측가능성(Observability)"
aliases: ["Log Pipeline", "로그 파이프라인"]
---

# Log Pipeline

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

## 관련 문서
- [[Structured-Logging|Structured logging]]
- [[Correlation-ID|Correlation ID / Trace ID]]
