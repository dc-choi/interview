---
tags: [web, mobile, client, architecture]
status: done
verified_at: 2026-09-03
category: "웹&네트워크(Web&Network)"
aliases: ["Mobile App Architectures", "모바일 앱 개발 방식", "하이브리드 앱", "웹뷰"]
---

# 모바일 서비스 아키텍처: 배포 형태와 렌더링 방식

클라이언트를 어떻게 만드느냐가 배포 주기, 비용, 기기 기능 활용 범위를 결정한다. 정답은 없고, 기능의 정교함과 업데이트 속도와 리소스 사이의 트레이드오프다.

## 축 1: 배포와 실행 형태

| 형태 | 실행, 배포 | 업데이트와 특징 |
|---|---|---|
| OS별 네이티브 | Kotlin/Swift로 구현, 앱스토어 배포 | 기기 API와 성능 활용 폭이 넓고 OS별 구현 비용이 듦 |
| 크로스플랫폼 네이티브 | Flutter, React Native 등으로 공통 코드 활용, 앱스토어 배포 | 코드 공유가 가능하지만 네이티브 브리지와 플랫폼별 대응은 남음 |
| 하이브리드/WebView | 네이티브 셸 안에 웹 콘텐츠 표시, 앱스토어 배포 | 웹 영역은 빠르게 바꿀 수 있고 셸 변경은 심사가 필요 |
| 브라우저 웹 | URL로 접속 | 서버 배포로 즉시 반영, 브라우저가 제공하는 기기 기능 범위 안에서 동작 |
| PWA | 브라우저 웹에 설치, 오프라인, 푸시 같은 기능을 점진적으로 추가 | 브라우저와 OS별 지원 범위가 다르며 SPA 여부와는 별개 |

## 축 2: 웹 렌더링과 탐색 방식

SPA, MPA와 SSR은 위 배포 형태와 다른 축이다. 모바일 브라우저와 WebView 모두 SPA를 실행할 수도 있고, 서버가 렌더링한 HTML을 페이지 단위로 표시할 수도 있다.

| 방식 | 특징 |
|---|---|
| SPA | 클라이언트 라우팅과 부분 갱신을 주로 사용하며 API를 소비하는 구성이 흔함 |
| MPA | 탐색마다 새 문서를 받아 표시하며 서버 렌더링과 함께 쓰는 경우가 많음 |
| SSR | 서버가 초기 HTML을 렌더링하는 방식으로 SPA hydration과 결합할 수도 있음 |

하이브리드 앱도 WebView에 SPA만 넣어야 하는 것은 아니다. 자주 바뀌는 화면은 웹으로 두고 성능이나 기기 연동이 중요한 기능은 네이티브로 나누는 선택지다.

## 선택 기준

1. **기능** — 고성능 카메라 필터, 정교한 모션이 핵심이면 네이티브. 콘텐츠와 폼 중심이면 웹 계열로 충분.
2. **배포 주기** — 빠른 실험과 핫픽스가 중요하면 웹, 웹뷰 비중을 높인다. App Store 제출물은 90%가 24시간 안에 심사되지만 심사 대기와 리젝 후 재제출, 사용자의 업데이트 지연이 있어 웹처럼 즉시 반영되지는 않는다. 플랫폼과 변경 범위별 실제 소요를 일정에 반영한다.
3. **리소스** — OS별 네이티브 구현은 플랫폼별 개발과 유지보수 비용이 든다. 초기 팀은 크로스플랫폼, 하이브리드나 웹으로 시작하는 경우가 많다.

## 백엔드 관점: 클라이언트 유형이 서버에 미치는 영향

- **여러 버전의 클라이언트가 공존한다** — 네이티브, 하이브리드 앱은 스토어 심사와 사용자의 업데이트 지연 때문에 구버전이 오래 살아남는다. 서버는 항상 다중 버전을 동시에 서빙하므로 **API 하위 호환성 유지와 버저닝**([[API-Conventions-Response|API 컨벤션]])이 강제되고, 강제 업데이트 정책(최소 지원 버전)이 함께 설계돼야 한다. 방치하면 다중 API 버전 동시 운영의 유지보수 부담으로 돌아온다.
- **API 의존성은 렌더링 선택에 달렸다** — SPA는 API를 소비하는 구성이 흔하지만 WebView는 서버 렌더링 HTML도 표시할 수 있다. 실제 origin, 임베딩 방식과 인증 구조에 따라 CORS, 쿠키나 토큰 저장, 응답 스키마 안정성을 설계한다.
- **웹 푸시도 가능하지만 플랫폼 제약이 있다** — Push API, Notifications API와 Service Worker로 웹에서도 알림을 보낼 수 있다. macOS Safari 16 이상은 웹페이지를 지원하고, iOS와 iPadOS 16.4 이상은 홈 화면에 추가한 웹 앱에서 지원한다. 알림 도달률이 핵심이면 네이티브나 하이브리드가 유리할 수 있지만 필수 조건은 아니다.

## 면접 체크포인트

- 앱 배포 주기 질문에 스토어 심사 + 구버전 공존 → API 하위 호환과 강제 업데이트 정책으로 답하는 것이 백엔드다운 답.
- 하이브리드 선택 이유는 변경 빈도 기준으로 — 자주 바뀌는 화면은 웹뷰, 성능 민감 기능은 네이티브라는 분할 원칙.
- 기획, 클라이언트와의 협업에서 배포 비용(심사 대기와 사용자 업데이트 지연)을 알고 플랫폼별 실제 소요를 확인하는 것이 일정 합의의 기본기.

## 관련 문서
- [[API-Conventions-Response|API 컨벤션 — 에러 응답, 페이지네이션]]
- [[REST|REST API]]
- [[Project-Management|프로젝트 관리]] — 다중 API 버전 운영 부담의 회고 사례

## 출처
- [App Review — Apple Developer](https://developer.apple.com/app-store/review/)
- [Sending web push notifications in web apps and browsers — Apple Developer](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers)
- [MDN, Single-page application](https://developer.mozilla.org/en-US/docs/Glossary/SPA)
- [MDN, Progressive web apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [모바일 서비스 개발 방식 4가지 — 쪼렙 서비스기획자 (Brunch)](https://brunch.co.kr/@b30afb04c9f54dc/40)
