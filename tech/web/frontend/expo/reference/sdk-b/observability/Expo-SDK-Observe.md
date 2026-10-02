---
tags: [expo, expo-sdk, observability]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK Observe Metrics와 Event API"]
---

# Expo SDK Observe Metrics와 Event API

expo-observe는 Android/iOS/tvOS production startup/navigation/update 성능과 custom events를 EAS Observe 또는 OTEL backend로 전달한다. Expo Go는 미지원이며 development build를 사용한다. npx expo install expo-observe 후 Observe/ObserveRoot/useObserve를 import한다. error symbolication dashboard는 preview 상태다. 서비스 quota/가격은 source의 시점별 요금표를 확인하며 API의 고정 계약으로 저장하지 않는다.

## TTR와 TTI

ObserveRoot.wrap(RootLayout) 또는 component wrapper가 first render를 기록한다. useObserve().markInteractive(attributes?)는 실제 초기 데이터/자원 준비 후 사용자 상호작용이 가능해진 시점에 호출한다. 임의 empty effect를 앱 readiness로 확정하면 TTI가 실제보다 짧아진다. ObserveInteractiveMarker는 아무것도 렌더하지 않고 첫 mount에 한 번 기록하며 params를 이후 변경해도 반영되지 않는다.

```tsx
function Feed() {
  const {markInteractive} = useObserve();
  const ready = useInitialDataReady();
  useEffect(()=>{if (ready) markInteractive({params:{cacheHit:true}});},[ready,markInteractive]);
  return ready ? <Content /> : <Loading />;
}
```

raw Observe.markFirstRender()/markInteractive():void는 cold_ttr/warm_ttr/tti를 기록한다. navigation integration 활성시 hook은 현재 routeName을 채우지만 raw call은 그렇지 않다. MetricAttributes는 routeName?:string|null, params?:record다.

## Configure와 dispatch

configure(config):void는 environment(default process.env.NODE_ENV), dispatchingEnabled=true, dispatchInDebug=false, sampleRate0..1(clamped), integrations를 설정한다. debug/disabling/out-of-sample은 pending metrics를 보관해 나중에 보내는 pause가 아니라 sent로 mark/drop한다. sample은 installation마다 결정적이고 launch마다 재추첨하지 않는다. dispatchEvents():Promise<void>는 manual flush다. 자동 flush는 background 전환, Android connectivity worker, iOS resign-active/terminate 시점에 이루어지지만 abrupt termination의 전달 보장을 뜻하지 않는다. native clearStoredEntries():Promise<void>는 저장 entry를 비운다. setBundleDefaults는 첫 import시 자동 호출되며 host app이 직접 호출하는 API가 아니다.

## Logs와 errors

logEvent(name,{body, displayName, attributes, severity='info'}):void는 main session에 local persist하고 다음 flush에 OTEL /v1/logs record로 전송한다. severity는 trace/debug/info/warn/error/fatal이다. setGlobalAttributes(record|null):void는 이후 모든 metric/event에 merge하고 per-record key가 우선한다. null/undefined/{}로 clear한다. 값은 typed string/number/boolean과 nested arrays/maps이며 Date/function/undefined 등은 downstream에서 drop될 수 있다.

reportError(caught):void는 handled error를 nonfatal exception event로 기록한다. Error는 name/message/stack, 그 외 thrown 값은 stringified message다. ObserveErrorBoundary는 render-phase error와 component stack을 잡고 fallback(element/function/null)을 표시한다. fallback function은 error/resetError를 받으며 reset은 children을 remount한다. capture-only로 다시 throw하는 mode는 없다. ObserveRoot.errorBoundaryFallback를 생략하면 root boundary를 mount하지 않고 native 기본 동작을 유지한다. source의 AppMetrics 이전 이름과 Observe 현재 export를 혼동하지 않는다.

## Integrations와 privacy

integrations['expo-router'] 기본 false는 router state의 navigation metric을 기록한다. react-navigation 기본 false는 stock NavigationContainer 대신 ObserveNavigationContainer가 필요하다. object filteredParams[]는 route/query keys를 제거하고 제거가 발생하면 resolved URL/path를 urlHidden:true로 대체한다. routeName은 숨기지 않는다. getIntegrations()는 마지막 configure 또는{}, registerIntegration(name, callback)은 설정 가능시 한 번 callback한다. module configure event는 매 configure마다 resolved integration config를 전한다.

NetworkRequestObserver는 native interceptor의 requestStarted/requestCompleted를 구독하고 references를 놓으면 종료한다. user identifiers, query params와 error message의 민감정보를 event body/attributes에 넣기 전에 실제 수집 범위를 확인한다. flush 완료와 대시보드 ingestion/이벤트의 사용자 경험 원인은 별도로 검토한다.

## 출처

- [Expo Documentation, Observe](https://docs.expo.dev/versions/latest/sdk/observe)

## 관련 문서

- [[Expo-Integrations-Analytics]]
- [[Expo-Integrations-Error-Replay]]
- [[Expo-SDK-Splash-Screen]]
