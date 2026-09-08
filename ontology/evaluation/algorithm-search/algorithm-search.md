---
tags: [ontology, retrieval, evaluation]
status: index
category: "AI엔지니어링(AIEngineering)"
---

# 검색 알고리즘 비교 실행

Git 원문을 고정해 현재 검색, 한국어 BM25, 다국어 임베딩, RRF와 추가 절 구성을 비교한다. 실행 결과는 실험이며 MCP의 검색 코드를 바꾸지 않는다.

- [run.mjs](run.mjs): 원문과 질문 내보내기, 기존 응답 구성으로 후보 재생, 조건 평가
- [rank.py](rank.py): 로컬 임베딩, BM25 후보와 RRF 생성
- [lexical.py](lexical.py): Kiwi 형태소 분석과 SQLite FTS5 BM25
- [download-model.py](download-model.py): 고정 revision의 공개 모델 다운로드
- [requirements.txt](requirements.txt): 실제 사용한 Python 패키지 버전
- [test_lexical.py](test_lexical.py): 순위, 한국어, 범위와 빈 결과 검사
- [check-integrity.py](check-integrity.py): 실제 생성물 복사본으로 원문, 질문, 모델과 벡터 변경 거부 확인

실험 조건과 결과는 [[Ontology-Search-Algorithms]]에서 관리한다.
