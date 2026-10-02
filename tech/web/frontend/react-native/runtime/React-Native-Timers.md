---
tags: [react-native, mobile, runtime]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native timer와 실행 양보"]
---

# React Native timer와 실행 양보

React Native 0.87 문서 기준이다.

timer는 함수를 나중에 실행하도록 예약한다. 오래 걸리는 JavaScript를 별도 스레드로 옮기는 기능은 아니다. 메인 JS 실행이 오래 점유되면 예약된 callback도 지연될 수 있다.

## API 선택

| API | 목적 | 취소 |
|---|---|---|
| `setTimeout` | 지정한 지연 뒤 일회 실행 예약 | `clearTimeout` |
| `setInterval` | 반복 실행 예약 | `clearInterval` |
| `setImmediate` | 현재 JS 실행 구간 뒤 실행 예약 | `clearImmediate` |
| `requestAnimationFrame` | 화면 frame에 맞춘 작업 예약 | `cancelAnimationFrame` |

`requestAnimationFrame`과 `setTimeout(callback, 0)`은 실행 목적과 시점이 다르다. 0 ms timeout을 frame마다 정확히 한 번 호출되는 animation clock으로 사용하지 않는다.

## 양보와 반복

Timers 문서는 `setImmediate` callback 안에서 다시 `setImmediate`를 호출하면 native에 제어를 돌려주지 않고 이어 실행될 수 있다고 설명한다. 이를 긴 계산을 안전하게 분할하는 수단으로 가정하지 않는다.

같은 페이지의 batch 전송과 Promise 내부 구현 설명은 legacy runtime 맥락을 포함한다. 현재 Hermes와 New Architecture의 microtask 순서 전체를 그 문장만으로 규정하지 않는다. 정밀한 실행 순서가 필요하면 사용 버전의 실제 runtime에서 재현한다.

비긴급 작업은 실제 처리량을 나누고 필요에 따라 `requestIdleCallback` 같은 idle scheduling을 검토한다. 예약 API를 바꿔도 callback 하나가 길면 반응성을 해칠 수 있다.

## 수명 관리 예시

```tsx
import {useEffect, useState} from 'react';
import {Text} from 'react-native';

const DelayedHint = () => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 1000);
    return () => clearTimeout(timer);
  }, []);
  return visible ? <Text>도움말을 확인하세요</Text> : null;
};
```

화면이 사라지면 예약을 정리하는 개념 예제다. background 전환 중 정확한 실행 간격이나 업무 마감 처리를 보장하는 예제가 아니다. 시간 기반 업무 판단은 실제 시각을 비교하는 계약으로 설계한다.

## 오래된 디버거 안내

Timers 원문에는 Android와 debugger의 clock drift를 root 명령으로 보정하는 예시가 남아 있다. 이를 일반 앱 timer 문제의 기본 해결책으로 실행하지 않는다. 먼저 현재 디버깅 방식과 JS 지연, 앱 lifecycle을 확인한다. Chrome 원격 JS 디버깅은 0.79에서 제거된 방식이다.

## 출처

- [React Native, Timers](https://reactnative.dev/docs/timers)

## 관련 문서

- [[React-Native-JavaScript-Runtime]]
- [[React-Native-Performance]]
- [[React-Effects]]
