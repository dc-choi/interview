---
tags: [ai, agent, integration, apple, siri, app-intents]
status: done
verified_at: 2026-11-15
category: "AI엔지니어링(AIEngineering)"
aliases: ["Siri AI 앱 연동", "Siri AI App Intents", "Siri AI Developer Preview"]
---

# Siri AI와 App Intents 앱 연동

운영체제의 AI 비서가 사용자의 부탁을 끝까지 처리하려면 답을 만드는 모델과 별개로, 각 앱의 데이터와 기능을 호출할 통로가 필요하다. Apple 플랫폼에서는 앱이 App Intents로 자기 콘텐츠와 동작을 선언하고, Siri AI가 그 선언을 이용해 요청을 처리한다. Siri는 앱이 App Intents로 명시적으로 공개한 사용자 정의 콘텐츠와 동작만 찾고 실행할 수 있다.

## 2026-11-03 Developer Preview에서 열린 범위

2026-11-15 확인한 Apple Developer News와 App Intents 문서 기준이다.

- iOS 27.3, iPadOS 27.3, macOS 27.3, visionOS 27.3 베타부터 모든 개발자가 앱을 Siri AI에 연동할 수 있는 Developer Preview가 열렸다. Siri AI 자체의 베타는 watchOS 27.3까지 다섯 OS에 걸쳐 있다.
- 앱은 App Intents로 콘텐츠와 동작을 Siri AI에 직접 가져올 수 있다. Apple이 든 예는 배송 확인, 예약과 주문이다.
- Siri AI는 기존 스키마에 맞는 항목뿐 아니라 Spotlight 시맨틱 인덱스에 있는 모든 엔티티를 찾아 보여줄 수 있게 됐다.
- 여러 단계가 필요한 복잡한 요청을 위해 app skills가 추가됐다. skill은 Xcode 프로젝트의 `Skills.skillsbundle` 안에 폴더마다 `SKILL.md`를 두고, 메타데이터와 자연어 지시로 Siri AI를 안내한다. 문서는 skills로 결정적인 동작을 강제할 수 없고, Siri AI가 skill에 나열된 tool intent를 순서대로 실행하지 않는다고 밝힌다. 정해진 워크플로가 아니라 판단을 돕는 안내다.
- Developer Preview 기간에는 App Intents API와 Siri 기능이 바뀔 수 있다. 미리보기 기능은 TestFlight 외부 테스터와 App Store에 배포한 앱 버전에서는 쓸 수 없고, Xcode 개발 서명 빌드를 지원 기기에 설치하거나 내부 테스터용 TestFlight 버전으로 시험한다. 앱이 백그라운드에 있을 때는 요청에 앱 이름이 들어가야 한다. 앱이 포그라운드에 있거나 Live Activity가 활성 상태일 때, 앱을 언급한 Siri 앱 대화를 이어갈 때는 예외다.
- Siri AI는 Apple Intelligence를 지원하고 지원 언어로 설정한 기기가 필요하다. 2026-11-03 글 기준 지원 언어는 영어, 프랑스어, 일본어, 한국어, 포르투갈어, 스페인어다.
- 고객 제공은 수개월 뒤, App Store 제출은 봄부터 열린다고 안내했고 연도는 글에 명시되지 않았다. Siri AI로 가능해지는 경험의 약관과 이용 정책은 추후 안내한다고 밝혔다.
- Siri AI는 현재 EU의 iOS, iPadOS, watchOS에서 제공되지 않으며 Apple은 EU와 방법을 협의 중이라고 밝혔다. 13세 미만에게도 제공되지 않는다. Siri AI를 포함해 서버 모델에 의존하는 일부 Apple Intelligence 기능에는 하루 사용 한도가 있고, 이용 범위를 넓히는 유료 옵션을 향후 제공할 예정이다.

## 선언형 연동과 화면 조작의 차이

아래 표는 연동 방식의 일반 비교이며 Apple 문서의 설명이 아니다.

