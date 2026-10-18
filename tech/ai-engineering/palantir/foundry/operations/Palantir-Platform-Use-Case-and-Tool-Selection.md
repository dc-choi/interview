---
tags: [palantir, foundry]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 사용 사례와 도구 선택

## 결정에서 데이터와 도구로

Use case는 전담 팀이 일정 기간 특정 의사결정 과정을 지원하는 일이다. Dashboard 같은 산출물부터 정하기보다 누가 무엇을 언제 결정하고 결과를 어떻게 평가할지 정한다. 목적, 영향을 받는 사람, 최소 데이터와 사람의 감독 범위를 먼저 확인한다.

Data layer는 dataset과 transform, 생산 이력을 다루고 Ontology는 실제 업무의 object, link와 action을 연결한다. 사용자의 결정을 action으로 기록하고 이후 결과를 평가하는 loop까지 설계해야 분석을 운영으로 연결할 수 있다. 데이터 기반이 이미 있으면 Catalog와 Object Explorer에서 재사용 대상을 찾는다.

## 작업별 출발점

| 작업 | 도구와 선택 기준 |
|---|---|
| 원천 연결과 정제 | Data Connection, Pipeline Builder, 복잡한 코드/협업은 Code Repositories |
| 데이터셋 분석 | Contour, 탐색 코드 환경은 Code Workspaces; Code Workbook은 legacy 경계 확인 |
| Ontology 분석 | Quiver/Insight, 미지의 object 탐색은 Object Explorer |
| 업무 화면 | Workshop, 높은 UI 자유도는 OSDK React/Slate, 맞춤 widget과 유지 비용 비교 |
| 공유 로직/LLM 작업 | Functions/AIP Logic, 조건 기반 실행은 Automate |
| 모델 개발/운영 | Model Assets와 Modeling Objectives, 재현성과 평가/배포 계약 별도 확인 |
| 문서/보고 | Notepad, spreadsheet 양방향 작업은 Fusion |
| 배포와 재사용 | DevOps로 제품화하고 Marketplace로 설치 |
| 운영/보호 | Data Health, Workflow Lineage, Resource Management와 보안 도구 |

Prototype에서 빠르게 피드백을 받은 뒤 production pipeline과 tailored application이 필요한지 판단한다. 모든 사례에 복잡한 Ontology 확장과 custom app이 필요한 것은 아니다. 역할은 고정된 제품 경계가 아니며 작은 팀은 data engineer/builder/analyst/admin 책임을 함께 수행할 수 있다.

## 개요와 실행 계약

LLM용 platform summary는 2026-07-02 갱신된 고수준 맥락이며 세부 기능의 quota, runtime과 권한 보장을 대체하지 않는다. 예를 들어 batch는 실행 방식이고 full recompute는 transaction/변환 모드의 선택이므로 batch를 무조건 전체 재계산과 동일시하지 않는다.

Palantir MCP의 Ontology schema 제작 기능과 Ontology MCP의 제한된 데이터 읽기/Action 실행도 목적이 다르다. SDK, branch, model 지원 범위는 사용하는 세부 문서와 버전을 확인한다. 도구 목록의 규제 준수 표현만으로 특정 배포의 법적 준수나 실제 권한 통제가 증명되지는 않는다.

## 출처

- [Palantir Foundry, getting-started](https://www.palantir.com/docs/foundry/getting-started/)
- [Palantir Foundry, application-reference](https://www.palantir.com/docs/foundry/getting-started/application-reference/)
- [Palantir Foundry, delivering-a-use-case](https://www.palantir.com/docs/foundry/getting-started/delivering-a-use-case/)
- [Palantir Foundry, foundry-platform-summary-llm](https://www.palantir.com/docs/foundry/getting-started/foundry-platform-summary-llm/)
- [Palantir Foundry, introductory-concepts](https://www.palantir.com/docs/foundry/getting-started/introductory-concepts/)
- [Palantir Foundry, next-steps-by-role](https://www.palantir.com/docs/foundry/getting-started/next-steps-by-role/)
- [Palantir Foundry, overview](https://www.palantir.com/docs/foundry/getting-started/overview/)

## 관련 문서

- [[Palantir-Foundry-Operations]]
