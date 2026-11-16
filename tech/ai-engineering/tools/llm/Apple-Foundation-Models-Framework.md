---
tags: [ai, llm, apple, on-device, swift, private-cloud-compute]
status: done
verified_at: 2026-11-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Apple Foundation Models Framework", "Foundation Models 프레임워크", "Private Cloud Compute", "PCC", "Dynamic Profiles", "ClaudeForFoundationModels"]
---

# Apple Foundation Models 프레임워크: 기기, PCC와 외부 모델의 호출 경계

Foundation Models 프레임워크는 Apple 플랫폼의 앱이 언어 모델을 부르는 Swift API다. 같은 세션 API 뒤에 기기 안 모델, Apple 서버의 Private Cloud Compute(PCC) 모델과 외부 제공자의 모델을 둘 수 있다. 호출 코드가 같아도 데이터가 가는 곳, 비용, 한도와 지원 기능은 모델마다 다르므로 실행 위치부터 정한다. Siri가 앱의 기능을 부르는 반대 방향의 연동은 [[Siri-AI-App-Intents|Siri AI와 App Intents]]가 다룬다.

2026-11-16 Apple 개발자 문서 데이터, 프레임워크 소개 페이지와 PCC 개발자 페이지를 대조한 기준이다. 문서 데이터의 최소 플랫폼은 iOS, iPadOS, Mac Catalyst, macOS, visionOS 26.0과 watchOS 27.0이고, Apple 모델을 쓰려면 Apple Intelligence 지원 기기가 필요하다.

## 구성 요소

