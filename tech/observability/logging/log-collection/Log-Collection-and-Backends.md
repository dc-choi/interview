---
tags: [observability, logging, pipeline, centralized-logging]
status: index
category: "관측가능성(Observability)"
aliases: ["Log Collection and Backends", "로그 수집과 저장 백엔드"]
---

# 로그 수집과 저장 백엔드

생성된 로그를 어디로 모으고 어떤 저장소에 넣어 조회하는지 다루는 문서를 모은다. 수집 파이프라인 설계, Loki의 저장 모델과 LogQL, AWS 배포형 중앙 로깅 솔루션이 한 축이다.

- [[Log-Pipeline|중앙 집중식 로그 파이프라인]]: 수집, 버퍼, 처리, 저장의 기본 구조와 전달 경로 선택, 역압력과 DLQ 재생, 스키마와 인덱스 설계, 운영 체크리스트
- [[Loki|Loki]]: 라벨만 인덱싱하는 로그 백엔드의 저장 모델, 컴포넌트 경로, TSDB shipper와 Compactor, 스트림 카디널리티, LogQL, 수집 에이전트 Alloy 전환
- [[Centralized-Logging-with-OpenSearch|AWS OpenSearch 중앙 로깅]]: CloudFormation 배포형 AWS 솔루션의 2026-12 종료 일정, 제어 평면과 데이터 평면, 지원 소스 경로, OpenSearch와 Light Engine 선택, 구축 순서와 삭제 비용 통제

## 함께 볼 문서

- [[logging|로깅]]