| 구분 | 앱이 선언한 동작 호출 | 화면을 읽고 누르는 조작 |
| --- | --- | --- |
| 호출 대상 | 앱이 공개한 동작과 엔티티 | 화면의 버튼과 입력 필드 |
| 앱 개발자의 역할 | 무엇을 열지 정하고 입력과 결과를 정의 | 별도 선언은 없지만 결과가 앱의 접근성 정보 품질에 좌우됨 |
| 실패 판단 | 동작의 반환과 오류로 확인 | 화면 상태를 다시 읽어 추정 |
| 변경 영향 | 선언을 유지하면 화면 개편과 분리 | 화면이 바뀌면 조작 경로가 깨질 수 있음 |

선언형 연동은 앱이 공개하지 않은 기능을 비서가 쓸 수 없다는 제약이 있지만, 결과를 구조화해 받을 수 있어 실행 성공 여부를 확인하기 쉽다. 화면 조작 방식의 계약과 경계는 [[Agent-Desktop-Accessibility-CLI|접근성 트리 기반 데스크톱 조작]]에서 다룬다.

## 동작을 공개할 때의 설계 점검

아래는 에이전트가 앱 기능을 호출하는 일반 조건에서 나온 점검 제안이며 Apple 문서의 요구사항이 아니다.

- 일정 추가나 주문처럼 상태를 바꾸는 동작은 같은 요청이 두 번 들어와도 결과가 한 번만 생기게 만든다. 응답이 늦어 실패로 보고 다시 호출하면 일정이나 주문이 중복될 수 있다. 구현 방식은 [[Idempotency-Key|멱등성 키]]를 참고한다.
- 결제, 발송, 삭제처럼 되돌리기 어려운 동작은 실행 전 사용자 확인 단계를 두고, 조회 동작과 분리해 공개한다.
- 동작의 결과에 실제 저장된 식별자와 상태를 돌려줘 비서가 완료를 확인할 수 있게 한다. 요청을 이해했다는 것과 작업이 끝났다는 것은 다르다.
- 비서가 읽는 웹 페이지나 메시지 안의 지시문은 자료일 뿐이다. 연락처 전송 같은 민감한 동작을 그런 내용만으로 실행하지 않도록 동작 단위의 권한과 확인을 둔다.
- skills는 실행 순서를 보장하지 않으므로 각 tool intent가 단독으로 안전해야 한다. 앞 단계가 끝나지 않은 상태에서 호출되거나 일부 단계만 끝난 경우에도 잘못된 상태를 만들지 않게 입력을 검증하고, 부분 완료를 결과로 알린다.
- Developer Preview 기간에는 API와 정책이 확정되지 않았다. 출시 일정, 약관과 지역 제한은 App Store 제출 시점의 공식 문서로 다시 확인한다.

## 출처

- [Siri AI is now open to all developers — Apple Developer](https://developer.apple.com/news/?id=gdk2umrf) — 2026-11-03 게시, 2026-11-15 뉴스 목록 본문으로 대조
- [Apple Developer, Siri AI Developer Preview](https://developer.apple.com/documentation/appintents/siri-ai-developer-preview) — 2026-11-15 문서 데이터로 대조
- [Apple Developer, Orchestrating complex actions with app skills](https://developer.apple.com/documentation/appintents/orchestrating-complex-actions-with-app-skills) — 2026-11-15 문서 데이터로 대조
- [Apple Developer, App Intents](https://developer.apple.com/documentation/appintents) — 컬렉션 진입점, 본문 미대조
- [AI 지각생? 다시 애플의 시간 — 안될공학 (YouTube)](https://www.youtube.com/watch?v=Iaxha5t8Vtg) — 2026-11-05 업로드, 정리 계기. 음성 전사 기준이며 온디바이스 모델의 파라미터 구성, 한국어 베타 시작일, 경쟁사 플랫폼, 시장 점유율과 부품 공급사 주장은 1차 출처로 확인하지 못해 옮기지 않았다.

## 관련 문서

- [[Agent-Integration|에이전트와 업무 시스템 연결]]
- [[Agent-Ready-API-Design|에이전트 친화 API 설계]]
- [[Agent-Desktop-Accessibility-CLI|접근성 트리 기반 데스크톱 조작]]
- [[Apple-Foundation-Models-Framework|Apple Foundation Models 프레임워크]] — 앱이 기기, PCC와 외부 모델을 부르는 반대 방향
