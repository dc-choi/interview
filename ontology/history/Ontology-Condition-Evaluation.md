---
tags: [ontology, retrieval, evaluation, history]
status: done
category: "AI엔지니어링(AIEngineering)"
---

# 조건별 근거 탐색의 평가 이력

2026-09-08의 조건별 후속 탐색과 충분성 관측을 보존한다. 아래의 현재 코드, 테스트 개수와 스킬은 관측 당시 기준이며, 현행 host 작업 계약은 [[Ontology-Condition-Retrieval]]을 따른다.

## 첫 관찰과 비교, 2026-09-08

별도 작성자가 검색 구현과 결과를 보지 않고 committed 원문에서 새 질문 6개를 만들었다. 기술 4개, 사업 1개, 경제 1개이며 모두 근거가 존재하는 양성 사례다. 질문과 정답 파일을 분리한 뒤 다른 host가 질문과 실제 반환 결과만 보고 탐색했다. 정답이나 64KB 대조 결과로 후속 대상을 고르지 않았다.

원문 revision은 `4af3516d519b62d6840b04c79d1e25aba846d80d`, fingerprint는 `7ffdefc7aea57c401552d40e5b97e2082aa528c451650b4ec1261fe05a0f5991`이다. 검색 함수는 이번 작업에서 바꾸지 않았다. 성공한 응답의 색인 상태는 `unindexed_worktree`이며 미커밋 지식을 검색한 결과가 아니다.

| 방식 | 필수 근거 모두 충족 | 근거 그룹 충족 | 6문항 응답 byte 합계 | 도구 실행 중앙값 |
| --- | ---: | ---: | ---: | ---: |
| 단일 검색, 질문당 24,000 상한 | 1/6 | 5/12 | 143,205 | 696ms |
| 단일 검색, 질문당 64,000 상한 | 2/6 | 7/12 | 365,003 | 687ms |
| 조건별 후속 탐색, 질문당 합계 64,000 상한 | 3/6 | 7/12 | 186,617 | 1,028ms |

byte는 실제 `structuredContent` JSON 합계이며 MCP envelope는 제외했다. 같은 64,000 상한 비교도 실제 사용량은 다르다. 시간은 고정한 경로의 MCP 재실행 1회 관측으로, host의 사고 시간과 실제 작업 전체 시간을 포함하지 않는다. 모델과 reasoning 설정은 host 실행 기록에 남기지 못했다.

- 24KB 첫 검색 대비 refresh token 동시 갱신과 가격 인상 후 매출 질문이 추가 통과했고, 통과하던 질문의 손실은 없었다.
- 64KB 단일 검색 대비 위 두 질문은 추가 통과했지만 schema rollout 질문의 통과를 잃었고, metric cardinality 질문의 부분 근거도 줄었다. 전체 그룹 수는 7/12로 같으므로 일반적인 검색 우위를 주장하지 않는다.
- 실제 호출은 lookup 6회, outline 3회, read 5회로 총 14회다. read 실패 1회도 포함한다. 질문별로 1~4회, 최대 43,204 byte를 사용했다. 추가 query 검색은 이 표본에서 사용하지 않았으므로 그 효과는 아직 관측하지 않았다.
- host가 적은 15개 조건은 모두 `supported`였지만 이 조건 목록과 평가의 12개 그룹은 기준이 다르다. 인용 문장이 존재한다는 검사만으로 의미적 완결성이나 최종 답변의 정확도를 입증하지 않는다. 음성 질문의 오탐도 이번 표본에 포함하지 않았다.

별도 검토자는 점수상 실패한 rollout, metric, invariant 질문에서도 다른 반환 원문이 관련 설명을 제공한다고 확인했다. 고정 정답 목록이 유효한 대안 원문을 빠뜨릴 수 있다는 관찰이며, 이번 점수를 높이려고 정답 경로를 추가하지 않았다. 15개 조건 중 backfill 중단과 재개 조건은 반환된 전체 본문에 설명이 있지만 trace에 옮긴 인용은 배치 실행만 언급해 불충분했다. 이 인용과 판정 기록도 사후에 고치지 않고 한계로 보존했다.

