---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Q&A에서 배우는 수집과 파이프라인 진단"]
---

# Q&A에서 배우는 수집과 파이프라인 진단

## 성공과 데이터 의미

2024~2026년 Q&A 사례를 진단 가설로 사용한다. Spark dynamic allocation은 executor 수를 조절하며 driver/executor memory까지 자동 최적화한다는 뜻이 아니다. Pandas DataFrame에 Spark write 경로를 쓰면 _jdf 오류가 날 수 있어 엔진별 write 메서드를 구분한다. Import 오류는 설치 여부, package 충돌, lock/환경 로그와 version 변경을 확인한다.

동시에 같은 dataset에 build하는 사례는 열린 transaction과 queue가 원인일 수 있다는 과거 설명이다. 현재 transaction/branch 계약을 확인 없이 모든 리소스에 단일 동시성 규칙으로 확대하지 않는다. Output 없는 transform schedule 대신 외부 응답을 output dataset에 기록하라는 답변은 부작용과 관측 가능한 결과를 연결하는 원칙이다.

## 형식, 순서와 증분 경계

- Parquet schema 적용 실패는 datatype 해석 문제일 수 있다. 원본 파일/명시 schema/특정 column을 대조해야 하며 column 제외는 원인 분리용이지 데이터 무손실 해결이 아니다.
- CSV jagged row drop과 ignore parse는 실패 행을 없앨 수 있다. Build 통과만으로 원본 row 보존을 보고하지 않는다.
- Timestamp microsecond 손실을 문자열로 우회하거나 binary CDC key를 varchar로 바꾸는 답변은 정렬/인코딩/길이 계약까지 검증해야 한다.
- SortByLastModified만 보여 준 파일 제한 답변은 개수 제한과 동률 순서까지 보장하지 않는다. 추가 limit와 tie-break를 확인한다.
- Collect Array 순서는 기본 비결정적이라는 사례가 있다. Window ordering과 후속 sort를 구분하고 실제 tie-break를 정한다.
- Time-bounded dedup는 늦은 행을 중복 여부와 무관하게 버릴 수 있다. 허용 지연을 데이터 손실 경계로 다룬다.

## 연결과 변경의 단위

여러 agent는 하나의 sync를 자동 분할 병렬화하는 것과 다르며 agent별 동시 sync capacity와 구분한다. Agent directory 이동/제거에는 process, restart job과 local proxy 설정이 엮인다. 오래된 서비스별 설치 명령을 무검증 실행하지 않는다.

REST get_https_connection을 일반 Databricks source에 호출해 single connection 오류가 난 사례는 source 타입과 client 계약의 불일치다. Connector의 batch 읽기 지원이 ServiceNow 쓰기나 임의 stored-procedure introspection을 의미하지 않는다. OneLake/Globus/array column 등은 해당 connector와 외부 transform 경로를 구분한다.

S3 export 전 버킷 전체 삭제를 권한/원자성 검증 없는 보편 해법으로 권장하지 않는다. Same-region S3라는 사실만으로 PrivateLink 설정과 인터넷 미노출이 증명된다는 2024년 단정도 현재 네트워크 계약으로 승격하지 않는다. 실제 ingest/export/agent 변경은 수행하지 않았다.

## 출처

- [Palantir questions-answers, questions-answers](https://www.palantir.com/docs/foundry/questions-answers)
- [Palantir questions-answers, automate](https://www.palantir.com/docs/foundry/questions-answers/automate)
- [Palantir questions-answers, builds](https://www.palantir.com/docs/foundry/questions-answers/builds)
- [Palantir questions-answers, carbon-community](https://www.palantir.com/docs/foundry/questions-answers/carbon-community)
- [Palantir questions-answers, code-repositories](https://www.palantir.com/docs/foundry/questions-answers/code-repositories)
- [Palantir questions-answers, code-repositories-community](https://www.palantir.com/docs/foundry/questions-answers/code-repositories-community)
- [Palantir questions-answers, code-workspaces](https://www.palantir.com/docs/foundry/questions-answers/code-workspaces)
- [Palantir questions-answers, code-workspaces-community](https://www.palantir.com/docs/foundry/questions-answers/code-workspaces-community)
- [Palantir questions-answers, contour](https://www.palantir.com/docs/foundry/questions-answers/contour)
- [Palantir questions-answers, contour-community](https://www.palantir.com/docs/foundry/questions-answers/contour-community)
- [Palantir questions-answers, data-connection](https://www.palantir.com/docs/foundry/questions-answers/data-connection)
- [Palantir questions-answers, foundry-metadata-community](https://www.palantir.com/docs/foundry/questions-answers/foundry-metadata-community)
- [Palantir questions-answers, functions](https://www.palantir.com/docs/foundry/questions-answers/functions)
- [Palantir questions-answers, functions-community](https://www.palantir.com/docs/foundry/questions-answers/functions-community)
- [Palantir questions-answers, linter](https://www.palantir.com/docs/foundry/questions-answers/linter)
- [Palantir questions-answers, media-sets](https://www.palantir.com/docs/foundry/questions-answers/media-sets)
- [Palantir questions-answers, media-sets-community](https://www.palantir.com/docs/foundry/questions-answers/media-sets-community)
- [Palantir questions-answers, modeling](https://palantir.com/docs/zh/foundry/questions-answers/modeling/)
- [Palantir questions-answers, notepad](https://www.palantir.com/docs/foundry/questions-answers/notepad)
- [Palantir questions-answers, notifications-community](https://www.palantir.com/docs/foundry/questions-answers/notifications-community)
- [Palantir questions-answers, object-views-community](https://www.palantir.com/docs/foundry/questions-answers/object-views-community)
- [Palantir questions-answers, ontology](https://www.palantir.com/docs/foundry/questions-answers/ontology)
- [Palantir questions-answers, ontology-sdk](https://www.palantir.com/docs/foundry/questions-answers/ontology-sdk)
- [Palantir questions-answers, pipeline-builder](https://www.palantir.com/docs/foundry/questions-answers/pipeline-builder)
- [Palantir questions-answers, pipeline-builder-community](https://www.palantir.com/docs/foundry/questions-answers/pipeline-builder-community)
- [Palantir questions-answers, projects-community](https://www.palantir.com/docs/foundry/questions-answers/projects-community)
- [Palantir questions-answers, quiver](https://www.palantir.com/docs/foundry/questions-answers/quiver)
- [Palantir questions-answers, quiver-community](https://www.palantir.com/docs/foundry/questions-answers/quiver-community)
- [Palantir questions-answers, slate](https://www.palantir.com/docs/foundry/questions-answers/slate)
- [Palantir questions-answers, streaming](https://www.palantir.com/docs/foundry/questions-answers/streaming)
- [Palantir questions-answers, vertex](https://www.palantir.com/docs/foundry/questions-answers/vertex)
- [Palantir questions-answers, webhooks](https://www.palantir.com/docs/foundry/questions-answers/webhooks)
- [Palantir questions-answers, workshop](https://www.palantir.com/docs/foundry/questions-answers/workshop)
- [Palantir questions-answers, workshop-community](https://www.palantir.com/docs/foundry/questions-answers/workshop-community)

## 관련 문서

- [[Palantir-Collaborative-Analysis]]
