---
tags: [web, frontend, bootstrap, css, migration]
status: done
verified_at: 2026-10-09
category: "웹&네트워크(Web&Network)"
aliases: ["Bootstrap 6 Migration", "Bootstrap 6 전환"]
---

# Bootstrap 6 전환의 호환성 경계

Bootstrap의 메이저 버전 전환은 패키지 교체와 함께 HTML 클래스, Sass 설정, JavaScript 진입점을 점검하는 작업이다. 아래 범위는 **2026-10-08 공개된 6.0.0-alpha.1**을 기준으로 한다. 정식 버전의 확정 계약으로 보지 않고 도입 시 대상 버전의 migration 문서를 다시 확인한다.

## 반응형 클래스와 CSS 토큰

| 경계 | v5 | v6 alpha의 변화 |
|---|---|---|
| 반응형 display | `d-md-none` | `md:d-none`처럼 breakpoint가 앞에 온다 |
| 반응형 grid | `col-lg-6` | `lg:col-6`으로 바뀐다 |
| Sass 구성 | `@import` 기반 설정 | `@use`와 `@forward`, token map을 사용한다 |
| 시각적 설정 | Sass와 CSS 변수 혼용 | CSS 변수 중심으로 구성해 런타임 조정 범위를 넓힌다 |

CSS 변수 중심이라는 말은 Sass가 사라진다는 뜻이 아니다. 변형과 유틸리티 생성에는 Sass가 남고, 색상과 간격 같은 시각적 값은 CSS 변수를 통해 조정한다. 기존 사용자 정의 Sass의 import 경로와 breakpoint helper도 별도로 대조한다.

## JavaScript 로딩과 브라우저 조건

v6 alpha의 플러그인은 ESM 전용이다. `window.bootstrap` 전역 객체와 UMD에 의존하는 호출은 모듈 import 방식으로 바꿔야 한다. CDN 스크립트에도 `type="module"`이 필요하다. 모듈 로딩을 바꿨다는 사실만으로 컴포넌트별 마크업과 API 전환이 끝나지는 않는다.

지원 하한은 Chrome/Edge 130, Firefox 132, Safari 18이다. 그보다 오래된 브라우저를 위한 fallback과 polyfill이 포함된다고 가정하지 않는다. 기존 고객의 브라우저 범위가 하한에 못 미치면 v5 유지도 비교한다.

## 전환 검증 제안

1. 현재 사용 중인 클래스, 사용자 정의 Sass와 전역 JavaScript 호출을 목록으로 만든다.
2. 반응형 클래스 변경 뒤 주요 화면 폭에서 표시와 숨김, 열 배치를 비교한다.
3. Dialog와 Accordion처럼 브라우저 기본 요소를 쓰는 컴포넌트는 마크업, 포커스와 키보드 동작을 확인한다.
4. 색상과 간격 토큰 변경 뒤 대비, 줄바꿈과 레이아웃을 실제 브라우저에서 확인한다.

이 절차는 전환 검토를 위한 제안이다. 여기서 애플리케이션을 실행하거나 호환성을 시험한 것은 아니다.

## 출처

- [Bootstrap 6 Alpha — Bootstrap Blog](https://blog.getbootstrap.com/2026/10/08/bootstrap-6-alpha/)
- [Bootstrap, Migration](https://getbootstrap.com/docs/6.0/guides/migration/)

## 관련 문서

- [[Responsive-Web-Layout|반응형 웹 레이아웃]]
- [[Design-System-Lint|디자인 시스템 lint]]