실행 중 문구와 인자 설명을 보강했으므로 이 결과는 사전에 상한을 전달한 초안 host 절차의 첫 관찰이다. 최종 스킬 파일의 지시를 그대로 재현한 성능 평가로 부르지 않는다. 보고서의 `replay_artifact_hashes`는 재실행 시점의 파일 hash다.

## 재현과 감사 기록

[질문](../evaluation/condition-followup/questions-2026-09-08.json), [평가 정답](../evaluation/condition-followup/labels-2026-09-08.json), [고정 탐색 기록](../evaluation/condition-followup/plans-2026-09-08.json), [비교 보고서](../evaluation/condition-followup/report-2026-09-08.json)와 [작성 및 정정 이력](../evaluation/condition-followup/provenance-2026-09-08.json)을 분리해 보관한다.

최초 trace에서 실패한 CLI 요청의 ID를 성공한 요청의 ID로 잘못 옮겨, 재실행기가 정답 파일을 열기 전에 불일치를 거부했다. 실제 실행 로그와 대조해 그 필드 하나만 원래의 오타 ID로 복구했다. [최초 trace](../evaluation/condition-followup/plans-initial-2026-09-08.json)도 보존하며, 실제 실패 1회를 지우거나 성공으로 대체하지 않았다.

아래 명령은 현재 조회 코드로 고정 경로를 다시 실행한다. 같은 관측을 비교하려면 보고서의 코드 hash, revision과 fingerprint도 일치하는지 확인한다. 스킬의 지시를 실행하거나 질문의 재해석과 모델의 탐색 선택을 다시 생성하는 명령은 아니다.

```bash
node ontology/evaluation/condition-followup.mjs \
  --questions ontology/evaluation/condition-followup/questions-2026-09-08.json \
  --labels ontology/evaluation/condition-followup/labels-2026-09-08.json \
  --plans ontology/evaluation/condition-followup/plans-2026-09-08.json \
  --expected-plans-hash 0cfeebf5b4b6c9d31dfba61fb008f3e9124e439ba3afc10a1d2b80e2e012da62 \
  --output /tmp/ontology-condition-replay.json
```

검증기는 정해진 실패를 포함한 호출, 총 byte, scope, revision, 인용 ID와 hash, 이전에 반환된 목차 위치와 검색 cursor, 연속 읽기와 완전한 본문의 hash를 검사한다. lookup/search의 fingerprint와 manifest hash 및 실행 전후 snapshot을 대조하며 정답은 전체 탐색 후에만 읽는다. 모델의 의미 판단은 자동 검증하지 않는다. 테스트 136개가 통과했고 실제 MCP 재실행에서도 상한과 receipt 검사가 통과했다.

## 충분성과 음성 질문의 새 관측

별도 작성자와 탐색 host를 분리한 새 합성 질문 9개에서 조회 21회를 기록했다. 양성 4개, 현재 운영 사실 3개와 혼합 2개이며 질문별 scope를 미리 지정했다. 첫 lookup의 조건 힌트 비교는 전체 충분성 개선 없이 일부 근거의 증가와 손실을 함께 보였다. 최종 host 스킬은 힌트를 기본으로 생략한다.

host가 충분하다고 판정한 양성 4개 중 2개는 독립 검토에서 Relay 중복 발생 경계 또는 jitter가 재시도 파형을 분산하는 설명이 빠졌다. 운영 사실 3개를 미확인, 혼합 2개를 부분 근거로 남긴 판단에는 문제가 발견되지 않았다. 최종 스킬은 동작 원리와 보장 경계를 명시적으로 대조하지만 이 문구 보강의 효과를 새 표본에서 입증한 것은 아니다.

원본 trace는 호출 전 `reason`과 `condition_ids`가 없어 검증기가 재생 전에 거부했다. 사후 inventory export를 호출 전 hash 고정으로 주장하지 않는다. 최종 규칙의 완전한 실행 평가가 아닌 첫 관측으로 [질문, 기준과 실제 응답](../evaluation/sufficiency/sufficiency.md)을 보존한다. 현재 구현의 Node 테스트 145개는 통과했다.

## 관련 문서

상위: [[Ontology-History]]. 전체 지도: [[Development-Ontology]].

- [[Ontology-Condition-Retrieval]]
- [[Ontology-Search-Selection]]
