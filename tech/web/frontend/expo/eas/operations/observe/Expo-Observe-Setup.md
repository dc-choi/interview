---
tags: [expo, eas, operations]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Observe 설치와 계측"]
---

# EAS Observe 설치와 계측

## 운영 앱을 계측한다

EAS Observe는 native 시작 시간, React 렌더링, 사용 가능 시점, 화면 이동, 업데이트 다운로드와 오류를 관찰한다. SDK 55 이상을 지원하며 expo-observe가 포함된 새 native build가 필요하다. Expo Go에는 포함되지 않는다. 아래는 SDK 56 이상 API다.

```tsx
import { Observe, ObserveRoot } from 'expo-observe';
Observe.configure({ environment: 'production' });
function RootLayout() { return <App />; }
export default ObserveRoot.wrap(RootLayout);
```

App은 프로젝트의 root UI 컴포넌트를 뜻한다. configure는 root mount 전에 module scope에서 한 번 수행한다. 실제 화면에서는 useObserve().markInteractive()를 콘텐츠 로딩, splash 숨김과 상호작용 준비가 끝난 뒤 호출한다. 단순 mount나 skeleton 표시를 완료로 기록하지 않는다.

## 시작 경로와 전달

Deep link와 알림으로 첫 화면이 달라질 수 있으므로 모든 진입 화면에서 준비 상태를 계측한다. navigation integration이 없으면 launch당 첫 markInteractive만 기록한다. integration이 있으면 화면 이동별 준비 상태도 수집한다.

오프라인 기록은 기기에 남고 연결 가능한 background 전환 시 전송된다. Observe.dispatchEvents()로 수동 flush도 가능하다. SDK 55의 AppMetrics/AppMetricsRoot API와 SDK 56 이상의 Observe/ObserveRoot/useObserve를 섞지 않는다.

## 제공 범위와 수집량

2026-10-01 소개 문서는 Free 월 100,000 events, paid 월 500,000 events를 안내한다. 이를 앱 MAU 한도로 해석하지 않는다. 화면 이동과 custom event 수에 따라 한 installation이 만드는 양이 달라진다. 보존 기간은 최소 60일이다. 실제 계정의 plan과 사용량을 확인한다.

계측 코드 작성, native 재빌드, 실제 release 실행, 서버 수신과 dashboard 표시를 각각 확인해야 한다. 이 문서의 예시는 실행 결과가 아니다.

## 출처

- [Expo Documentation, Introduction to EAS Observe](https://docs.expo.dev/eas/observe/introduction)
- [Expo Documentation, Set up EAS Observe](https://docs.expo.dev/eas/observe/get-started)

## 관련 문서

- [[Expo-Observe]]

- [[Expo]]
