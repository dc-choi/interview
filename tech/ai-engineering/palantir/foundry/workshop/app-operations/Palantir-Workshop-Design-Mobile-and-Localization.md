---
tags: [palantir, foundry, workshop]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Workshop design, mobile과 localization"]
---

# Workshop design, mobile과 localization

Workshop은 Object layer를 읽고 Actions/Functions/derived property를 조합하는 application builder다. Inbox/map/metric template는 시작점이며 Design Hub의 notional example은 duplication 후 customization을 권한다. Shared example 원본을 바꾸면 update로 덮일 수 있다.

## Design과 reuse

중요한 navigation/action, filter/content/detail의 hierarchy를 드러내고 과밀 화면을 줄인다. 원문의 primary action≤5, component≤10, whitespace30~40%는 heuristic이며 모든 제품의 강제 UI 규칙이 아니다. Header는 지속 navigation, page/section은 내용, modal은 집중 입력, drawer는 보조 context에 사용하되 background reference가 필요한 form에는 modal 방해를 고려한다.

Copy-paste same input은 shared state를, duplicate input은 복제 state를 만든다. 자주 재사용하는 widget logic은 Embedded Module로 중앙 관리한다. Font custom name은 viewer device에 설치돼 있어야 하고 font upload/storage는 미지원이라 fallback으로 사용자별 표시가 달라질 수 있다.

Saved color는 referenced layout/widget에 변경이 전파되지만 intent color는 Used Colors 목록과 별개다. Value formatting의 fraction digits/conditional color는 underlying number를 바꾸지 않는다. Translation은 지원 static strings를 browser locale별로 표시하며 AIP 결과도 검토한다. New/modified string은 To translate로 분리되고 Marked complete는 builder review 상태이지 정확성 보장이다.

## Mobile

Mobile은 browser web app이며 network access/SSO/MFA/account가 필요하다. MDM browser/VPN/ingress 정책은 enrollment 조건에 맞게 확인한다. Device preview는 actual device의 browser rendering/authentication을 대체하지 않는다. Source의 limited-access 안내와 실제 enablement를 구분한다.

Touch-friendly large target, vertical Flow, focused drawer/page와≤4top-level navigation을 권한다. Mobile launcher는 /workspace/m이며 history/back-forward를 지원한다. Chart/Object Table/현행 Map은 mobile disable이고 legacy Map compatibility는 별도다. Embedded child도 mobile이어야 한다.

QR/Barcode는 camera permission 후 string 또는 multi string array를 출력한다. Detection을 곧바로 write로 보지 않고 Action validation을 적용한다. Current Location은 lat,long string,거부하면 unset이다. 해당 page를 떠나면 update가 멈추지만 drawer overlay는 멈추지 않는다. Hide preview는 reverse geocode request를 막아도 위치 permission/update 자체는 남는다. 실제 카메라/위치/로그인은 실행하지 않았다.

## 출처

- [Palantir Workshop, workshop](https://www.palantir.com/docs/foundry/workshop)
- [Palantir Workshop, application-design-best-practices](https://www.palantir.com/docs/foundry/workshop/application-design-best-practices)
- [Palantir Workshop, application-design-components](https://www.palantir.com/docs/foundry/workshop/application-design-components)
- [Palantir Workshop, application-design-faqs](https://www.palantir.com/docs/foundry/workshop/application-design-faqs)
- [Palantir Workshop, concepts-layouts](https://www.palantir.com/docs/foundry/workshop/concepts-layouts)
- [Palantir Workshop, concepts-widgets](https://www.palantir.com/docs/foundry/workshop/concepts-widgets)
- [Palantir Workshop, example-applications](https://www.palantir.com/docs/foundry/workshop/example-applications)
- [Palantir Workshop, getting-started](https://www.palantir.com/docs/foundry/workshop/getting-started)
- [Palantir Workshop, mobile-access](https://www.palantir.com/docs/foundry/workshop/mobile-access)
- [Palantir Workshop, mobile-app-launcher](https://www.palantir.com/docs/foundry/workshop/mobile-app-launcher)
- [Palantir Workshop, mobile-design](https://www.palantir.com/docs/foundry/workshop/mobile-design)
- [Palantir Workshop, mobile-getting-started](https://www.palantir.com/docs/foundry/workshop/mobile-getting-started)
- [Palantir Workshop, mobile-overview](https://www.palantir.com/docs/foundry/workshop/mobile-overview)
- [Palantir Workshop, overview](https://www.palantir.com/docs/foundry/workshop/overview)
- [Palantir Workshop, translations](https://www.palantir.com/docs/foundry/workshop/translations)
- [Palantir Workshop, used-colors](https://www.palantir.com/docs/foundry/workshop/used-colors)
- [Palantir Workshop, widgets-current-location](https://www.palantir.com/docs/foundry/workshop/widgets-current-location)
- [Palantir Workshop, widgets-mobile-navbar](https://www.palantir.com/docs/foundry/workshop/widgets-mobile-navbar)
- [Palantir Workshop, widgets-qr-reader](https://www.palantir.com/docs/foundry/workshop/widgets-qr-reader)

## 관련 문서

- [[Palantir-Workshop]]
