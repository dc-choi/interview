---
tags: [palantir, release-history]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 애플리케이션 표시와 입력 상태

2026년1월 릴리스 당시 변경의 설계 함의다. 현재 지원/배포 조건은 기능별 문서와 실제 환경에서 다시 확인한다.

## 보이는 값과 실제 값

Workshop array preview는 empty string을 따옴표로 표시하고 static boolean array 생성도 지원하도록 수정됐다. 빈 값/없는 값/false를 화면에서 구분하는 기능이므로 데이터 schema의 동일시 근거로 쓰지 않는다. Combined object-type table의 variable-backed visibility와 derived-property preview scroll도 표시된 열/값을 확인하는 데 필요하다.

Object list media layering/opacity,조건부 숨김 section의 padding 제거,tooltip newline과hover 중 filter pill 크기 고정은 화면 결함 수정이다. User display에서 link/popular-file 노출이 사라져도 사용자명/email/profile 정보는 남을 수 있다는 점을 공유 화면 설계에서 고려한다.

## 입력과 event

Numeric input은 min/max,step과 최대10자리 decimal precision을 구성하고 bound 밖 값을 가장 가까운 허용 값으로 clamp한다. Validation error를 내는 방식과 다르므로 사용자가 의도한 원래 값을 놓치지 않는지 확인한다.

String dropdown은 select/deselect/reselect event를 구분한다. YouTube iframe URL 변환은 embed 형식을 맞추는 편의이며 외부 host 정책이나 권한 문제를 해결하지 않는다. Derived-column Excel sheet name의 일본어 보존도 export 정확성에 포함한다.

Slate query source filter는 search와 함께 적용하고 parameter field 위에서 scroll이 막히던 문제를 수정했다. Variables panel은 tabular cell edit/resize/context menu와 단순CSV upload를 지원한다. 이 편집 값을 외부 원천에 자동 영속화한다고 가정하지 않는다.

## 탐색 자원의 구조

Compass의 pinned Files는 이전 Project Catalog를 대체하며 Portfolio Catalog는 포함 project의 pinned 자원을 집계한다. Pin은 중요 자원 탐색을 돕는 표시이며 access grant가 아니다. 임시 UI 상태와 저장된 resource,export된 파일의 경계를 각각 확인한다.

## 출처

- [Palantir Foundry, Release notes 2026](https://www.palantir.com/docs/foundry/announcements/release-notes/2026/)

## 관련 문서

- [[Palantir-2026-January-Platform-Evolution]]
