---
tags: [ontology, retrieval, evaluation, bm25, embedding]
status: done
category: "AI엔지니어링(AIEngineering)"
---

# 검색 알고리즘 비교

현재 검색의 문서 누락, 필수 절 누락과 무관한 결과 반환을 줄이기 위해 후보 검색과 응답 구성을 분리해 비교한다. 실험 원문은 Git `4af3516d519b62d6840b04c79d1e25aba846d80d`, extractor 11 snapshot으로 고정한다. 실제 MCP 검색기로 채택한 결과와 오프라인 실험 결과를 구분한다.

2026-09-08 실험에서는 기본 검색기를 교체하지 않는다. BM25의 후보 회수는 개선됐지만 기존 성공 4건을 잃었고, 작은 E5 모델과 RRF도 최종 조건 충족에서 기존 구성을 넘지 못했다. 이 결과를 다른 임베딩 모델이나 재정렬 모델의 성능으로 일반화하지 않는다.

## 고정한 비교 조건

| 구성 | 후보 검색과 선택 |
|---|---|
| current | 기존 metadata와 본문 어휘 점수, 기존 응답 구성 |
| bm25 | Kiwi 0.22.0 내용 형태소, SQLite FTS5 BM25, title/heading/body 가중치 3/2/1 |
| dense | multilingual-e5-small, 정규화 벡터 exact 내적 검색 |
| hybrid | BM25와 dense 각각 상위 50개를 RRF 상수 60으로 결합 |
| hybrid_multi | hybrid의 기존 응답 구성을 보존한 뒤 남는 공간에 절을 최대 6개 추가 |

BM25, dense와 hybrid는 요청 범위 안에서 최대 50개 section 후보를 만든다. 색인 입력은 문서 제목, heading 경로와 원문 절이다. frontmatter root와 `출처`, `관련 문서` heading은 후보 색인에서 제외하며, 평가용 입력은 16,779개 절이다. BM25 개선에는 점수식뿐 아니라 한국어 토큰화 변경도 포함된다.

모델은 `intfloat/multilingual-e5-small`의 revision `614241f622f53c4eeff9890bdc4f31cfecc418b3`이다. `query: `와 `passage: ` prefix, 384차원 정규화, 최대 512 model token을 쓴다. 긴 절은 임베딩 입력에서 잘릴 수 있다. 공개 모델만 내려받고 원문과 질문은 로컬에서 처리한다.

정확한 metadata 질의는 모든 구성에서 기존 경로를 공통으로 사용한다. 임시 모듈에 후보 점수만 주입해 기존 문서 선택, graph 관계, 원문 receipt와 JSON byte 예산 처리를 재사용한다. current 재생 결과는 실제 `lookup` 결과와 JSON 전체 일치를 검사한다. production source와 MCP 등록은 이 실험으로 바꾸지 않는다.

## 2026-09-08 관측 결과

| 구성 | 기존 질문 통과 /58 | 새 질문 통과 /16 | 새 후보 근거 /24 | 새 최종 근거 /24 |
|---|---:|---:|---:|---:|
| current | 30 | 0 | 12 | 5 |
| bm25 | 29 | 1 | 17 | 6 |
| dense | 18 | 1 | 13 | 8 |
| hybrid | 27 | 1 | 16 | 6 |
| hybrid_multi | 27 | 1 | 16 | 6 |

새 양성 질문 12개는 모두 두 근거 그룹을 요구한다. 세 후보 검색 방식 모두 같은 API 소비자 전환 질문 한 개만 전체 조건을 충족했다. 새 음성 4개는 모든 구성에서 실패했다. 이는 합성 질문의 source/heading/body 조건 충족이며 실제 답변 정확도나 사용자 만족도가 아니다.

BM25는 기존 질문의 후보 근거를 45/59에서 51/59로 늘렸지만 최종 근거는 37/59로 같았다. 캐시 사례는 `Single-Flight` 절이 후보에 있어도 같은 문서의 제목 절이 최종 선택됐다. 종료 순서 사례는 관련된 다른 절을 가져왔지만 지정한 gold heading과 달라 실패했으므로 대체 정답을 검토할 여지도 있다. 추가 절을 남는 공간에 넣는 구성은 이번 표본에서 조건 충족을 더 늘리지 못했다.

후속 실험은 필요한 조건을 다루는 절의 재정렬과 byte 예산 안의 근거 선택에 초점을 둔다. 실제 질문의 대체 근거 검수와 무관한 결과 거절 기준도 필요하다. 정답 heading이나 사례별 정답을 검색 로직에 넣지 않는다.

로컬 MPS 단일 관측에서 기존 질문의 warm 후보 검색 p50/p95는 BM25 18.6/26.5 ms, dense 22.0/34.3 ms, 순차 hybrid 39.0/51.4 ms였다. 최초 문서 임베딩은 약 73.6초, 최종 실행의 BM25 색인 생성은 약 32.4초였다. 모델 로드, 서버 요청과 응답 구성까지 포함한 운영 지연이나 반복 성능 benchmark가 아니다.

