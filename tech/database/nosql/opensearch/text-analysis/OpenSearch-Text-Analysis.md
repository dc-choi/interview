---
tags: [database, search, opensearch, mapping, analyzer]
status: index
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Text Analysis Index", "OpenSearch 매핑과 텍스트 분석"]
---

# OpenSearch 매핑과 텍스트 분석

필드 타입과 저장 구조를 고정하는 매핑에서 시작해 raw text를 역색인 term으로 바꾸는 analyzer 파이프라인, 한국어 형태소 분석과 사전 운영까지 묶는다. 검색 품질은 쿼리보다 이 계층에서 먼저 결정된다.

- [[OpenSearch-Mapping-Text-Analysis|매핑과 저장 구조]]: dynamic mapping을 운영 스키마로 착각하지 않기, mapping explosion, 필드 타입 선택과 inverted index, `doc_values`, `_source` 저장 구조 세 가지
- [[OpenSearch-Mapping-Text-Analysis-Analyzer|텍스트 분석]]: character filter, tokenizer, token filter 파이프라인, index analyzer와 search analyzer 구분, keyword용 normalizer와 CJK analyzer 선택
- [[OpenSearch-Korean-Text-Analysis|한국어 텍스트 분석과 사전 운영]]: Nori의 역할과 경계, 사용자 사전, 동의어, 불용어의 목적 구분, Analyze와 Term Vectors API 검증, 사전 변경과 재색인, 품질 개선 루프

## 함께 볼 문서

- [[OpenSearch|OpenSearch 학습 지도]]
