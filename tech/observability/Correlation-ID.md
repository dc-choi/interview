---
tags: [observability, logging, tracing]
status: done
category: "관측가능성(Observability)"
aliases: ["Correlation ID", "Trace ID"]
---

# Correlation ID / Trace ID

## 개념

분산 환경(MSA)에서 요청의 전체 흐름을 추적하기 위한 식별자이다.

### 글로벌 트레이스 ID
- MSA 환경에서 **전체적인 흐름의 추적**을 위해 사용
- 여러 서비스를 거치는 하나의 요청을 하나의 ID로 묶음

### 트레이스 ID
- 개별 서비스 내에서의 **요청/응답 식별**용

## 필요한 이유

중앙집중형 로그 적재 방식에서 분산 처리 요청을 받기 때문에, 어떤 API 요청/응답인지에 대한 파악이 어려움. 글로벌 트레이스 ID로 전체 흐름을 추적한다.

## 관련 문서
- [[Structured-Logging|Structured logging]]
- [[Log-Pipeline|Log Pipeline]]
