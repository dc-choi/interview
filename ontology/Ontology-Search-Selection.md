---
tags: [ontology, retrieval, evaluation]
status: done
category: "AI엔지니어링(AIEngineering)"
---

# 질문의 여러 조건을 담는 절 선택

2026-09-08에 `context_lookup`의 응답 구성을 개선했다. 문서 순위와 검색 API는 유지하고, 이미 찾은 문서의 필요한 절이 관계 정보에 밀리는 문제를 줄인다. 원문은 Git `4af3516d519b62d6840b04c79d1e25aba846d80d`, extractor 11 snapshot으로 고정했다.

## 적용한 선택 순서

정확한 제목, alias 등 metadata 조회는 기존 순서를 유지한다. 그 외 조회는 다음 순서를 사용한다.

1. 기존 상위 문서의 직접 근거를 담고, 선택된 직접 근거에 연결된 관계 하나를 먼저 확보한다.
2. 제한된 graph 탐색에서 선택한 문서까지 포함해, 아직 반환하지 않은 유용한 절을 최대 6개 선택한다.
3. 실제 반환 본문에서 덜 반복된 질의어를 다루는 절을 우선한다. 점수는 겹치는 각 질의어의 기존 문서 빈도 가중치를 `1 + 반환 본문에서 해당 어휘가 나타난 절 수`로 나눈 합이다. 동점은 기존 절 점수와 ID로 정한다.
4. 각 보충 절은 우선 1,400 byte 접두를 담는다. 질의어가 뒤쪽에만 있다면 전체 절을 넣을 수 있을 때만 선택한다. 소유 Document와 본문을 함께 예산 검사한다.
5. 선택된 절 전체가 들어가면 본문을 확장하고, 남은 공간에 나머지 관계와 provenance를 넣는다. 마지막으로 본문 확장을 한 번 더 시도한다.

heading 없는 root와 출처/관련 문서 절은 보충 후보에서 제외한다. 원문 receipt, scope와 기존 graph 탐색 상한은 보존한다. 이미 고른 직접 근거의 관계가 모두 우선하는 것은 아니다. 같은 절의 목차 링크가 많은 경우에도 다른 조건에 쓸 공간을 확보한다.

이 점수는 어휘 다양성 휴리스틱이다. 질문의 조건을 의미적으로 분해하거나 조건 충족을 자동 증명하지 않는다. 접두에 질의어 일부만 있고 핵심 조건은 뒤에 있는 절은 예산 부족으로 여전히 잘릴 수 있으므로, 중요한 `truncated: true` 근거는 `context_read`로 끝까지 읽는다. BM25, 임베딩과 외부 추론 API를 운영 검색기에 추가하지 않았다.

## 1차 절 선택: 재사용한 74개 질문의 비교

| 구분 | 변경 전 통과 | 변경 후 통과 | 필수 근거 그룹 |
|---|---:|---:|---:|
| 기존 58개 | 30/58 | 33/58 | 37/59 → 43/59 |
| 앞선 알고리즘 실험의 16개 | 0/16 | 1/16 | 5/24 → 8/24 |
| 합계 | 30/74 | 34/74 | 42/83 → 51/83 |

이 74개는 모두 이전 결과를 관측한 조정/회귀 자료다. 기존 통과 질문의 회귀는 없었다. 기존 실패 질문 하나에서는 개별 근거 그룹이 1개에서 0개로 줄었으며, 전체 9개 증가는 이 하락을 포함한 순증이다. 음성 질문의 무관한 응답 문제는 이번 변경으로 해결하지 않았다.

같은 로컬 프로세스에서 전후 호출 순서를 번갈아 측정한 최종 단회 관측의 p50/p95는 변경 전 약 475/573ms, 변경 후 478/607ms였다. 후보 탐색과 응답 구성을 포함한 함수 호출 시간이며 MCP 전송, 색인 로드와 모델의 도구 선택 시간은 제외한다. 반복 성능 benchmark는 아니며 이번 변경은 속도 개선으로 주장하지 않는다.

세 후보를 기존 74개에서 비교했다. root 문서 안에서만 보충한 구성은 33개 통과, 47/83 그룹이었다. graph 문서까지 포함하되 보충 절 전체를 먼저 넣은 구성은 34개, 50/83 그룹이었다. 여러 절의 접두를 먼저 확보하는 최종 구성이 34개, 51/83 그룹으로 가장 나았다.

## 1차 절 선택의 새 표본과 검증

