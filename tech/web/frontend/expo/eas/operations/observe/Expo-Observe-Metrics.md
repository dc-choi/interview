---
tags: [expo, eas, operations]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Observe 시작 성능 지표"]
---

# Observe 시작 성능 지표

## 측정 구간과 단위

Session은 앱 process가 시작해 종료될 때까지다. user는 사람 수가 아니라 installation ID다. duration 단위는 초다.

| 지표 | 측정 대상 |
| --- | --- |
| cold_launch | process 생성부터 native 초기화 완료까지. React Native runtime 초기화를 포함한다. |
| warm_launch | 이미 메모리에 있는 process를 foreground로 복귀시키는 native 시간 |
| bundle_load | JS bytecode 로드와 평가, runApplication 직전까지 |
| ttr | native launch 이후 root React 첫 렌더. root HOC가 필요하다. |
| tti | native launch 이후 사용 가능하다고 markInteractive한 시점까지 |
| update_download | expo-updates OTA bundle 다운로드 |

공식 권고는 cold 1.5초 미만, warm 0.5초 미만, bundle 0.3초 미만이다. TTR 2초/TTI 3초 권고는 cold launch를 포함한 사용자 관점 목표다. 개별 metric 원시값과 전체 시작 시간을 무조건 같은 값으로 비교하지 않는다.

## Interactive 시점

콘텐츠가 보이고 touch handler와 navigation이 작동할 때 markInteractive를 호출한다. ObserveInteractiveMarker는 mount 때 한 번 호출하고 아무 UI도 렌더하지 않는다. 최초 params만 사용하므로 나중에 값이 결정되면 hook을 직접 호출한다.

```tsx
const { markInteractive } = useObserve();
useEffect(() => {
  if (ready && splashHidden) {
    markInteractive({ routeName: '/feed', params: { cacheHit: true } });
  }
}, [ready, splashHidden, markInteractive]);
```

Navigation integration의 화면별 timer와 앱 전체 첫 interactive timer는 구분한다. 미리 렌더한 화면과 처음 mount하는 화면을 같은 모집단으로 비교하지 않는다.

## 개선 방향

Native module 초기화는 cold launch, module 최상위 연산과 synchronous I/O는 bundle load, 초기 tree와 waterfall fetching은 TTR/TTI에서 조사한다. 업데이트를 기다리는 fallbackToCacheTimeout도 native 시작을 늦출 수 있다. OS가 warm/cold 상태를 결정하므로 앱에서 warm launch를 항상 보장할 수는 없다.

## 출처

- [Expo Documentation, Metrics reference](https://docs.expo.dev/eas/observe/reference/metrics)

## 관련 문서

- [[Expo-Observe]]

- [[Expo]]
