---
tags: [expo, react-native, visual]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Compose 진행률과 LoadingIndicator"]
---

# Compose 진행률과 LoadingIndicator

Android에서 일반 진행률 표시기는 완료 비율을 숫자로 받고, Material 3 Expressive LoadingIndicator는 모양이 변하는 애니메이션을 ObservableState로 제어한다. 모두 `Host` 아래에 둔다.

## 일반 진행률

`LinearProgressIndicator`, `CircularProgressIndicator`, `LinearWavyProgressIndicator`, `CircularWavyProgressIndicator`는 `progress`(선택적 number 또는 null), `color`, `trackColor`, `modifiers`를 공유한다. 완료 비율은 0~1이다. progress를 생략하면 완료량을 알 수 없는 indeterminate 애니메이션이다.

```tsx
<Column verticalArrangement={{ spacedBy: 16 }}>
  <LinearProgressIndicator progress={downloaded / total} />
  <CircularProgressIndicator />
  <LinearWavyProgressIndicator progress={0.6} />
</Column>
```

| 변형 | 추가 옵션 |
| --- | --- |
| Circular | `strokeWidth`, `gapSize` dp, `strokeCap` 기본 round |
| Linear | `gapSize` dp, `strokeCap` 기본 round, `drawStopIndicator` |
| LinearWavy | determinate 트랙 끝의 `stopSize` dp |
| CircularWavy | 공통 옵션 |

`strokeCap`은 `round`, `butt`, `square`다. Linear의 `drawStopIndicator` 객체는 `color`, `stopSize`, `strokeCap`을 선택적으로 지정한다. 미지정 필드는 표시기 색, Material 크기, 표시기 cap을 따르고 객체 자체를 생략하면 Compose 기본 stop indicator를 사용한다.

## 모양이 변하는 로딩

`LoadingIndicator`와 `ContainedLoadingIndicator`의 공통 props는 `color`, `modifiers`, `progress?: ObservableState<number|null>`이다. Contained에는 `containerColor`가 추가된다. 숫자를 직접 넘기는 일반 progress와 타입이 다르다.

```tsx
const progress = useNativeState<number | null>(0);
<ContainedLoadingIndicator progress={progress} />
// 실제 작업에서 계산한 값을 기록한다.
progress.set(0.7);
```

progress를 생략하면 계속 변하는 로딩이다. 원문의 주기적 증분 예제는 시각적 시연이며 실제 완료량을 나타내지 않는다. JS 스레드에서 `set` 후 즉시 `get`을 읽으면 UI에 적용되기 전 값일 수 있다. read-after-write가 필요한 UI worklet은 동기 상태 계약을 따른다.

## 출처

- [Expo Documentation, Progress indicators](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/progress)
- [Expo Documentation, LoadingIndicator](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/loadingindicator)

## 관련 문서

- [[Expo-Compose-Native-State]]
