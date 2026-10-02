---
tags: [expo, eas, workflows]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Workflow trigger와 실행 조건"]
---

# Workflow trigger와 실행 조건

## GitHub event

| Trigger | 선택 조건 |
| --- | --- |
| push | branches/tags glob, paths. 둘 다 없으면 branch 전체, tag 없음이다. 한쪽만 지정하면 다른 쪽은 비어 있다. |
| pull_request | branches는 PR의 대상(base) branch다. 기본 types는 opened/reopened/synchronize다. Fork PR은 실행하지 않는다. |
| pull_request_labeled | labels에 맞는 label이 붙을 때 실행한다. 기본 빈 목록은 실행하지 않는다. |
| pull_request_comment | 열린 unmerged PR의 created/edited/deleted, 기본 created. Fork 제외, branches/paths filter는 없다. |
| ref_delete | 삭제한 branch/tag를 선택한다. workflow는 삭제된 ref가 아닌 default branch HEAD에서 읽는다. |

PR types에는 edited/base_ref_changed/ready_for_review/labeled도 있다. edited는 제목/본문/base 변경을 포함하고 base_ref_changed는 base 변경만 다룬다. 제외 glob은 `'!main'`처럼 YAML 문자열로 인용하고 하나 이상의 포함 pattern과 함께 사용한다.

Push/PR은 `[eas skip]`, `[skip eas]`, `[no eas]` commit marker로 건너뛸 수 있다. Trigger의 if는 실행 생성 여부를 결정하고 false면 run 자체가 생기지 않는다. 단일 표현식은 최대 250자이며 retry에서는 이 trigger 검사를 다시 적용하지 않는다.

## 예약과 수동 입력

schedule.cron은 GMT 기준이며 default branch에서만 실행한다. 부하 시 지연, 드물게 누락/중복이 가능하므로 side effect는 멱등성을 고려한다. 한국 시간 09:00은 GMT 00:00에 해당한다.

workflow_dispatch.inputs는 string/boolean/number/choice/environment를 받는다. choice에는 options가 필요하고 required 기본 false, default는 타입이 맞아야 한다. CLI `-F name=value`, JSON stdin 또는 대화형 질문으로 값을 공급한다. 수동 실행에서는 GitHub branch 정보가 비어 있을 수 있으므로 필요한 대상은 입력으로 정한다.

## App Store Connect

Dashboard에서 연결을 준비한 뒤 app_version/build_upload/external_beta/beta_feedback 중 최소 하나를 지정한다. 상태 이름은 소문자이며 대소문자를 구분한다. build_upload는 awaiting_upload/processing/failed/complete, feedback type은 crash/screenshot이다.

app_version은 prepare_for_submission부터 waiting_for_review/in_review, 승인/거절과 ready_for_distribution 등의 상태를 필터한다. external_beta는 processing, missing_export_compliance, beta review와 승인/거절, in_beta_testing/expired 등을 구분한다. domain의 filter를 생략하면 그 domain의 지원 상태 전체를 받는다.

Upload complete는 Apple processing 완료와 다르다. 연결된 build가 있어야 app_store_connect.build_upload.build.id를 읽을 수 있다. 외부 테스트 제출은 필요한 test information과 processing 상태를 별도로 확인한다.

## 실행 이름

name은 workflow 이름, run_name은 개별 실행 제목이다. run_name은 시작 전에 평가하므로 needs/steps/env를 사용할 수 없다. github/app_store_connect/inputs/workflow/app/account를 사용하고 success/failure/hashFiles는 사용할 수 없다. 255자를 넘는 결과는 줄여 표시한다.

## 출처

- [Expo Documentation, Syntax for EAS Workflows](https://docs.expo.dev/eas/workflows/syntax)

## 관련 문서

- [[Expo-EAS-Workflow-Basics]]

- [[Expo]]
