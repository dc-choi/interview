---
tags: [web, css, responsive-design, foldable, accessibility]
status: done
verified_at: 2026-10-06
category: "웹&네트워크(Web&Network)"
aliases: ["Foldable Web Layout", "폴더블 웹 레이아웃", "Device Posture"]
---

# 폴더블 웹 레이아웃

폴더블 대응은 화면 폭뿐 아니라 문서가 놓인 자세와 뷰포트의 논리적 분할을 함께 고려하는 반응형 설계다. **자세와 화면 구획은 서로 다른 정보**이므로 접힘 감지만으로 두 칸 레이아웃을 결정하지 않는다.

## 자세와 구획의 구분

| 정보 | 인터페이스 | 판단할 내용 |
|---|---|---|
| 문서에 적용되는 기기 자세 | CSS `device-posture`, JavaScript `navigator.devicePosture` | `continuous` 또는 `folded` |
| 가로와 세로 구획 수 | `horizontal-viewport-segments`, `vertical-viewport-segments` | 뷰포트가 각 방향으로 몇 구획인지 |
| 구획의 크기와 위치 | `env(viewport-segment-width 0 0)` 등의 CSS 환경 변수 | 콘텐츠를 배치할 영역과 경첩 사이 간격 |

`continuous`는 접히지 않는 기기뿐 아니라 펼친 폴더블, 브라우저가 경첩을 가로지르지 않는 창에도 해당한다. 하드웨어의 접힘 각도를 그대로 읽는 API가 아니며, 각도와 센서 정보를 자세로 변환하는 기준은 구현에 따라 다르다.

`navigator.devicePosture.type`은 현재 자세, `change` 이벤트는 자세 변경을 제공한다. JavaScript 인터페이스는 보안 컨텍스트에서 노출되며 사용 전에 존재 여부를 확인한다. 숨겨진 문서에는 자세 변경 이벤트가 전달되지 않으므로 이를 모든 물리적 접힘의 기록으로 사용하지 않는다.

## 실제 배치에 쓰는 값

- 좌우 두 구획은 `(horizontal-viewport-segments: 2) and (vertical-viewport-segments: 1)`로 구분한다. 위아래 두 구획은 두 조건의 값을 반대로 둔다.
- 환경 변수의 인덱스는 왼쪽부터 세는 x, 위쪽부터 세는 y 순서이며 0에서 시작한다. 좌우 분할의 왼쪽은 `0 0`, 오른쪽은 `1 0`이다.
- `width`, `height`, `top`, `right`, `bottom`, `left` 값을 조합해 각 구획과 사이 공간을 계산한다. 좌우 분할의 경첩 폭은 오른쪽 구획의 왼쪽 위치에서 왼쪽 구획의 오른쪽 위치를 뺀 값이다.
- 구획 환경 변수는 두 구획 이상일 때 정의된다. `env(viewport-segment-width 0 0, 100vw)`처럼 대체값을 둘 수 있지만 구획 수 확인을 대신하지 않는다.

예를 들어 위아래 두 구획이면 위에 영상, 아래에 설명을 놓을 수 있다. 경첩이 실제 뷰포트 공간을 차지하는 경우가 있으므로 단순한 `50%` 분할과 같은 결과라고 가정하지 않는다.

## 적용과 검증

기본 화면은 일반 반응형 레이아웃으로 제공하고, 해당 기능을 지원하는 환경에서 구획 배치를 추가한다. 버튼과 주요 콘텐츠를 경첩 위에 놓지 않으며 자세 하나만 강제하지 않는다. 접었다 펼칠 때도 콘텐츠와 조작 경로가 유지되는지 확인한다.

2026-10-06 확인 기준 Device Posture API는 W3C Candidate Recommendation Draft다. 명세의 존재와 개별 브라우저, OS, 기기의 지원은 별도로 확인한다. 특정 제품의 출시, 가격이나 시뮬레이터 기능은 이 문서의 근거 범위에 포함하지 않는다.

점검 대상은 일반 단일 화면, 펼친 상태, 좌우와 위아래 분할, 한쪽 창만 사용하는 상태, API 미지원 환경이다. 에뮬레이션 결과와 실제 하드웨어의 센서 및 경첩 동작도 구분한다.

## 출처

- [W3C, Device Posture API](https://www.w3.org/TR/device-posture/)
- [W3C, Media Queries Level 5](https://www.w3.org/TR/mediaqueries-5/#mf-horizontal-viewport-segments)
- [W3C, CSS Environment Variables Module Level 1](https://www.w3.org/TR/css-env-1/#viewport-segments)

## 관련 문서

- [[프론트엔드(Frontend)|프론트엔드]]
- [[Web-Service-Structure|웹 서비스의 구조]]
