---
tags: [expo, react-native, ai]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Skills 작업 분류와 문서 접근"]
---

# Expo Skills 작업 분류와 문서 접근

## 설치와 역할

Skills는 에이전트가 반복 작업의 검증된 절차를 따라가도록 만드는 구조화된 지침이다. Claude Code/Codex의 공식 Expo plugin은 Skills와 MCP를 함께 설치한다. `npx skills add expo/skills`는 호환 에이전트에 Skills만 설치하며 MCP 연결을 추가하지 않는다.

Skills 이름과 구성은 업데이트될 수 있으므로 설치된 버전의 내용을 확인한다. 다음 목록은 2026-10-01 공식 가이드 기준이며 사용자에게 모든 Skill을 강제로 활성화하는 규칙이 아니다.

## 프레임워크 작업별 Skill

| 작업 | Skill | 적용 경계 |
| --- | --- | --- |
| 전체 작업 분류 | `expo-overview` | Expo 의존성/작업 신호가 있을 때 다른 Skill로 라우팅 |
| 새 프로젝트 파일 배치 | `expo-project-structure` | 기존 프로젝트 전체 재구조화 근거로 사용하지 않음 |
| SDK 업데이트 | `expo-upgrade` | 호환 의존성과 breaking change 확인 |
| 라우팅과 화면 이동 | `expo-router` | 파일 경로, Stack, tabs, modal, header/search |
| 네트워크와 데이터 | `expo-data-fetching` | fetch, React Query/SWR, cache/offline, loading/error/empty |
| 디자인 토큰/컴포넌트 | `expo-design-system` | 기존 스타일 도구의 관례를 유지하며 반복 뷰 추출 |
| 플랫폼에 어울리는 UI | `expo-native-ui` | HIG, semantic colors, 아이콘, 미디어와 반응형 layout |
| SwiftUI/Compose 컴포넌트 | `expo-ui` | `@expo/ui`의 Host, Row/Column, List, Picker, Slider 등 |
| 애니메이션과 제스처 | `expo-animation` | thread, 속성, spring/timing, gesture handoff, haptics |
| 개발용 바이너리 | `expo-dev-client` | 로컬/내부 테스트용, production 스토어 릴리스와 구분 |
| 웹 코드 삽입 | `expo-dom` | native WebView, web DOM 컴포넌트 |
| 웹 앱 전체 이식 | `expo-web-to-native` | DOM/CSS/storage/routing 차이를 포함한 단계적 전환 |
| 기존 네이티브 앱 통합 | `expo-brownfield` | SwiftUI/UIKit/Kotlin, AAR/XCFramework, isolated/integrated |
| 네이티브 모듈 | `expo-module` | Swift/Kotlin DSL, 뷰, lifecycle, shared objects, autolinking |
| App Clip | `expo-app-clip` | 별도 iOS target, AASA, URL invocation |
| 공식 예제 통합 | `expo-examples` | SDK에 맞는 `with-*` 패턴을 현재 앱에 맞춰 적용 |
| feedback/telemetry | `expo-skill-feedback` | 피드백 전송과 익명 사용 추적 제어, 실행 권한 별도 |

`@expo/ui` List는 설정 화면 같은 네이티브 grouped row이며 가상화 목록이 아니다. 큰 데이터 목록에는 FlatList/FlashList를 검토한다. 모듈 작성과 기존 Swift 모듈의 새 macros 이행도 서로 다른 작업이다.

## EAS 작업별 Skill

| Skill | 사용 조건 |
| --- | --- |
| `eas-app-stores` | 서명, app version/build number, `eas.json`, TestFlight/App Store/Google Play |
| `eas-hosting` | 웹 export, Expo Router `+api.ts`, preview URL/production, secret/domain, Workers 제약 |
| `eas-update` | `expo-updates`, branch/channel/runtime, OTA 테스트와 오래된 코드 문제 |
| `eas-update-insights` | crash rate, 설치/launch, 사용자, payload, embedded/OTA 분포와 rollout health |
| `eas-workflows` | `.eas/workflows/` YAML과 CI/CD |
| `eas-observe` | `expo-observe`, interactive marker, route/event/error 측정과 CLI 조회 |
| `eas-simulator` | 로컬 도구가 없는 환경이나 원격/공유 가능한 cloud simulator, 실험적 API |

macOS에서 단순히 Simulator 실행을 요청했다고 remote simulator를 기본 선택하지 않는다. remote 환경, 필요한 OS 버전, headless 실행 같은 실제 요구로 판단한다.

공식 Skills 페이지의 예시 프롬프트에는 `expo-tailwind-setup`도 나오지만 같은 페이지의 현재 전체 목록에는 없다. 이 이름의 설치/지원 여부를 보장하지 않고 실제 설치 목록을 확인한다.

## LLM용 문서 접근

개별 페이지 URL에 `.md` 또는 `/index.md`를 붙이면 같은 Markdown 본문을 받을 수 있다. 페이지 상단 Copy page > Copy Markdown도 단일 문서 전달에 적합하다.

```text
https://docs.expo.dev/develop/development-builds/introduction.md
https://docs.expo.dev/develop/development-builds/introduction/index.md
https://docs.expo.dev/llms.txt
```

`llms.txt`는 페이지 링크와 짧은 설명을 제공하는 발견용 색인이다. 작업 관련 페이지를 찾은 뒤 실제 본문을 읽으며 전체 문서를 한 번에 context에 넣지 않는다. 색인 설명만 읽은 것은 API 계약이나 제한을 확인한 것과 다르다.

## 출처

- [Expo Documentation, Expo Skills for AI agents](https://docs.expo.dev/skills)
- [Expo Documentation, Documentation for AI agents and LLMs](https://docs.expo.dev/llms)

## 관련 문서

- [[Expo-Home-AI-Agents]]
- [[Expo-Home-AI-MCP]]