- **세션:** `LanguageModelSession`에 `Instructions`와 `Prompt`를 주고 `GenerationOptions`로 생성을 조절한다. 세션 transcript가 대화 기록, 항목과 첨부를 담는다.
- **구조화 출력:** `@Generable` 매크로와 `@Guide`로 Swift 타입을 기술하면 모델이 그 타입의 인스턴스를 만든다(guided generation). 문서는 이를 강한 보장으로 설명하지만 형식이 맞는 것과 값이 맞는 것은 다르다([[LLM-Failure-Handling-Response-Validation#구조화 출력은 형식만 보장한다|구조화 출력의 한계]]).
- **도구:** `Tool` 프로토콜로 모델이 요청을 처리하다 부를 함수를 정의한다. 로컬이나 온라인 데이터 조회, 앱 안 서비스 호출이 예다.
- **이미지:** 프롬프트에 이미지를 첨부할 수 있고, Vision 프레임워크의 OCR과 바코드 인식은 기기에서 돈다.
- **Dynamic Profiles:** 세션의 모델, temperature, 추론 수준과 도구 묶음을 실행 중에 바꾸며 transcript는 프로필 사이에 공유한다. 간단한 판단은 기기 모델에, 깊은 추론은 서버 모델에 맡기는 구성을 한 세션 안에서 만든다.
- **평가와 개발 도구:** Evaluations 프레임워크는 지시문, 모델이나 프로필을 바꾼 뒤의 동작을 표본으로 채점하고, Instruments로 토큰 소비와 응답 시간을 잰다. macOS 27의 `fm` CLI와 Python SDK가 앱 밖의 스크립트와 평가 도구를 연결한다.

## 실행 위치별 경계

| 실행 위치 | 연결 방법 | 확인할 경계 |
|---|---|---|
| 기기 모델 (`SystemLanguageModel`) | 기본 제공, 인터넷 없이 동작 | 요약, 추출, 다듬기 같은 텍스트 작업에 맞고 더 큰 추론과 문맥은 서버 모델로 보내라고 안내한다. 문맥 크기와 지원 언어 목록은 확인한 문서 데이터에 없다 |
| PCC (`PrivateCloudComputeLanguageModel`) | `com.apple.developer.private-cloud-compute` entitlement | 더 큰 문맥과 강화된 추론. Apple은 사용자 데이터를 저장하지 않고 Apple과 제3자가 접근할 수 없게 설계했다고 설명한다. 하루 사용 한도가 있다 |
| 외부 제공자 | `LanguageModel` 프로토콜을 구현한 Swift 패키지 | 소개 페이지는 Core AI, MLX 모델과 Claude, Gemini 패키지를 든다. 서버 모델이면 요청이 그 제공자로 가므로 제공자의 데이터 정책과 과금이 적용된다(구조에서 도출) |

Core AI로 내보낸 공개 모델은 같은 API로 기기 안에서 실행하는 경로이며 외부 서버 모델 연결과 다르다.

## PCC를 비용 없이 쓰는 조건

PCC 개발자 페이지 기준으로 다음 셋을 모두 갖춘 개발자는 클라우드 API 비용 없이 PCC의 Apple 모델을 쓴다. App Store Small Business Program 가입, 어느 앱도 App Store 첫 다운로드가 200만 건 미만, 계정에 PCC entitlement 할당이다. Apple Intelligence가 제공되는 곳에서 쓰며 TestFlight와 ad hoc 배포로 시험한 설치는 첫 다운로드에 세지 않는다. 어느 앱이 기준을 넘거나 프로그램을 떠나면 통지를 받고 6개월 안에 다른 방식으로 옮겨야 한다.

비용이 없다는 것과 무제한은 다르다. PCC의 Apple 모델을 쓰는 앱은 Siri AI 같은 서버 모델 기능과 함께 하루 사용 한도를 받고, 한도는 기능, 요청 복잡도, 시스템 수요와 정책에 따라 바뀐다. 범위를 넓힌 접근은 앞으로 유료라고 밝힌다. 한도 수치와 귀속 단위는 페이지에 없으므로 한도에 걸렸을 때의 폴백 경로와 사용자 안내를 설계에 넣는다(운영 제안). 사용량이 최종 사용자의 Apple 계정에 귀속된다는 개발자 의견이 있으나 공식 문서로 확인하지 못했다.

## 외부 모델을 연결할 때의 자격 증명

Anthropic의 `ClaudeForFoundationModels`(2026-11-16 README 확인, 베타, OS 27 베타 대상, Apache-2.0)는 `LanguageModel` 프로토콜을 구현한 `ClaudeLanguageModel`로 같은 세션 API에서 Claude를 부른다. 스트리밍, `@Generable` 구조화 출력, 기기에서 도는 클라이언트 도구와 웹 검색, 웹 가져오기, 코드 실행 같은 서버 도구를 지원한다. 인증 방식은 셋이다.

- **App Attest(권장):** Anthropic 콘솔에 팀 ID와 번들 ID를 등록해 받은 공개 client ID를 쓴다. 앱에 키가 없고 백엔드도 필요 없다. 실제 기기의 Secure Enclave가 필요해 시뮬레이터에서는 `attestationUnsupported` 오류가 난다.
- **API 키:** 시뮬레이터 개발용이다. 배포한 앱에 넣은 키는 추출될 수 있으므로 출시에 쓰지 않는다.
- **자체 프록시:** 앱은 키 없이 자기 백엔드로 보내고 릴레이가 서버에서 자격 증명을 붙인다.

앱 바이너리에 넣은 비밀 값은 비밀이 아니라는 원칙은 제공자와 무관하다. 기기 증명이나 서버 중계로 키를 앱 밖에 두고, 사용자별 사용량 귀속과 남용 차단을 서버 쪽에서 확인한다(운영 제안).

## 설계 점검

- 프로필을 서버 모델로 바꾸면 그전까지 기기에서 쌓인 transcript도 함께 쓰인다(transcript 공유 설명에서 도출). 데이터가 기기 밖으로 나가는 시점을 데이터 등급과 사용자 고지에 맞췄는가?
- 같은 API라도 모델마다 문맥 크기, 도구 호출과 구조화 출력 지원이 다르다. 모델이나 프로필을 바꿀 때 Evaluations로 다시 채점했는가?
- 하루 한도, 지역 제공 여부와 기기 조건에 걸렸을 때의 대체 경로가 있는가?
- 금지 용도를 정한 Acceptable Use Requirements를 확인했는가? AFM 3 Cloud를 통합하는 AI 시스템 제공자를 위해 EU AI Act 제53조 제1항 (b)에 따른 모델 문서가 제공된다.

## 출처

- [Apple Developer, Foundation Models](https://developer.apple.com/documentation/foundationmodels) — 2026-11-16 문서 데이터로 플랫폼, 타입 구성, PCC entitlement와 사용자 정의 제공자 경로 대조
- [Apple Developer, Foundation Models framework](https://developer.apple.com/foundation-models-framework/) — 2026-11-16 Dynamic Profiles, 이미지 이해, 지원 제공자 패키지, `fm` CLI와 이용 제한 대조
- [Apple Developer, Private Cloud Compute](https://developer.apple.com/private-cloud-compute/) — 2026-11-16 비용 없는 이용 조건, 시험 설치, 6개월 이전 기한, 하루 한도와 향후 유료 접근 대조
- [ClaudeForFoundationModels — Anthropic](https://github.com/anthropics/ClaudeForFoundationModels) — 2026-11-16 README의 인증 방식, 지원 기능과 베타 범위 대조
- [Foundation Models framework - 온디바이스와 클라우드 LLM을 통합하는 Swift API — GeekNews](https://news.hada.io/topic?id=37098) — 소개 글과 Hacker News 의견 번역

## 관련 문서

- [[Siri-AI-App-Intents|Siri AI와 App Intents 앱 연동]] — 비서가 앱 기능을 부르는 반대 방향
- [[Local-Inference-Deployment-Cases|로컬 추론의 배포 사례]] — Uzu처럼 앱 안에서 모델을 돌리는 다른 엔진
- [[LLM-Gateway|LLM 게이트웨이]] — 여러 제공자를 한 호출 계층 뒤에 둘 때의 기능 보존
- [[LLM-Failure-Handling-Response-Validation|구조화 출력과 응답 검증]]
- [[Bedrock-Model-Inference|Bedrock 모델 호출]] — 다른 플랫폼의 모델 호출 계약
