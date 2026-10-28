---
tags: [opensearch, observability, tracing, opentelemetry]
status: done
verified_at: 2026-10-29
category: "관측가능성(Observability)"
aliases: ["OpenSearch Trace Investigation", "OpenSearch 개별 trace 조사"]
---

# OpenSearch에서 개별 trace 조사하기

Trace 조사는 한 요청의 호출 관계, 소요 시간과 오류를 좁힌 뒤 관련 로그로 원인 가설을 확인하는 과정이다. 전체 서비스의 지연 분포와 한 trace 안의 span 분포를 구분한다.

## 배포 범위를 먼저 확인한다

2026-10-29 공식 문서와 OpenSearch 3.9 릴리스 노트 대조 기준이다. 아래 화면은 **OpenSearch Observability Stack**의 Discover Traces를 대상으로 한다. 이 스택은 core OpenSearch와 별도로 배포하고 버전도 독립적으로 관리한다. core 버전만 올렸다고 같은 화면이 제공된다고 가정하지 않는다. AWS 관리형 서비스의 UI는 [[OpenSearch-Observability|Amazon OpenSearch 통합 관측성]]에서 따로 다룬다.

## 데이터와 로그 연결

자동 dataset 생성은 `otel-v1-apm-span*` trace 인덱스와 `logs-otel-v1*` 로그 인덱스를 탐지한다. 다른 이름을 쓰면 Trace 신호 유형의 dataset과 로그 correlation을 수동으로 설정한다. 화면 설정은 애플리케이션의 계측이나 누락된 trace context를 대신하지 않는다(운영 점검).

## 한 요청 안에서 범위를 좁힌다

| 보기와 필터 | 읽는 방법 |
|---|---|
| Timeline | 서비스별 색, span 소요 시간과 오류 표시로 호출 계층을 확인한다 |
| Status, Duration | Error/OK/Unset과 최소 시간으로 span을 좁힌다. p90/p99 preset은 **현재 trace 내부** 기준이다 |
| Attributes | span 필드의 `=` 또는 `!=` 조건으로 대상 작업을 고른다 |
| Trace map | 이 trace에 참여한 서비스의 호출, 오류와 소요 시간을 본다. 전체 운영 트래픽의 topology로 해석하지 않는다 |
| Related logs | 선택한 trace context를 유지하며 연결된 로그로 이동한다 |

필터는 Timeline, Span list와 Trace map에 함께 적용된다. Status와 Duration 변경은 cluster를 다시 조회하지 않고 적용된다. 서비스 카드를 선택하면 페이지에 `serviceName` 필터가 추가된다.

## 운영 점검

다음은 UI 동작에서 도출한 조사 절차다.

1. 요청의 시간 범위와 환경을 고정하고, 오류 또는 긴 span부터 확인한다.
2. 필터를 해제해 부모와 자식 호출을 다시 본다. 숨겨진 span을 수집 누락으로 판단하지 않는다.
3. 같은 trace의 로그에서 예외와 재시도를 확인한다. 빨간 span만으로 최초 원인을 확정하지 않는다.
4. 서비스 전체 지연 악화 여부는 같은 시간대의 서비스 지표로 확인한다. 개별 trace의 p99 preset을 서비스 SLO 판정에 쓰지 않는다.

공식 문서만 대조했으며 실제 스택 설치와 UI 실행은 확인하지 않았다.

## 출처

- [OpenSearch Observability Stack, Discover Traces](https://observability.opensearch.org/docs/investigate/discover-traces/)
- [OpenSearch and OpenSearch Dashboards 3.9.0 Release Notes — OpenSearch Project](https://github.com/opensearch-project/opensearch-build/blob/main/release-notes/opensearch-release-notes-3.9.0.md)

## 관련 문서

- [[OpenTelemetry|OpenTelemetry와 trace context]]
- [[OpenSearch-Observability|Amazon OpenSearch 통합 관측성]]
- [[Logs-vs-Metrics|로그, 메트릭과 trace의 역할]]
