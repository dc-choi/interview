---
tags: [react-native, runtime]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native performance timeline과 지원 차이

React Native 0.87의 performance는 mark/measure와 performance entry 조회, observer를 제공한다. web의 이름을 공유하더라도 시간 원점과 세부 field가 다르다.

## clock과 startup

performance.now()는 앱 시작이 아니라 **system boot 이후 millisecond**이고 timeOrigin도 UNIX epoch부터 system boot까지의 값이다. web page navigation start 기준 계산을 그대로 적용하지 않는다.

rnStartupTiming은 RN 전용이다. runtime 초기화 시작 startTime, bundle entry 실행 시작 executeJavaScriptBundleEntryPointStart와 초기화 종료 endTime을 제공하며 값은 void일 수 있다. native startup, RN 초기화, 화면 준비와 사용자 상호작용 가능 시점을 구분한다.

## entry를 관찰하기

```tsx
const observer = new PerformanceObserver(list => {
  for (const entry of list.getEntries()) {
    console.log(entry.entryType, entry.name, entry.duration);
  }
});
observer.observe({entryTypes: ['mark', 'measure']});
// 화면이나 관측 수명이 끝날 때 observer.disconnect();
```

설명용 조각이며 기기 실행 검증은 하지 않았다. supportedEntryTypes는 mark/measure/event/longtask/resource다. mark/measure를 만들고 clearMarks/clearMeasures로 정리하며 entry list의 getEntries를 사용한다. EventCounts와 memory의 상세 동작은 해당 runtime 지원을 추가 확인한다.

## partial support

PerformanceEventTiming의 cancelable/target은 지원하지 않는다. PerformanceLongTaskTiming의 attribution은 빈 배열이다. PerformanceResourceTiming은 fetchStart/requestStart/connectStart/connectEnd/responseStart/responseEnd/responseStatus/contentType/encodedBodySize/decodedBodySize만 구현한다고 명시한다. DNS 등 다른 web field를 있다고 가정하지 않는다.

console.timeStamp는 Performance panel에 custom timing을 남긴다. label, 이전 timestamp 이름 또는 now() 숫자의 start/end, trackName/trackGroup과 DevToolsColor를 전달할 수 있다. 화면에서 본 event가 production telemetry로 저장된다는 뜻은 아니다.

## 출처

- [React Native, performance](https://reactnative.dev/docs/global-performance)
- [React Native, PerformanceEntry](https://reactnative.dev/docs/global-PerformanceEntry)
- [React Native, PerformanceMark](https://reactnative.dev/docs/global-PerformanceMark)
- [React Native, PerformanceMeasure](https://reactnative.dev/docs/global-PerformanceMeasure)
- [React Native, PerformanceObserver](https://reactnative.dev/docs/global-PerformanceObserver)
- [React Native, PerformanceObserverEntryList](https://reactnative.dev/docs/global-PerformanceObserverEntryList)
- [React Native, PerformanceEventTiming](https://reactnative.dev/docs/global-PerformanceEventTiming)
- [React Native, PerformanceLongTaskTiming](https://reactnative.dev/docs/global-PerformanceLongTaskTiming)
- [React Native, PerformanceResourceTiming](https://reactnative.dev/docs/global-PerformanceResourceTiming)
- [React Native, EventCounts](https://reactnative.dev/docs/global-EventCounts)
- [React Native, console](https://reactnative.dev/docs/global-console)

## 관련 문서

- [[React-Native-Profiling]]
- [[React-Native-DevTools]]
- [[RN-Global-APIs]]
