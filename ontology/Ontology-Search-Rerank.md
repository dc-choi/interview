---
tags: [ontology, retrieval, evaluation, reranking]
status: done
category: "AI엔지니어링(AIEngineering)"
---

# 같은 후보의 재정렬 비교

2026-09-08에 `BAAI/bge-reranker-v2-m3`로 현재 후보 50개를 재정렬했다. 기존 84개 질문은 38개 통과에서 36개로 줄었고, 새 10개는 3개에서 4개로 늘었다. 전체 통과는 41/94에서 40/94, 필수 근거는 71/115에서 70/115가 됐다. 재정렬에 약 4.7초가 추가돼 기본 검색에는 적용하지 않는다.

실제 검색은 [[Ontology-Search-Selection]]의 절 선택 구성을 유지한다. 이번에 추가한 것은 오프라인 비교 코드와 평가 자료이며 `context_lookup`, CLI, MCP 설정은 바꾸지 않았다.

## 비교 조건

- 원문은 Git `4af3516d519b62d6840b04c79d1e25aba846d80d`, extractor 11 snapshot이다. Markdown 원문이나 정답을 수정하지 않았다.
- 기준 검색 코드는 SHA-256 `beaf00ae13a5121b2bb1b1f48fb316060819541f131da3e31525750b81cc5e8e`다.
- 요청 scope와 기존 어휘 필터를 먼저 적용하고, root 6개 제한 전에 유용한 non-root Section을 기존 점수 상위 50개까지 고른다. 정확한 metadata 질의는 모든 구성에서 기존 경로를 쓴다.
- 모델 입력은 질문, 문서 제목, heading 경로와 pinned 원문 절이다. 정답 경로나 평가 라벨은 모델에 전달하지 않는다. 공개 모델을 내려받은 뒤 질문과 원문은 로컬에서만 계산했다.
- 모델 revision은 `953dc6f6f85a1b2dbfca4c34a2796e7dde08d41e`, batch 8, pair 입력 최대 512 token이다. 원시 logit으로 순서만 정하며 정답 확률이나 지식 부재 기준으로 해석하지 않는다.
- 모델 순서를 양수 서열로 변환해 문서와 절 순위를 바꾼다. 기존 graph 탐색과 byte 예산, 어휘 다양성에 따른 추가 절 선택은 재사용한다. 모델 입력에서 잘린 원문도 반환 근거의 revision, 원문 anchor와 전체 절 hash는 유지한다.

후보 제한 자체의 효과를 분리하기 위해 원래 검색, 같은 후보의 어휘 순서, 같은 후보의 모델 순서를 비교했다. 같은 후보의 어휘 순서도 원래 검색과 완전히 같은 구성은 아니다. 문서 후보가 50개 절의 소유 문서로 제한되고 절 서열이 graph 관계 순서에도 영향을 준다.

## 관측 결과

| 구성 | 기존 질문 /84 | 새 질문 /10 | 기존 필수 근거 /99 | 새 필수 근거 /16 |
|---|---:|---:|---:|---:|
| 원래 검색 | 38 | 3 | 61 | 10 |
| 같은 후보, 어휘 순서 | 38 | 4 | 61 | 11 |
| 같은 후보, 모델 순서 | 36 | 4 | 58 | 12 |

기존 84개는 앞서 관측한 회귀 표본이다. 새 10개는 구현과 기존 평가를 보지 않은 별도 작업자가 원문과 평가 schema로 만든 합성 표본이다. 양성 8개는 각각 두 필수 그룹을 요구하며 tech 5개, biz 2개, econ 1개다. 음성은 2개다. 첫 검색 전에 `prepareCases`로 모두 검증했으며 파일 hash는 `a97596345ff226778660b8e6c45cac388daaa15bdcdb4d2549e911d63fe0f3e0`다.

모델 순서는 기존 성공 4개를 잃고 실패 2개를 개선했다. 새 표본에서는 기존 성공을 유지하며 1개를 개선했다. 같은 후보의 어휘 순서는 기존 성공 1개를 잃고 1개를 개선했으므로 총점이 같다고 결과가 같지는 않다. 음성은 모든 구성에서 기존 2/17, 새 0/2로 같았다. 재정렬만으로 무관한 질문을 거절하지 못했다.

어휘 대조군의 합계 42/94는 기준보다 1개 높지만 기존 성공 1개를 잃었다. 문서 후보 제한과 graph 관계의 서열 변경 중 어느 부분이 기여했는지도 분리하지 않았으므로, 이 대조군 역시 운영 변경으로 채택하지 않는다.

모델의 기존 회귀는 종료 시 요청 처리 순서, 긴 계산의 요청 지연, 클릭률 개선 검증, 여러 인스턴스의 캐시 보호 질문이다. 이전 절 선택의 `selection-holdout-06`과 TypeORM 정리 경계 질문은 개선됐다. 사례별 반환 heading, 잘림 여부, excerpt hash와 회귀 목록은 [비교 보고서](evaluation/rerank-report-2026-09-08.json)에 있다.

같은 후보의 어휘 순서와 비교하면 회귀 3개는 정답 문서는 남았지만 필요한 절이 빠졌고, 긴 계산 질문은 정답 문서가 최종 근거에서 사라졌다. TypeORM 개선은 같은 절의 전체 본문을 반환하면서, PMF 개선은 이미 선택된 문서의 두 번째 조건 절을 추가하면서 발생했다. 이는 최종 반환 기준의 진단이며 후보 회수의 증거로 대신하지 않는다.