새 합성 질문 10개는 구현과 기존 사례/결과를 보지 않은 별도 작업자가 만들었다. 양성 8개는 각각 필수 근거 그룹 2개를 요구하고 음성은 2개다. 코드를 고정한 뒤 처음 실행했으며, 관측 후 정답이나 검색 파라미터를 조정하지 않았다.

사례 원본은 [selection-holdout-cases-2026-09-08.json](evaluation/selection-holdout-cases-2026-09-08.json)이다. 첫 조회 전 원문 검사에서 H2가 H3 본문을 포함하지 않는 정의 오류를 발견해 정답 heading 4개와 음성 사례의 필수 빈 배열을 정정했다. 질문과 본문 조건은 유지했으며, 재고정 SHA-256은 `23570d3a7ce476daf56c261420dd33a6c632a603d17d75f3968fab6db6b9e955`이다.

| 새 표본의 첫 관측 | 변경 전 | 변경 후 |
|---|---:|---:|
| 전체 조건 충족 | 2/10 | 4/10 |
| 필수 근거 그룹 | 8/16 | 10/16 |
| 음성 질문의 빈 응답 | 0/2 | 0/2 |

3개 질문이 새로 통과하고 1개가 회귀했다. 회귀한 `selection-holdout-06`은 필수 근거가 2개에서 1개로 줄었다. 전체 증가와 개별 손실을 함께 보존한다. 새 표본의 개선을 모든 질문의 개선이나 무관한 응답 문제 해결로 일반화하지 않는다.

1차 절 선택 코드에서 Node 테스트 132/132와 독립 구현 검토를 통과했다. 새 회귀 fixture 3개는 변경 전 각각 실패하고 변경 후 통과했다. 실제 새 SDK stdio MCP 연결에서 개선된 기존 질문 3개를 조회하고 `context_read` 원문과 hash를 대조했다. 마지막 성능 정리는 질의어가 없는 절의 불필요한 발췌 생성을 생략했으며, 74개 출력의 근거 ID/본문 hash, byte 수와 평가 결과가 정리 전후 같았다.

합성 평가의 source/heading/body 조건 충족을 최종 답변 정확도나 사용자 만족도로 해석하지 않는다. 라벨 밖의 대체 근거는 적절해도 점수에 잡히지 않을 수 있다. 후보 문서 자체의 누락, 표현 차이와 무관한 결과 거절은 계속 남는 과제다.

## 후속 개선: 관계보다 조건 근거를 먼저 확보

모델 재정렬 실험을 미채택한 뒤 같은 날 응답 구성만 다시 비교했다. 문서 순위와 graph 탐색은 유지하며, 먼저 넣던 관계를 직접 절마다 하나에서 응답 전체의 직접 관계 하나로 줄였다. 보충 절과 전체 본문 확장 후 나머지 관계를 기존 순서대로 추가한다. 앞의 적용 순서는 이 후속 개선을 반영한다.

| 표본 | 전체 조건 충족 | 필수 근거 그룹 |
|---|---:|---:|
| 이전에 관측한 질문 94개 | 41/94 → 43/94 | 71/115 → 73/115 |
| 새 질문 10개 | 1/10 → 1/10 | 6/16 → 6/16 |
| 합계 104개 | 42/104 → 44/104 | 77/131 → 79/131 |

104개에서 기존 성공 질문과 개별 필수 근거 그룹의 손실은 없었다. OTT의 `UNKNOWN` 상태 판정표가 끝까지 반환되고, RAG 품질 검토 질문에 빠졌던 근거 추적 절이 추가되면서 두 질문이 개선됐다. 음성 질문은 기존 2/19, 새 0/2로 그대로다.

새 합성 표본은 구현과 기존 사례/결과를 보지 않은 별도 작업자가 pinned 원문으로 만들었다. 양성 8개는 tech 5개, biz 2개, econ 1개이며 각각 두 필수 근거 그룹을 요구하고, 음성은 2개다. 조회 전에 원문 검사와 파일 hash 고정을 완료했다. [사례 원본](evaluation/coverage-holdout-cases-2026-09-08.json)의 SHA-256은 `3121fb7c003cb926ac9f627eb7fb4178e2e7c51cc0b6b67e32d33aac3c5c218b`다. 구현을 고정한 뒤 처음 조회했으며 관측 후 검색 규칙이나 정답을 조정하지 않았다. 새 질문에 대한 추가 개선은 확인하지 못했다.

