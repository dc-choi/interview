---
tags: [observability, logging]
status: done
category: "관측가능성(Observability)"
aliases: ["Structured Logging", "구조화된 로깅"]
---

# Structured Logging

## 왜 구조화된 로깅인가

사람이 읽을 수 있는 로그가 아닌 **기계가 읽을 수 있는 로그 형식**이 필요하다.

기존 문제:
- 에러 발생 시 EC2 CPU/메모리 과다 사용으로 로그 파일 확인 불가
- 로그가 일정 기간 지나면 삭제됨
- 빠르게 로그 데이터를 확인할 수 있는 환경 부재

## 중앙집중형 로그 적재

분산 처리 환경에서 어떤 API 요청/응답인지 파악이 어렵기 때문에 중앙집중형 적재 방식을 선택한다.

## 로깅 레벨 기준

- 경고(warn) 이상만 적재하는 전략
- 인터셉터와 FluentBit에서 필터링

## 마스킹 기준

- 전역적으로 로그 처리
- 개인정보 누출 방지를 위해 웬만하면 전송하지 않음
- 필요 시 전역적으로 마스킹 적용 후 적재

## 관련 문서
- [[Correlation-ID|Correlation ID / Trace ID]]
- [[Log-Pipeline|Log Pipeline]]
- [[PII-Masking|PII masking]]
