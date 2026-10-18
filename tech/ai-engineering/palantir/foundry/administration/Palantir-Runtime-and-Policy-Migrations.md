---
tags: [palantir, migration, runtime, retention]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry 런타임과 정책 이전"]
---

# 런타임과 정책 이전의 검증 단위

Migration은 새 기능의 availability, 기존 resource의 호환성과 강제 전환일을 따로 확인한다. 아래는 과거 공지에서 확인한 이전 계약이며 현재 지원 버전이나 마감일을 뜻하지 않는다.

## Runtime 변경은 resource 종류마다 다르게 적용된다

Python 3.6/3.7 폐기 당시 Code Repository는 자동 patch PR을 시도했지만 Code Workbook과 오래된 `foundry_ml` model은 수동 작업을 요구했다. 2024년 1월 제한 지원/allowlist와 4월 실패 예고도 서로 다른 단계였다. 3.8부터 upstream EOL을 따르는 정책을 안내했으므로 현재 runtime은 전용 version 표와 dependency 호환성을 다시 확인한다. 자동 PR 생성은 merge, 배포와 실제 실행 성공의 증거가 아니다.

Streaming Java 11→17 이전은 내부 JDK class의 reflective access를 막는 변경이었다. 직접 작성한 UDF뿐 아니라 외부 library의 Java 17 지원과 `versions.properties`를 확인하고 `IllegalAccessException` 처리까지 점검한다. Source가 compile된다고 런타임 reflection이 검증된 것은 아니다.

Functions on models의 GA는 deployment API name, 새 package import와 `useDeploymentApiNames` 전환을 포함했다. Repository branch에서 code generation과 호출부를 수정한 뒤 review하는 경로가 필요했다. Model live deployment의 type-safe `transform()`도 모델의 feature engineering, Ontology edit와 visualization 반환을 구분해야 한다.

Model training template은 training logic와 adapter를 한 repository에 두고 build-time dependency를 inference 환경에 연결한다. Container model은 별도의 container governance 활성화, image, adapter, model version과 deployment가 필요하다. GPU/media 지원이 있다는 것만으로 실행 환경이 준비되는 것은 아니다.

## Agent sunset의 범위를 정확히 읽는다

2023년 8월 direct connection/Rubix 이전 공지는 Palantir가 제공한 AWS host의 legacy agent 폐기를 대상으로 했다. 고객 자체 hardware에 agent를 설치하는 경로까지 모두 금지한 공지가 아니다. Direct connection은 sync마다 독립 job으로 scaling하고 endpoint를 job별로 제한하는 경계를 제공한다. Network allowlist와 credential을 source별로 재검증한다.

## Retention은 selector와 branch를 대조한다

Retention Policies 앱은 system, legacy YAML repository와 custom policy를 구분한다. System policy는 platform 관리라 UI에서 수정할 수 없고 legacy 이전은 새 policy 생성 후 원래 repository definition 정리까지 포함한다. Dataset selector와 transaction selector는 각각 대상 dataset과 그 안의 삭제할 version 범위를 좁힌다.

Dataset details의 current-branch 필터는 보이는 정책 범위를 바꾼다. Namespace 정책 목록만 보고 특정 branch에 어떤 transaction이 지워질지 단정하지 않는다. 2023년 7월 lineage-aware downstream deletion과 8월 Approval 연동은 roadmap으로 소개됐으므로 당시 announcement만으로 자동 승인 gate가 존재했다고 판단하지 않는다.

Resource Management export는 upstream을 따라 갱신되는 민감 dataset이다. Enrollment, source, summary/granular RID, date와 usage unit을 이용해 분석하되 dataset의 별도 권한을 설정한다. UI에서 보던 권한과 export dataset의 권한을 같다고 가정하지 않는다.

## GA와 UI 전환은 별도 설정을 남길 수 있다

Map/Vertex Timeline GA 당시 기존 beta 사용 module도 `Enable Timeline`을 다시 켜야 했다. Map의 time selection 폐기와 Vertex의 추가 기능 개발은 다른 범위였다. OSv2의 user-edit object/link migration도 GA 이후에 별도로 확대됐다. 기능이 GA라는 한 단어로 모든 resource의 전환 완료를 판단하지 않는다.

2023년 10월 Java 17 실제 rollout은 core Flink의 기존 access를 복구하되 사용자 UDF의 내부 JDK reflection은 예외로 남겼다. 같은 오류라도 사용자 UDF와 platform transform을 구분해 진단한다. 11월 Spark module pin은 repository 전체/특정 branch와 만료일을 지정하는 임시 완화로, 최대 90일을 안내했다. 이후에도 pin의 만료와 후속 upgrade를 관리한다. 12월 Spark 3.4 자동 upgrade 공지는 정해진 module 최소 version 이후 범위였으므로 모든 과거 module이 같은 날 변경됐다고 해석하지 않는다.

Ontology cleanup의 snooze는 queue 숨김, deprecate는 전환 신호, delete는 영구 제거다. Flag는 후보 탐지이며 삭제 승인 자체가 아니다. OSv2 edit가 있는 object type의 primary key 변경 제한과 Active object type의 모든 edit 삭제 방지는 cleanup과 별도 일관성 경계다.

2024년 2월 `foundry_ml` planned deprecation은 Python 3.9와 연계한 2025년 10월 31일 전환일, `palantir_models` 대체와 Upgrade Assistant 통지를 예고했다. Model adapter의 serialization/API/inference와 multi-I/O, external/container/media 지원은 단순 package rename 이상이다. 기존 모델마다 자동 예제 적용 가능 여부와 수동 이전을 구분한다.

2024년 1월 Checkpoints Admin→Data Governance Officer 자동 이전은 현재/미래 workflow 권한 확대를 포함했다. 기존 권한만 유지하려면 custom role로 옮기고 legacy role membership을 제거하는 대안을 안내했다. Role 이름의 변경만 보고 least privilege가 유지됐다고 판단하지 않는다.

2026년 9월 Spark 3.5.5→4.0.1은 adjudication으로 자동 적용하고 Foundry API layer가 일부 breaking change를 완화하는 rollout이었다. Custom dependency까지 호환성을 보장하지 않아 high-risk job은 temporary pin과 대표 build로 확인하도록 안내했다. 자동 enablement, vendor compatibility test와 실제 workload의 성능/오류 회귀는 다른 증거다.

## 출처

- [Palantir, July 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-07)
- [Palantir, August 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-08)
- [Palantir, September 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-09)
- [Palantir, October 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-10)
- [Palantir, November 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-11)
- [Palantir, December 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-12)
- [Palantir, January 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-01)
- [Palantir, February 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-02)
- [Palantir, September 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-09)

## 관련 문서

- [[Palantir-Compute-Profiles-and-Container-Governance|Container 실행 통제]]
- [[Palantir-Logs-and-Usage-Governance|민감 usage/log export]]
- [[Palantir-Analytics-Reuse-and-Migration|분석과 pipeline 이전]]
