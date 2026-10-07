---
tags: [observability, mcp, grafana, eks, incident-response]
status: done
verified_at: 2026-10-07
category: "관측가능성(Observability)"
aliases: ["MCP Incident Investigation", "MCP 기반 장애 조사"]
---

# MCP 기반 장애 조사와 변경 권한

관측 도구를 에이전트에 연결하면 자연어 질문을 메트릭, 로그와 trace 조회로 바꿀 수 있다. 결과 요약과 원인 가설, 운영 환경의 변경은 각각 다른 단계다.

## 신호 연결

다음은 장애 조사 흐름의 설계 예시다.

1. 서비스, 환경과 시간 범위를 고정하고 메트릭에서 오류나 지연이 시작된 구간을 찾는다.
2. 같은 범위의 로그를 조회하고 요청의 trace ID를 찾는다.
3. Trace의 span별 시간과 로그를 대조한다. 느린 구간과 오류를 반환한 구간을 구분한다.
4. 실제 설정, 배포 이력과 원인을 대조한 뒤 변경안을 만든다.

Grafana의 Tempo data source는 trace에서 로그나 메트릭으로 이동하는 연결을 제공한다. 반대 방향의 로그에서 trace로 이동은 Loki derived fields, 메트릭에서 trace로 이동은 exemplar 설정을 확인한다. MCP를 붙이는 것만으로 누락된 계측이나 trace ID가 생기지는 않는다.

## 현재 도구 범위

2026-10-07 공식 문서 기준이다. Grafana MCP는 Tempo 도구 범주를 지원한다. 별도 Tempo 서버가 항상 필요하다는 과거 데모의 구성을 현재 제약으로 사용하지 않는다.

| 설정 | 동작 |
|---|---|
| Grafana `--disable-write` | 쓰기 도구를 제거하면서 일반 조회는 유지 |
| Grafana `--disable-query` | 데이터 소스 쿼리 실행 도구까지 제거 |
| EKS MCP `--allow-write` | 기본 false, 리소스 변경 작업을 허용하는 별도 옵션 |
| EKS MCP `--allow-sensitive-data-access` | 로그, 이벤트와 Secret 등 민감 자료 접근에 필요한 별도 옵션 |

Grafana의 읽기 모드는 원시 SQL을 넘기는 `query_sql`, `query_influxdb`도 제거한다. 이 도구를 다시 켜는 `--enable-query`는 데이터 소스 자격증명이 읽기 전용임을 확인한 경우에 사용한다. 실제 IAM, Kubernetes와 데이터 소스의 권한도 함께 제한한다.

## 원인 설명과 복구 증거

다음은 운영 설계 제안이다. 조사용 권한과 변경용 권한을 분리하고, 변경 전에 대상과 diff, 복구 조건을 검토한다. 데이터가 없을 때 수집 누락, 조회 권한 부족과 실제 이벤트 부재를 구분한다.

예를 들어 응답에 5초가 걸리는 의존성을 3초 timeout으로 호출하면 timeout 확대가 증상을 줄일 수 있다. 그러나 의존성이 느려진 원인이나 사용자 응답 목표를 해결했다는 뜻은 아니다. 변경 후 오류율, 전체 지연과 자원 포화를 다시 확인한다.

## 출처

- [Grafana, Enable and disable tools](https://grafana.com/docs/grafana-cloud/ai-tools/mcp-servers/oss-mcp/configure/enable-and-disable-tools/)
- [Grafana, Configure the Tempo data source](https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/)
- [AWS Labs, Amazon EKS MCP Server](https://awslabs.github.io/mcp/servers/eks-mcp-server)

## 관련 문서

- [[DevOps-Agent-Grafana|AWS DevOps Agent의 Grafana 연동]]
- [[Incident-Runbook|장애 대응 런북]]
- [[Correlation-ID|Correlation ID와 Trace ID]]
- [[MCP-Security-Boundaries|MCP 보안 경계]]