단위 검사 5개와 실제 생성물 변조 검사 4개가 통과했다. 74개 질문에서 current와 실제 lookup JSON 전체 일치, 5개 구성의 byte 상한 370건과 scope 이탈 0건을 확인했다. 원문/모델/코드 hash, 첫 새 표본 관측, 사례별 성공과 회귀는 [비교 보고서](evaluation/algorithm-search-report-2026-09-08.json), 질문은 [새 표본](evaluation/algorithm-holdout-cases-2026-09-08.json)에 보존한다.

## 평가 해석

- 기존 52개와 앞서 관측한 6개, 총 58개는 회귀 평가다.
- 별도 AI 작업자가 원문과 평가 schema만 보고 만든 16개는 새 합성 표본이다. 검색 구현과 기존 결과를 읽지 않고 고정했으며, 양성 12개는 각각 두 근거 그룹을 요구하고 음성은 4개다. 사용자 실질문이나 사람이 검수한 relevance judgment로 대체하지 않는다.
- 후보의 `candidate_groups_hit_at_50`은 전체 원문 절 기준으로 필요한 그룹을 찾았는지 측정한다. 최종 `groups_hit`과 질문 통과는 byte 예산 안에 반환된 본문으로 판정한다.
- 합성 정답 heading과 문구의 조건 충족이며, 실제 답변 정확도와 사용자 시간 절감은 측정하지 않는다. 기존 라벨에 없는 대체 근거는 적절해도 점수에 반영되지 않을 수 있다.
- BM25/dense/RRF 점수를 정답 확률로 해석하지 않는다. 무관한 질문의 빈 결과 판정은 아직 별도 보정하지 않았다.
- `rank_ms`는 모델과 색인을 올린 뒤의 후보 검색 시간이다. hybrid는 순차 실행 합계다. 임시 모듈의 `replay_elapsed_ms`에는 기존 어휘 점수 계산도 들어가므로 최적화된 실제 hybrid 응답 시간으로 비교하지 않는다.

## 실행

Vault 루트에서 실행한다. 실제 검증 환경은 macOS arm64, Python 3.10이며 설치 패키지는 [requirements.txt](evaluation/algorithm-search/requirements.txt)에 고정했다. 모델과 생성 입력, 벡터는 저장소 밖에 둔다.

```bash
experiment_dir=/tmp/ontology-search-experiment
uv venv --python 3.10 "$experiment_dir/venv"
uv pip install --python "$experiment_dir/venv/bin/python" -r ontology/evaluation/algorithm-search/requirements.txt
"$experiment_dir/venv/bin/python" ontology/evaluation/algorithm-search/download-model.py --output "$experiment_dir/model"
node ontology/evaluation/algorithm-search/run.mjs prepare --data "$experiment_dir/data"
HF_HUB_OFFLINE=1 "$experiment_dir/venv/bin/python" ontology/evaluation/algorithm-search/rank.py --data "$experiment_dir/data" --model "$experiment_dir/model" --output "$experiment_dir/rankings.json"
node ontology/evaluation/algorithm-search/run.mjs evaluate --data "$experiment_dir/data" --rankings "$experiment_dir/rankings.json" --output "$experiment_dir/report.json"
"$experiment_dir/venv/bin/python" ontology/evaluation/algorithm-search/test_lexical.py
"$experiment_dir/venv/bin/python" ontology/evaluation/algorithm-search/check-integrity.py --data "$experiment_dir/data" --model "$experiment_dir/model" --rankings "$experiment_dir/rankings.json"
```

새 표본만 실행할 때는 `prepare`에 `--cases algorithm-holdout-cases-2026-09-08.json`을 전달하고 `rank`와 `evaluate`를 다시 실행한다. 원문과 모델 설정이 같으면 생성 벡터를 재사용한다. 파일을 바꾸어 재실행한 값은 독립 첫 관측과 구분한다.

`prepare`는 원문, 질문, 평가 코드와 질문별 정답을 고정한다. 모델 파일과 생성 벡터의 checksum도 대조한다. 무결성 검사는 실제 생성물의 복사본을 바꾸어 원문 변경, 질문 재표기, 모델 변경과 벡터 손상을 거부하는지 확인한다.

## 출처와 연결

- [multilingual-e5-small model card](https://huggingface.co/intfloat/multilingual-e5-small)
- [SQLite FTS5 BM25](https://www.sqlite.org/fts5.html#the_bm25_function)
- [Kiwi Python API](https://github.com/bab2min/kiwipiepy)
- [RRF](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/reciprocal-rank-fusion)
- [[Ontology-Retrieval-Quality|기존 조회 품질과 응답 구성 평가]]
- [[RAG-Retrieval-Engineering|검색과 context 구성의 평가 층]]
- [실행 파일 목차](evaluation/algorithm-search/algorithm-search.md)
