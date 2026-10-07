---
tags: [web, chat, sdk, authentication, react]
status: done
verified_at: 2026-10-08
category: "웹&네트워크(Web&Network)"
aliases: ["Chat Web SDK", "채팅 SDK 책임 경계"]
---

# 채팅 Web SDK와 호스트 앱의 책임 경계

채팅 SDK는 호스트 앱의 실행 환경에 들어가는 라이브러리다. 연결과 메시지 처리를 재사용하되, 번들 구성, 인증 수명주기와 서비스별 화면의 책임을 계약으로 나눠야 한다. 아래는 공식 기술 문서의 제약을 채팅 SDK에 적용한 설계 예시다.

## 빌드와 배포

ESM의 정적인 import/export 구조는 번들러가 미사용 코드를 분석하는 기반이다. ESM으로 배포했다는 사실만으로 작은 번들을 보장하지는 않는다. 부수 효과와 소비 앱의 최적화 설정을 함께 확인한다. 특히 CSS를 부수 효과가 없는 파일로 잘못 표시하면 필요한 스타일이 제거될 수 있다.

React처럼 호스트와 호환되어야 하는 라이브러리는 `peerDependencies`로 지원 범위를 표현할 수 있다. 이는 호환 계약이며, 번들에 중복 코드가 들어가지 않는다는 보장은 아니다. SDK 빌드의 외부 의존성 처리와 소비 앱의 최종 산출물을 별도로 확인한다. npm 7 이후에는 peer dependency가 기본적으로 자동 설치되므로, 호스트가 반드시 수동 설치한다는 전제로 안내하지 않는다.

SDK 사용 문서도 해당 릴리스에 묶는 방식을 검토한다. npm의 `files` 목록으로 문서 디렉터리를 패키지에 포함하고 배포 산출물에서 확인한다. 이렇게 하면 설치 버전과 최신 웹 문서 사이의 차이를 줄일 수 있지만, 문서 자체의 정확성까지 보장되지는 않는다.

## 인증 수명주기

OAuth 2.0에서 액세스 토큰은 클라이언트에 불투명할 수 있고, 보호된 자원을 제공하는 서버가 토큰을 검증한다. SDK가 전달받은 토큰을 파싱하지 않는 설계와 서버의 인증, 인가 검증은 별개다.

| 조건 | 토큰 전달 계약의 예 |
|---|---|
| 호스트가 공통 로그인 토큰의 발급과 갱신을 관리 | 갱신 시 SDK에 새 토큰을 전달 |
| SDK가 전용 토큰의 인증 실패를 먼저 감지 | 호스트의 토큰 공급 콜백을 호출하고 제한된 재시도 수행 |

선택은 토큰의 소유자와 만료 감지 위치에 따른다. OAuth가 모든 토큰의 주기적 교체나 특정 push/pull 방식을 강제하는 것은 아니다. 로그아웃 시 연결 종료와 대기 요청 취소, 사용자 변경 시 이전 채팅 상태 제거도 계약에 포함한다.

## UI와 오류

메시지 유형과 입력 정책은 SDK의 공통 컴포넌트로 제공하고, 서비스별 배지와 목록 배치는 데이터나 훅을 받아 호스트가 조립하는 구성을 검토할 수 있다. 서비스 조건문을 SDK에 계속 추가하는 비용과 각 팀이 공통 렌더링을 다시 만드는 비용을 비교한다.

오류 경계는 발생 위치와 호출 계약으로 나눈다.

- 연결 실패와 전송 실패는 상태, 오류 코드 또는 Promise rejection 중 어떤 형태로 전달할지 명시한다. 실패를 성공처럼 숨기지 않는다.
- 호스트가 주입한 콜백의 오류는 호스트가 처리할 수 있게 전달한다. SDK 내부 오류와 구분해 관측한다.
- React Error Boundary는 하위 렌더링 오류를 다룬다. 일반 이벤트 핸들러와 타이머 콜백의 오류까지 잡는 장치로 간주하지 않는다. React 문서는 `useTransition`이 반환한 `startTransition` 안의 오류를 예외로 명시한다.

## 통합 확인

소비 앱의 프로덕션 빌드에서 미사용 기능과 CSS를 확인한다. 토큰 갱신, 로그아웃, 재연결, 전송 실패, 호스트 콜백 실패를 각각 재현해 처리 주체가 계약과 같은지 본다. 재연결 뒤 메시지 누락 복구는 [[Realtime-Sync-Recovery|실시간 동기화와 복구]]의 별도 책임이다.

## 출처

- [채팅을 하나의 제품이 아닌 플랫폼으로: Web SDK로 각자의 서비스에 채팅을 심는 방법 — 당근 팀, 2026 당근 빌더 밋업](https://www.youtube.com/watch?v=c5rYXZg5ZEA)
- [webpack, Tree Shaking](https://webpack.js.org/guides/tree-shaking/)
- [npm CLI v11, package.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/)
- [RFC 6749, The OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749)
- [React, Component](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)

## 관련 문서

- [[Realtime-Chat-Architecture|실시간 채팅 아키텍처]]
- [[Realtime-Sync-Recovery|실시간 동기화와 복구]]
