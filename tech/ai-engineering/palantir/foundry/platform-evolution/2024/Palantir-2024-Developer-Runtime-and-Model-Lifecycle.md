---
tags: [palantir, foundry, release-history]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["2024 개발 runtime과 모델 수명"]
---

# 2024 개발 runtime과 모델 수명

2024년 공식 release note의 역사적 변경 기록이다. 현재 지원과 기본값은 해당 제품의 최신 계약을 다시 확인한다.

## Version과 환경을 고정하는 단위

5월 Spark3.4.1→3.5.1 자동 adjudication,6월 Hawk/Rattler 기반 환경과 Python3.11 지원,9월 Python3.8 종료 계획이 나왔다. 성능 개선은 vendor/상류 테스트 주장으로 보존하고 migration에서 실제 workload의 값/타입/성능을 다시 확인한다. 원문의 minor version 무변경 표현만으로 업그레이드 무위험을 보장하지 않는다.

Python3.8 note title은2025-01-31, 상세 제목은04-01을 지칭한다. 본문은1월31일 일반 support 종료(일부 allowlist),4월1일 전면 미지원/실패 시작을 구분한다. Code Repository automatic patch PR은 시도이며 Workbook/구 foundry_ml 등은 수동 대응이다. 당시 Python3.11이 latest였다는 설명을 현재 지원 상한으로 쓰지 않는다.

4월 dataset alias branch pin,6월/11월 repo wizard와 Code Workspace 환경은 code branch와 input data branch를 분리할 필요를 보여 준다.9월말 이후 새 Workspace의 단일 repo 중심 permission UX라도 filesystem에 두 resource가 존재한다는 설명을 유지한다.

## OSDK 계약의 변화

5월 TypeScript1.1은 page→fetchPage/fetchPageWithErrors, __identity→$identity, all→asyncIter, bulkActions→batchActions, searchAround→pivotTo를 예고했다. FetchPage의 throw/Result 설명과 일부 example code가 맞지 않으므로 원문 코드를 검증 없이 복사하지 않는다. Version1.2는 syntax bridge,2.0은10월 GA와 신규 generator default, legacy 최소1년 support라는 당시 계획이다.

Java는7월 beta/10월 GA로 진행했고 Maven group ID와 confidential client 설정이 필요하다. Python OSDK primary_key_/api_name_은 method로 바뀌었다. SDK generator version, 생성 artifact/dependency update, OAuth allowed operation/resource와 실제 end-user 권한은 각각 확인한다.

2월 ActionResponse/returnEdits와 Python batch_action_config ALL은 변경 목록 반환을 개선했다. 반환됐다는 사실이 외부 시스템의 side effect commit까지 보증하지 않는다.11월 query Function import pin은 functions-typescript template0.731.0 이상을 요구했다.

## Model과 backend

3월 adapter upgrade는 model weights 재훈련/재발행과 분리됐다.4월 Jupyter model publish,7월 notebook transform model output,9월 direct deployment가 확장됐다. Model publish는 성공한 artifact/version을 뜻하며 생산 check/승인/유효성은 별도다.6월 새 objective는 release check를 기본 요구하지만 기존 objective는 계속 release 가능하다고 적는다.

9월 deployment는 branch 새 publish를 따라 upgrade하고 Compute Module replica0까지 scale할 수 있다. Arrow cast-or-throw는 inference type 경계이며 정확한 예측을 보장하지 않는다. 당시 on-prem/external/SparkML 제외와 palantir_models 최신 publish 조건을 유지한다.1분 startup은 내부 테스트 결과다.

6월 deployed Python Function과12월 serverless beta는 다르다. 당시 deployed는 external source/long-lived caching을 지원하고 한 version만 실행, serverless는 호출별 환경/여러 version/실행 시 과금을 설명했다. 이 제약을 현재 backend 전체에 무조건 적용하지 않는다.11월 Compute Modules beta의 autoscale/no-downtime 주장도 실제 rollout/health 검증과 구분한다. 실행 테스트는 하지 않았다.

## 출처

- [Palantir, 2024 release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2024)
- [Palantir, 2024 release notes](https://www.palantir.com/docs/foundry/release-notes/2024)

## 관련 문서

- [[Palantir-Platform-Evolution-2024]]
