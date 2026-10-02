---
tags: [expo, expo-sdk, widgets]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK iOS Widget Runtime"]
---

# Expo SDK iOS Widget Runtime

expo-widgets는 @expo/ui/swift-ui로 iOS home/lock-screen widgets와 Live Activities를 만든다. Expo Go는 미지원이며 npx expo install expo-widgets 후 development build가 필요하다. Live Activities는 [[Expo-SDK-Live-Activities]]에 분리한다.

## Isolated widget function

createWidget(name, component)→Widget<Props, Configuration>의 component 첫 statement는 'widget' directive다. 별도 bundle/runtime으로 직렬화되어 RN View/Text, React hooks/context/state, async 작업, 앱 memory와 다른 module import를 사용할 수 없다. 같은 파일 top-level const도 직렬화되지 않는다. helper/constant는 function 안에 두거나 props로 전달하고 layout을 synchronous pure function으로 반환한다. SwiftUI components/modifiers import는 bundler가 처리하는 지원 surface다.

```tsx
const Counter = (props:{count:number}) => {
  'widget';
  return <VStack><Text>{props.count}</Text>
    <Button label="증가" target="increment" onPress={()=>({count:props.count+1})} />
  </VStack>;
};
export const widget = createWidget('CounterWidget', Counter);
// 앱 runtime: widget.updateSnapshot({count:0})
```

## Build-time config

plugin bundleIdentifier 기본 mainID.ExpoWidgetsTarget, groupIdentifier 기본 group.mainID다. main ios.bundleIdentifier도 없으면 group을 유도할 수 없어 prebuild가 실패한다. widgets[]는 별도 kind를 생성한다. name은 Swift identifier이고 createWidget name과 같아야 하며 displayName/description은 gallery 표시다.

ios.supportedFamilies는 systemSmall(2x2)/systemMedium(4x2)/systemLarge(4x4)/systemExtraLarge(iPad6x4)/accessoryCircular/Rectangular/Inline이다. ios.contentMarginsDisabled=false를 true로 바꾸면 padding 책임이 앱에 있다. top-level supportedFamilies/contentMarginsDisabled는 deprecated aliases다. ios.configuration은 title/description/parameters record를 설정한다. parameter는 title/type(string/number/boolean/enum)/default, enum은 values[{name, value}]가 필요하고 iOS17+ 사용자 edit 값은 environment.configuration으로 전달된다.

## Snapshot, timeline와 environment

updateSnapshot(props):void는 즉시 표시하는 단일-entry timeline, updateTimeline([{date:Date, props}]):void는 scheduled timeline을 저장하고 reload한다. getTimeline():Promise<entry[]>는 past/future 모두 반환한다. reload():void는 system refresh를 요청하지만 arbitrary background async code를 실행하는 API가 아니다.

WidgetEnvironment는 date/widgetFamily/configuration, optional colorScheme/light-dark, widgetRenderingMode(fullColor home/vibrant lock/accented iOS18+ tint), isLuminanceReduced(iOS16+), showsWidgetLabel, widgetContentMargins(top/bottom/leading/trailing iOS17+), levelOfDetail(simplified/default iOS26+)다. size별 layout과 Always-On brightness를 조정한다.

widgetsDirectory는 app-group shared file:// directory이며 config가 없으면 null이라고 설명된다(type 표시는 string이라 불일치). app sandbox image는 widget에서 읽지 못하므로 앱이 shared directory에 쓰고 path를 props로 전달한다. widget async download로 해결하지 않는다.

## Interaction

iOS17+ Button onPress의 반환값이 새 props로 persist/reload되며 앱 process가 없어도 동작한다. target을 지정하고 addUserInteractionListener(callback)→subscription.remove()로 현재 앱 state에 mirror할 수 있다. event는 source(widget name), target, timestamp, type='ExpoWidgetsUserInteraction'이다. listener는 앱 process가 살아있을 때만 실행하므로 widget update의 유일한 mechanism으로 쓰지 않는다.

## 출처

- [Expo Documentation, Widgets](https://docs.expo.dev/versions/latest/sdk/widgets)

## 관련 문서

- [[Expo-SDK-Live-Activities]]
