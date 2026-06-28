---
tags: [database, operations, self-service, observability, aiops, mcp, security]
status: done
category: "데이터&저장소(Data&Storage)"
aliases: ["Self-Service DB Diagnostics", "셀프서비스 DB 진단", "DB Insight 도구", "DB AIOps", "KDMS Database Insight"]
---

# 셀프서비스 DB 진단 플랫폼

DB 이슈가 의심되면 보통 개발팀이 APM(Datadog, Sentry)에서 증상을 먼저 보고, Grafana/CloudWatch로 넘어가지만 지표만으로는 원인 쿼리를 짚기 어렵다. 결국 DB팀에 문의하고, DB팀은 Performance Insights, 슬로우 쿼리 로그, 각종 지표를 다시 확인한다. 정보가 여러 도구에 흩어져 있어 **화면을 오가는 비용 + 팀 간 설명/확인 비용**이 크다.

셀프서비스 DB 진단 플랫폼은 이 흩어진 정보를 **한 화면에 모으고, 개발자가 직접 1차 분석**할 수 있게 만드는 내부 도구다. [[Database-Operations-Automation#셀프서비스-진단-도구|DB 운영 자동화]]의 "셀프서비스 진단 도구" 도메인을 구체화한 모습이다.

## 두 가지 목표

1. **개발자 직접 분석**: DB팀 도움 없이도 기본적인 DB 이슈를 좁힐 수 있게 한다 → DBA가 병목이 되지 않음.
2. **정보 통합**: Performance Insights, Grafana, CloudWatch, 로그 그룹에 흩어진 정보를 한 화면에 모은다.

곧 DB 분석을 "전문가만 보는 계기판"에서 "개발자도 이해하는 대시보드"로 바꾸는 일이다.

## 화면 설계 철학 — action-oriented

| 원칙 | 내용 |
|------|------|
| **CPU를 먼저** | 복잡한 wait event보다 개발자가 직관적으로 이해하는 CPU 그래프를 상단에 |
| **순위표보다 비교** | "가장 무거운 쿼리"가 아니라 "평소와 달라진 것" — [[DB-Incident-Triage|시점 비교]]가 1급 기능 |
| **행동으로 이어지는 정보** | CPU, QPS, 레이턴시, 신규 쿼리, 실행 계획처럼 곧장 조치로 연결되는 지표 우선 |

주요 탭 구성:
- **Top Query**: Performance Insights 기반 상위 SQL과 통계.
- **Slow Query**: 해당 시간대 실제 발생한 슬로우 쿼리.
- **Monitoring**: Grafana/CloudWatch에서 보던 주요 DB 지표를 한곳에.

분석 방법론(시점 비교, 장애 3유형, 실행 계획+스키마 통계, MongoDB)은 [[DB-Incident-Triage|DB 장애 분석 방법론]] 참고.

## DB팀 문의 — 맥락 전달 비용 제거

개발자가 추가 도움이 필요하면 도구에서 바로 Slack으로 문의한다. 문의 시 **쿼리, 진단 화면 링크, 실행 계획이 스레드에 자동 첨부**된다. DBA는 "어느 DB, 어느 시간, 어떤 쿼리, 어떤 실행 계획인지"를 되묻지 않고 곧장 분석을 시작한다 — 맥락 재수집 비용이 0에 수렴.

## AI 보조 분석 — 조수, 대체자가 아님

실행 계획을 조회하면 AI가 효율/비효율을 판단하고 튜닝 방향을 제안한다. AI는 DBA를 대체하는 게 아니라 **개발자가 첫 분석을 빠르게 시작하도록 돕는 조수**다.

LLM 답변은 실행마다 흔들리므로, **엔진별 판단 기준을 프롬프트에 명시**해 결과를 안정화한다.

- PostgreSQL: 불필요한 Sequential Scan, 과도한 Index Scan을 비효율로 판단.
- MySQL: 테이블 풀스캔, 인덱스 풀스캔, 많은 row에 대한 filesort를 위험 신호로 판단.

## MCP로 Slack/AI 에이전트까지 확장

[[MCP|MCP(Model Context Protocol)]]는 LLM이 외부 도구/데이터에 접근하는 표준 프로토콜이다. 진단 도구의 **시점 비교, 실행 계획 조회, 지표 조회**를 MCP 서버로 노출하면, 웹 UI뿐 아니라 Slack이나 AI 에이전트에서도 같은 기능을 쓸 수 있다.

반자동 분석 흐름의 예:
```
DB 알람이 뜬 Slack 스레드 → 특정 이모지 클릭
  → AI가 KDMS MCP로 시점 비교 / 실행 계획 / 지표 조회
  → 종합해 1차 분석 결과를 댓글로 작성
```

운영 자동화의 다음 단계는 단순 대시보드가 아니라, Slack/AI/MCP와 연결된 **반자동 분석 흐름**이다.

## AI 연동 보안 설계 (필수)

DB 정보는 민감해서 AI를 붙이는 것보다 **AI가 봐도 되는 정보만 보게 만드는 것**이 더 중요하다.

| 통제 | 방법 |
|------|------|
| **접근 제어** | 허용된 Slack 채널/사용자에 대해서만 자동 분석 동작 |
| **호출 경로** | LLM 호출은 사내 LLM 라우터 경유 (외부 직접 호출 차단) |
| **네트워크 격리** | MCP 서버를 사내망에 배치해 외부에서 직접 호출 불가 |
| **데이터 최소화** | 쿼리 문자열 등 민감 정보는 **마스킹**해 전달 |

## 면접 체크포인트

- 흩어진 모니터링 도구가 만드는 비용(화면 이동 + 팀 간 커뮤니케이션)과 셀프서비스 통합의 가치
- 화면 설계에서 CPU 우선, "순위표보다 비교", action-oriented 원칙
- Slack 문의에 쿼리/화면 링크/실행 계획을 자동 첨부해 맥락 비용을 없애는 설계
- AI를 "대체자"가 아니라 "조수"로 두고 엔진별 판단 기준을 프롬프트에 고정하는 이유
- MCP로 같은 기능을 웹/Slack/에이전트에 재사용하는 구조
- AI 연동 보안 4종(채널/사용자 제한, 사내 LLM 라우터, MCP 사내망, 쿼리 마스킹)

## 사례
- 대규모 DB fleet 운영팀이 내부 DB 어드민(KDMS)에 "데이터베이스 인사이트"를 만들어 Performance Insights/Grafana/CloudWatch/로그를 한 화면에 통합하고, Slack 문의와 MCP 기반 AI 자동 분석(이모지 트리거)까지 확장한 사례가 있다. AI 연동에는 채널/사용자 제한, 사내 LLM 라우터, MCP 사내망 배치, 쿼리 마스킹을 적용했다.

## 출처
- [KDMS 데이터베이스 인사이트 — DB 이슈 분석 도구와 운영 (YouTube)](https://www.youtube.com/watch?v=NrPY9J1a2ag&list=PLaHcMRg2hoBoFR-9MlfJP56xrcIxBInCm&index=5)

## 관련 문서
- [[DB-Incident-Triage|DB 장애 분석 방법론]] — 이 도구가 구현하는 분석 방법론
- [[Database-Operations-Automation|DB 운영 자동화]] — 셀프서비스 진단 도구의 상위 도메인
- [[DB-Provisioning-Pipeline|DB 프로비저닝 파이프라인]] — 같은 어드민 시스템의 생성 자동화 축
- [[MCP|MCP (Model Context Protocol)]] — AI 에이전트 도구 연동 표준
- [[RDS-Monitoring|RDS 모니터링]] — Performance Insights, CloudWatch 지표
- [[MySQL-Digest-Statistics|MySQL Digest 통계 운영]] — Top Query 통계의 신뢰도 함정