기존 후보 50개의 전체 원문에는 필수 근거 68/99가 있었다. 원래 검색의 최종 반환은 61/99다. graph 탐색과 추가 절 선택이 후보 밖에서도 근거를 가져오므로 두 수치를 단순 차감해 packing 손실로 해석하지 않는다. 후보에 없는 근거는 이 모델의 순서 변경만으로 새로 발견할 수 없다.

## 지연과 한계

Apple M3 Pro, 메모리 18GB, Python 3.10.20, 로컬 MPS의 단일 실행이다. torch 2.14.0과 transformers 4.57.6을 사용했다.

| 측정 | 기존 표본 | 새 표본 |
|---|---:|---:|
| 실제로 모델을 실행한 질문 | 75 | 10 |
| query-section pair 수 | 3,709 | 500 |
| 재정렬 p50 / p95 | 4,663 / 5,084 ms | 4,630 / 4,726 ms |
| 512 token에서 잘린 pair | 446 | 56 |

기존 84개 중 정확한 metadata 7개와 빈 후보 2개는 모델을 실행하지 않았다. 후보가 정확히 50개인 기존 질문 73개의 p50/p95는 4,674/5,084 ms였다. 백분위는 측정치 N개를 오름차순 정렬한 뒤 0부터 세는 `floor((N - 1) * q)` 위치를 사용한다. 모델 로드는 기존 실행에서 약 1.25초였으며 재정렬 시간에 포함하지 않았다. 재정렬 시간은 모델용 실제 pair tokenization과 계산을 포함하지만, 별도로 수행한 원문 token 길이 진단, 후보 검색, graph와 응답 구성은 제외한다. 운영 MCP의 전체 지연이나 반복 부하 시험은 아니다.

긴 입력의 잘림, 후보 누락, 여러 조건을 함께 담는 절 선택과 고정 gold에 없는 대체 근거가 남은 제한이다. 이번 결과만으로 다른 모델, 후보 생성기 또는 입력 길이의 성능을 일반화하지 않는다. 실제 답변의 정확도나 사용자 작업 시간 절감도 측정하지 않았다.

## 재현과 검증

Vault 루트에서 실행한다. 기존 [Python 의존성 고정 파일](evaluation/algorithm-search/requirements.txt)을 재사용하고 모델과 생성물은 저장소 밖에 둔다.

Node 의존성과 활성 snapshot은 [[Ontology-Operations#설치와 명령]]에 따라 먼저 준비한다. 아래 명령은 실행 시점의 코드와 활성 snapshot으로 새 실험을 만든다. 이 기록과 직접 대조하려면 원문 revision, snapshot fingerprint와 코드 hash가 보고서와 일치해야 한다.

```bash
experiment_dir=/tmp/ontology-rerank-experiment
uv venv --python 3.10 "$experiment_dir/venv"
uv pip install --python "$experiment_dir/venv/bin/python" -r ontology/evaluation/algorithm-search/requirements.txt
"$experiment_dir/venv/bin/python" ontology/evaluation/rerank/download-model.py --output "$experiment_dir/model"
node ontology/evaluation/rerank/run.mjs prepare --data "$experiment_dir/known"
HF_HUB_OFFLINE=1 "$experiment_dir/venv/bin/python" ontology/evaluation/rerank/score.py \
  --input "$experiment_dir/known-input.json" --model "$experiment_dir/model" --output "$experiment_dir/scores.json"
```

`prepare`가 출력한 `frozen_sha256`과 scoring 직후 `shasum -a 256 "$experiment_dir/scores.json"`의 값을 보관한다. 평가 시 해당 값을 각각 `FROZEN_SHA`와 `SCORES_SHA`로 지정한다.

```bash
node ontology/evaluation/rerank/run.mjs evaluate --data "$experiment_dir/known" \
  --scores "$experiment_dir/scores.json" --model "$experiment_dir/model" \
  --expected-frozen-hash "$FROZEN_SHA" --expected-scores-hash "$SCORES_SHA" \
  --output "$experiment_dir/report.json"
"$experiment_dir/venv/bin/python" ontology/evaluation/rerank/score-check.py
```

새 표본만 재현하려면 `prepare --data "$experiment_dir/holdout" --cases rerank-holdout-cases-2026-09-08.json`으로 입력을 만들고 같은 scoring과 evaluate 명령의 경로를 바꾼다. 새 실험에서 이미 관측한 이 10개를 독립 표본으로 다시 세지 않는다.

평가기는 고정 입력과 점수, 코드, 정답 파일, snapshot, 모델의 정확한 6개 파일과 checksum을 대조한다. 반환 점수는 원래 후보 ID 전체와 일대일로 대응하고 유한해야 한다. 모델 파일은 2GiB보다 커서 Node에서는 스트림 방식으로 hash를 계산한다. 기준 조회 94개의 JSON 전체 일치와 3개 구성 총 282개 응답의 byte 예산을 검사했다.

별도 입력 검사에서 중복 query/candidate ID, 잘못된 후보와 51개 후보를 거부하고 빈 후보 배열을 허용했다. 실제 생성물의 변조 검사에서는 고정 파일 hash 불일치, 빈 모델 파일 manifest와 중복 후보 점수를 거부했다.

## 출처와 연결

- [BAAI, bge-reranker-v2-m3 model card](https://huggingface.co/BAAI/bge-reranker-v2-m3)
- [Sentence Transformers, Retrieve and Re-Rank](https://www.sbert.net/examples/sentence_transformer/applications/retrieve_rerank/README.html)
- [[Ontology-Search-Algorithms|BM25, 임베딩과 RRF 비교]]
- [[RAG-Retrieval-Engineering#품질을 분해하는 평가 모델|검색과 근거 구성의 분리]]