기존 94개에서 총 11개 후보를 비교했다. 접두 본문만으로 점수화하기, 새 검색어 우선, root 문서 우선과 조기 본문 확장은 기존 성공이나 개별 근거를 잃었다. 남는 공간에 절을 더 추가하는 구성은 점수가 같았다. 새 의존성 없이 기존 관계 추가 순서만 바꾼 구성을 채택했다. 상세 후보별 결과는 [후속 보고서](evaluation/coverage-report-2026-09-08.json)의 `candidate_comparisons`에 있다.

본문에 공간을 배정한 만큼 반환 관계 수는 104개 합계 198개에서 152개로 줄었다. graph 탐색과 관계 후보 자체를 삭제한 것은 아니며, 충분한 예산에서는 뒤로 미룬 관계도 반환한다. 관계의 개수 보존이나 모든 종류의 질문 개선을 주장하지 않는다.

같은 로컬 실행에서 호출 순서를 번갈아 측정한 104개 p50/p95는 변경 전 484/684ms, 변경 후 487/657ms다. lookup, 직렬화 예산 검사와 점수 계산을 포함하고 snapshot 로드와 MCP 전송은 제외한다. 오름차순 배열의 `floor((N - 1) * q)` 위치를 백분위로 사용했다. 단회 관찰이며 속도 개선을 입증한 부하 시험은 아니다.

Node 테스트 133/133을 통과했다. 추가한 여러 root의 링크 경쟁 fixture는 이전 코드에서 실패하고 수정 후 통과하며, 좁은 예산의 조건 근거와 관계 무결성, 넉넉한 예산의 모든 링크 반환을 검사한다. 전후 208개 응답의 byte 예산과 scope를 검증했고, 새 SDK stdio MCP 연결에서 개선된 두 질문을 조회해 `context_read` 본문과 revision/hash를 대조했다.

## 재실행

[1차 보고서](evaluation/selection-report-2026-09-08.json)는 앞선 절 선택 실험을 보존한다. 최신 [후속 보고서](evaluation/coverage-report-2026-09-08.json)에는 이전 query 원문, 질문/코드 hash와 104개 전후 결과가 있다. [실행기](evaluation/selection-compare.mjs)를 재사용하며, 원문 revision, snapshot fingerprint나 코드가 다르면 중단한다. Vault 루트에서 실행한다.

```bash
node --input-type=module <<'JS'
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const r = JSON.parse(fs.readFileSync('ontology/evaluation/coverage-report-2026-09-08.json'));
const i = r.inputs;
const codeFiles = {
  selection_compare: 'ontology/evaluation/selection-compare.mjs', score: 'ontology/evaluation/score.mjs',
  ...Object.fromEntries(['core.mjs', 'repository.mjs', 'snapshot.mjs', 'markdown.mjs']
    .map(file => [file, 'ontology/src/' + file])),
};
for (const [name, file] of Object.entries(codeFiles)) {
  const hash = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if (hash !== i.code_hashes[name]) throw new Error('Recorded code differs: ' + file);
}
const baseline = '/tmp/ontology-coverage-before.mjs';
fs.writeFileSync(baseline, i.baseline_query_source);
const args = ['ontology/evaluation/selection-compare.mjs', '--baseline-query', baseline,
  '--expected-baseline-query-hash', i.code_hashes.baseline_query,
  '--expected-current-query-hash', i.code_hashes.current_query,
  '--expected-cases-hash', i.cases_sha256,
  '--expected-revision', i.source_revision, '--expected-fingerprint', i.fingerprint,
  ...Object.keys(i.case_files).flatMap(file => ['--cases', file]),
  '--output', '/tmp/ontology-coverage-replay.json'];
process.exit(spawnSync(process.execPath, args, { stdio: 'inherit' }).status ?? 1);
JS
```

관측한 새 표본을 다시 실행한 결과는 독립 첫 관측으로 세지 않는다.

## 적용과 연결

CLI와 새 MCP 프로세스는 수정된 `query.mjs`를 사용한다. 이미 실행 중인 MCP host 연결은 재연결해야 새 코드를 읽는다. 기존 host가 교체됐다는 뜻은 아니다. 지식 원문과 snapshot schema는 이번 변경으로 바꾸지 않는다.

- [[Ontology-Operations|현재 실행 계약]]
- [[Ontology-Search-Algorithms|앞선 후보 검색 비교]]
- [[Ontology-Retrieval-Quality|기존 검색과 응답 구성의 평가 이력]]
- [[RAG-Retrieval-Engineering#Context packing과 근거 추적|적용한 지식과 근거 추적]]

상위: [[Development-Ontology]].
