---
tags: [web, frontend, swiper, accessibility]
status: done
verified_at: 2026-10-07
category: "웹&네트워크(Web&Network)"
aliases: ["Swiper 이미지 슬라이드", "Swiper Carousel"]
---

# Swiper 이미지 슬라이드의 구성과 접근성

이미지 슬라이드는 여러 이미지를 같은 화면 영역에서 순서대로 보여 주는 UI다. Swiper는 슬라이드 이동을 제공하지만, 자산 로딩과 크기 지정, 사용자가 움직임을 제어하는 방식까지 함께 구성해야 한다.

## HTML, CSS와 초기화를 함께 맞춘다

- 기본 구조는 `.swiper` 안의 `.swiper-wrapper`, 그 안의 `.swiper-slide`다. 페이지 표시와 이전/다음 버튼은 별도 요소로 둔다.
- JavaScript뿐 아니라 Swiper CSS도 읽어야 한다. npm의 core 구성을 쓰면 Navigation과 Pagination 같은 모듈을 가져와 등록하고 해당 모듈 CSS도 포함한다. bundle 구성은 전체 모듈과 스타일을 포함하는 선택지다.
- 컨테이너에는 화면에 맞는 크기를 지정한다. 이미지 파일의 크기와 슬라이드 컨테이너 크기는 별도 확인 대상이다.
- `pagination.el`, `navigation.prevEl`, `navigation.nextEl`은 실제 요소와 연결한다. 페이지 표시를 눌러 이동하려면 `pagination.clickable`을 설정한다.

CDN과 패키지 파일을 섞는다면 실제로 받은 JavaScript와 CSS의 버전을 먼저 확인한다. 배포할 때 같은 릴리스의 자산을 고정하는 것은 재현성을 위한 구성 원칙이다. 화살표가 보이지 않는 문제를 CSS 값 하나로 단정하지 않고 자산 로딩, 모듈, 선택자와 실제 DOM을 순서대로 확인한다.

## 자동 재생 옵션은 서로 다른 동작이다

2026-10-07 공식 API 기준이다.

| 설정 | 의미 |
|---|---|
| `autoplay.delay` | 슬라이드 전환 사이 대기 시간, 밀리초 단위 |
| `disableOnInteraction: true` | 스와이프 같은 사용자 상호작용 뒤 자동 재생을 중단하는 기본값 |
| `disableOnInteraction: false` | 상호작용 뒤 자동 재생을 다시 시작 |
| `pauseOnMouseEnter: true` | 마우스 포인터가 컨테이너에 들어오면 일시 정지 |

`false`를 상호작용 시 중단한다는 뜻으로 읽지 않는다. `pause()`와 `resume()`은 일시 정지와 재개이고, `stop()`과 `start()`는 자동 재생 중단과 시작이다. 제품의 정지 버튼과 포커스 정책은 이 동작 구분에 맞춰 연결한다.

## 접근성은 자동 재생 옵션만으로 끝나지 않는다

WAI-ARIA APG의 캐러셀 패턴은 자동 회전 UI에 다음 제어를 요구한다.

- 이전/다음 버튼과 사용자가 찾을 수 있는 정지/재시작 버튼을 둔다.
- 키보드 포커스가 캐러셀 안에 들어오면 회전을 멈추고, 사용자가 명시적으로 요청하기 전에는 다시 시작하지 않는다.
- 마우스가 캐러셀 위에 머무는 동안 회전을 멈춘다.
- 캐러셀과 조작 요소에 접근 가능한 이름을 제공하고 키보드로 조작할 수 있게 한다.

따라서 스와이프 뒤 재시작하는 옵션과 키보드 포커스 뒤 명시적으로 재시작하는 정책을 구분해야 한다. Swiper 설정을 넣었다는 사실만으로 위 조건을 충족했다고 판단하지 않는다.

## 화면에서 확인할 것

좁은 화면의 크기, 이전/다음과 페이지 표시의 이동, 스와이프 뒤 자동 재생, 포커스 진입과 정지 버튼 동작을 각각 확인한다. 이 문서는 구성과 검토 기준이며 특정 페이지에서 실행한 결과는 아니다.

## 출처

- [Swiper, Getting Started](https://swiperjs.com/get-started)
- [Swiper, API](https://swiperjs.com/swiper-api)
- [W3C WAI-ARIA APG, Carousel Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/)

## 관련 문서

- [[Agent-Friendly-Websites|의미 있는 HTML과 접근성 정보]]
- [[Web-Service-Structure|HTML, CSS와 JavaScript의 역할]]
