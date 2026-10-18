---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["R transform의 spec과 환경 계약"]
---

# R transform의 spec과 환경 계약

R transform은 single node에서 실행하며 data read/write에 Spark를 사용하지 않는다. Palantir R SDK로 structured/unstructured dataset을 처리하고 Code Workspace RStudio Workbench에서 publish한다. Spark 설정을 R runtime의 분산 실행 계약으로 적용하지 않는다.

## Spec와 resource binding

`.transforms`의 YAML은 input/output alias와 dataset RID, runtime type rscript, identifier와 filePath를 정의한다. Identifier의 R.4.1.x는 minor release 계열이며 filePath는 repository root 기준이다. Runtime에는 repository project 전체가 제공된다.

Output dataset은 checks 때 자동 생성되지 않아 먼저 만들어야 한다. Alias로 datasets.read_table/write_table을 호출하거나 생성 file을 datasets.upload_files로 output에 올린다. R memory에 읽는 table 크기와 local temporary file을 고려하며 예시의 단일 plot upload를 대규모 분산 처리로 해석하지 않는다.

## 패키지 재현

기본 Artifacts repository는 Posit Package Manager/Bioconductor를 mirror하고 CRAN 등 R library를 사용할 수 있다. renv를 권장하며 renv.lock이 있으면 transform 시작이나 .Rprofile에서 restore한다. Lock file을 commit하는 것과 실제 build에서 그 lock을 restore하는 것은 별도다.

본문의 R.4.1.x와 package 이름은 예시이며 최신 지원 R version이나 모든 package의 공급을 보장하지 않는다. SDK 링크의 전체 외부 repository나 R runtime을 이 prefix에서 직접 검증한 것은 아니다.

## 출처

- [Palantir transforms-r, transforms-r](https://www.palantir.com/docs/foundry/transforms-r)
- [Palantir transforms-r, getting-started](https://www.palantir.com/docs/foundry/transforms-r/getting-started)
- [Palantir transforms-r, overview](https://www.palantir.com/docs/foundry/transforms-r/overview)

## 관련 문서

- [[Palantir-Code-Transforms]]
