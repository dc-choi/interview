---
tags: [palantir, foundry, release-history, "2026"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2026 상반기 pipeline 실행의 기본값과 실패 조건

2026년 2~6월 공식 출시 기록을 10월 16일 스냅샷에서 대조했다. 아래 지원/제약은 발표 당시 범위이며 현재 정본, 설치 버전과 enrollment 설정을 별도로 확인한다.

## Incremental와 replay의 명시적 통제

- 3월 Require incremental execution 기본은 No value다. True는 incremental input/output이 하나 이상 있어야 설정하며, 실행 불가하면 job group과 관계없이 모든 incremental output을 실패시킨다. state break가 필요한 변경에서만 사용자 acknowledgement 후 snapshot이 가능했다.
- 4월 media incremental input은 첫 build 전체, 다음 build new/changed를 처리한다. 당시 incremental dataset과 media input 혼합 및 media output은 미지원이었다. VS Code media preview는 모든 input과 put_media_item output만 지원하고 incremental preview는 별도로 미지원이었다.
- 5월 replay advanced setting은 기본 접힘/선택 안 됨으로 바뀌고 전체 stateful transform reset, subset 재처리와 downstream 영향을 확인하게 했다. state break는 Errors에 표시하고 수정 전 deploy를 막는다.
- 6월 streaming pipeline은 새 pipeline과 기존 pipeline 모두 deploy 전에 Data consistency guarantee가 필수였다. Stream behavior의 picker와 deploy preview를 확인하며 At least once 같은 선택의 실제 중복 의미를 별도 설계한다.
- 3월 stream job Max Duration 범위는 1분~7일, non-main 기본은 1일이었다.

## Compute/preview의 비용과 안정성

4월 Managed profile은 최근 **5개 build** 사용량으로 downscale만 한다. 최초 선택 profile보다 올리지 않으며 갑작스러운 데이터/workload 증가 시 build가 실패할 수 있다. native acceleration build는 당시 미지원이었다.

3월 preview confirmation은 enrollment 기본 설정이지만 **사용자가 override할 수 있다**. Enforce라는 공지 제목을 강제 보안 정책으로 읽지 않는다. sampling 오류 badge, Flink 누락 설정의 구체적 deploy 오류는 진단 표시이며 correctness를 자동 보장하지 않는다.

5월 Faster checkpoint는 shared upstream을 한 번 계산하고 기본 short-term disk 또는 output dataset(latest transaction, 첫 deploy 때 생성)을 선택한다. 6월 Faster는 25개 이상의 GeoExpression과 PDF/image/audio media를 확대했다. geometry logical type은 dataset/downstream과 Ontology geoshape에 보존되며 Geo Preview는 해당 타입의 cell을 선택한다. media upload는 새 media set과 Transactionless/Transactional write mode를 확인한다.

5월 parameterized Python schedule beta는 standard mode의 직접 값과 parallelized mode의 독립 parameter 구성을 나눈다. Action의 schedule rule은 parameter를 넘겨 build를 시작한다. Action 완료를 모든 downstream build 완료로 추정하지 않는다.

3월 LLM notional table은 다른 column을 prompt에 참조하고 최대 10행 preview 후 전체 생성, column lock으로 재생성을 제어했다. 생성 데이터는 실제 관측 데이터와 구분한다.

## 출처

- [2026 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes)
- [June 4, 2026, Pipeline Builder: 25+ GeoExpressions added to Faster pipelines — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#9e5738ea-5817-41f4-b2e2-411dcb4e6fdc)
- [March 5, 2026, Generate notional data with LLMs in Pipeline Builder — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#4a96f672-13e7-4eb5-987f-670ec3cef9d8)
- [March 31, 2026, Comment on nodes in proposal in Pipeline Builder — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#a6088407-c78b-4155-9d4b-a7bb5d4b7aea)
- [June 9, 2026, Pipeline Builder: Media sets now supported in Faster pipelines — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#5124fd1a-4e1c-4746-92e1-124e558867a8)

## 관련 문서

- [[Palantir-2026-H1-Platform-Evolution]]
