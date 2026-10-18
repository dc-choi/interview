---
tags: [palantir, foundry, release-history]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["2024 앱 상태와 분석 의미의 변화"]
---

# 2024 앱 상태와 분석 의미의 변화

2024년 공식 release note의 역사적 변경 기록이다. 현재 지원과 기본값은 해당 제품의 최신 계약을 다시 확인한다.

## 새 동작과 기존 앱의 선택

Workshop은8-27 undefined object set을 combination에서 empty처럼 취급하고9-02 function-backed empty array를 empty object set으로 오해하던 동작을 개선했다. 신규 변수는 새 동작, 기존 변수는 upgrade 선택이다.12-16 multi-select 개선도 신규 기본/기존 opt-in이므로 같은 UI의 구 앱이 같은 의미로 작동한다고 가정하지 않는다.

8월 struct variable은 지원하지 않는 field를 생략하고 당시 nested struct/struct array를 지원하지 않았다. Widget/transform은 전체 struct 대신 field를 추출한다.9월 module-load compute+event recompute와 variable current value 개별save,11월 autosaved draft도 version publish와 분리한다.

Action Table의 실패 시 입력 보존, output object set 수정, function-column sort 대기와 error state 개선은 입력/출력/가시성 일관성을 다룬다.11월 Action Table scenario 미지원 경고는 scenario를 편집하는 듯 보이던 UI를 수정했다. Disable/hide button, editor shortcut과 URL routing은 actual authorization과 다르다.

## 시간, 단위와 정확성

2월/3월 Contour Visualization Timezone은 표시 기준이고 board timezone은 bucketing 기준이다. 신규 local-time default와 기존 analysis의 수동 선택도 구분한다. Quiver unit override는 label 변경, unit conversion은 값 변환이므로 축을 옮기는 같은 UI에서도 의미가 다르다.

Quiver exact unique count는 OSv1 미지원과10,000이상 성능 제한, variance/std는 sample/population을 구분한다. Pivot limit의 approximation warning 복원은 수치가 근사일 수 있음을 보여 준다. Max bucket/row cap은 전체 모집단/누락 여부와 함께 확인한다.

10월 derived series GA는 raw datapoint를 materialize하는 대신 logic을 저장하고 요청 때 계산한다. 자동 Ontology save와 selection filter, editor와 downstream reuse가 추가됐다.12월 time-series alert는 최초 full/후속 incremental이며 stream을 직접 읽지 않고10분마다 archive한 dataset을 읽어 최소10분 latency가 생긴다고 명시했다. 당시 real-time은 roadmap이므로 alert timing을 보장하지 않는다.

## View와 영속 상태

Slate5월 Pages는 page-local resource와 shared variable을 구분하고 tabbed-container 전체 load와 다르게 page별 로드한다.11월 OSDK function,6월 version별 JSON export는 code/schema/save와 배포 버전을 따로 추적해야 함을 보여 준다.

Notepad Lock data는3월 모든 widget source의 marking이 필요하고 restricted view/ACL 불명 source는 snapshot 불가로 바뀌었다. Static export와 기존 data 권한을 같게 보지 않는다. Template anchor/Markdown Function input-output/배치 generator/버전별 보고서도 출력 fidelity와 입력 시점/정렬을 확인한다.

Vega/loop/grid/annotation/audio/캘린더/Vertex template 등 새 widget의 시각화/selection과 Action으로 저장한 실제 업무 상태를 분리한다. Clear graph each run default를 끄면 기존 graph와 merge되어 과거 결과가 남을 수 있다. 새 component가 표시된다는 것만으로 실제 query/permission/전체 row export가 검증된 것은 아니다.

## 출처

- [Palantir, 2024 release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2024)
- [Palantir, 2024 release notes](https://www.palantir.com/docs/foundry/release-notes/2024)

## 관련 문서

- [[Palantir-Platform-Evolution-2024]]
