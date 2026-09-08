---
tags: [ontology, evaluation, evidence]
status: index
---

# 근거 충분성 평가 기록

2026-09-08의 새 합성 질문 9개와 첫 관측을 보존한다. 원문은 Git `55e30655a20d03e6d26fd941b8319a7b7d62788c`이며 질문마다 scope를 미리 지정했다.

- [질문](questions-2026-09-08.json): 구현과 기존 평가를 보지 않은 작성자가 만든 입력
- [평가 기준](labels-2026-09-08.json): 탐색 host와 분리한 의미 조건
- [관측 보고서](report-2026-09-08.json): 고정 host plan, 실제 응답 21개, 첫 lookup 대조 응답 9개, 독립 판단과 provenance

첫 lookup의 충분성은 힌트 전후 모두 양성 4개가 partial, 운영 사실 3개가 insufficient, 혼합 2개가 partial이었다. 일부 근거는 늘었지만 backfill 중단 조건의 본문은 줄었다. 힌트는 기본으로 켜지 않는다.

후속 탐색 host가 충분하다고 판정한 4개 중 2개는 독립 검토에서 설명 누락이 발견됐다. 운영 사실 3개를 미확인, 혼합 2개를 부분 근거로 남긴 판단에는 문제가 발견되지 않았다. 이 결과를 최종 스킬의 정확도나 일반적인 사용자 작업 성공률로 해석하지 않는다.

원본 trace에는 호출 전 `reason`과 `condition_ids`가 빠져 검증기가 재생 전에 거부했다. 사전 inventory 파일은 사후 export이며 원래 호출 전 hash는 남기지 못했다. 기록을 사후에 통과하도록 보강하지 않았고, 최종 스킬에는 해당 기록 규칙을 명시했다.

보고서의 응답은 원래 직렬화와 SHA-256으로 대조할 수 있다. 이는 저장된 관측의 무결성 확인이며 새로운 검색이나 의미 판단의 재실행은 아니다. 기술 검증은 `cd ontology && npm test`로 실행한다.

상위: [[Ontology-Condition-Retrieval]]. 검색 선택: [[Ontology-Search-Selection]].
