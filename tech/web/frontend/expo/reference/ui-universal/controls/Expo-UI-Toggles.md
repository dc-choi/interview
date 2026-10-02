---
tags: [expo, react-native, controls]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Universal Checkbox, Switch와 Slider"]
---

# Universal Checkbox, Switch와 Slider

## Controlled 값

Checkbox와 Switch는 required boolean value, required onValueChange(boolean)으로 React state를 반영한다. optional label은 control 옆 text이며 Switch label이 있으면 labelled row를 만든다. disabled/testID/modifiers가 optional props다. 일반 layout component의 모든 style/hidden/appearance props를 이 API에도 있다고 가정하지 않는다.

```tsx
const [enabled,setEnabled] = useState(false);
<Host matchContents><Switch label="Notifications" value={enabled} onValueChange={setEnabled} /></Host>
```

UI toggle와 실제 notification permission/feature persistence는 별도 application state다. 사용자가 누르면 callback 결과를 value에 반영해야 controlled state가 유지된다. Checkbox는 selected choice/동의, Switch는 on/off 설정처럼 의미에 맞게 쓴다.

## Numeric Slider

Slider required value number/onValueChange(number), optional min0/max1, step number, disabled/modifiers/testID를 제공한다. step 생략은 continuous range이고 step10,min0,max100은0,10,...100 값을 만든다.

```tsx
<Slider value={volume} onValueChange={setVolume} min={0} max={100} step={10} />
```

universal Slider에는 community compat의 minimumValue/maximumValue/onSlidingComplete/tint API를 그대로 사용하지 않는다. 실제 value range와 min/max/step 관계를 app에서 정하고 display formatting과 저장을 분리한다. 값 변경마다 expensive network write를 수행하려면 debounce/commit policy를 별도로 둔다. modifiers는 native-specific configuration을 위한 escape hatch이며 web native modifier parity를 보장하지 않는다.

## 출처

- [Expo Documentation, Checkbox](https://docs.expo.dev/versions/latest/sdk/ui/universal/checkbox)
- [Expo Documentation, Switch](https://docs.expo.dev/versions/latest/sdk/ui/universal/switch)
- [Expo Documentation, Slider](https://docs.expo.dev/versions/latest/sdk/ui/universal/slider)

## 관련 문서

- [[Expo-UI-Lists]]
- [[Expo-UI-Picker]]
