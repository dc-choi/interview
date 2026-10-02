---
tags: [expo, react-native, core]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Compose 컴포넌트와 modifier 확장"]
---

# Compose 컴포넌트와 modifier 확장

Expo Modules API로 Kotlin Compose 컴포넌트와 modifier를 작성하면 `@expo/ui`의 Host, 테마, 자식, modifier 이벤트와 연결할 수 있다. custom native 코드는 Expo Go에 실려 있지 않으므로 앱의 development build가 필요하다. 이 문서는 구현 절차를 설명하며 현재 Vault에 네이티브 모듈을 설치하거나 생성하지 않는다.

## 빌드 연결

로컬 Expo module scaffold를 만든 뒤 Android Gradle에서 Compose compiler plugin classpath와 `org.jetbrains.kotlin.plugin.compose`를 연결하고 `buildFeatures { compose true }`를 활성화한다. `expo-ui` 프로젝트가 있으면 project 의존성, 없으면 `expo.modules.ui:expo.modules.ui` Maven 의존성을 사용한다. 원문 SDK57 예시는 foundation/ui 1.10.6, material3 1.5.0-alpha17을 사용한다. 프로젝트의 Kotlin/Compose 의존성과 맞춰 검토하며 해당 예시 숫자를 독립적인 최신 버전 권장으로 해석하지 않는다.

## Props와 React 자식

props data class에 `@OptimizedComposeProps`를 붙이고 `ComposeProps`를 구현한다. modifier를 받을 때 `modifiers: ModifierList = emptyList()`를 포함한다. content는 `FunctionalComposableScope`의 `@Composable` extension으로 정의한다.

```kotlin
@OptimizedComposeProps
data class MyViewProps(
  val title: String = "",
  val modifiers: ModifierList = emptyList()
) : ComposeProps

@Composable
fun FunctionalComposableScope.MyViewContent(props: MyViewProps) {
  Column(modifier = ModifierRegistry.applyModifiers(
    props.modifiers, appContext, composableScope, globalEventDispatcher
  )) {
    Text(props.title, style = MaterialTheme.typography.titleMedium)
    Children(UIComposableScope())
  }
}
```

모듈 `Name("MyUi")`와 `ExpoUIView<MyViewProps>("MyView") { Content { props -> MyViewContent(props) } }`로 등록한다. JS에서는 `requireNativeView('MyUi', 'MyView')`로 찾는다. module 이름과 view 이름을 각각 맞춘다.

```tsx
interface MyViewProps extends PrimitiveBaseProps {
  title: string;
  children?: React.ReactNode;
}
const Native = requireNativeView<MyViewProps>('MyUi', 'MyView');
function MyView({ modifiers, ...props }: MyViewProps) {
  return <Native modifiers={modifiers}
    {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
    {...props} />;
}
```

`applyModifiers`가 네이티브 modifier 적용을 담당하고 JS의 `createViewModifierEventListener`가 clickable/onVisibilityChanged 같은 이벤트를 연결한다. 크기와 스타일만 동작한다고 이벤트 연결까지 검증된 것은 아니다. 자식은 `Children(UIComposableScope())`를 통해 React에서 넘긴 Compose 자식을 렌더한다.

## Custom modifier 수명과 타입

매개변수 record는 `@OptimizedRecord`, `Record`, `@Field`로 선언한다. `recordFromMap<Params>(map)`로 JS 설정을 변환하고 native Modifier를 반환한다. Android Color를 Compose Color로 바꾸려면 `expo.modules.ui.compose` extension을 import한다. 숫자 dp 변환도 native 구현에서 수행한다.

```kotlin
OnCreate {
  ModifierRegistry.register("customBorder") { map, _, _, _ ->
    customBorderModifier(recordFromMap<CustomBorderParams>(map))
  }
}
OnDestroy { ModifierRegistry.unregister("customBorder") }
```

등록 callback은 raw map, ComposableScope, AppContext, event dispatcher를 받는다. weight/align처럼 scope에 의존하는 modifier는 scope도 사용한다. OnDestroy에서 등록을 지워 module reload 뒤 factory가 남지 않도록 한다.

```tsx
export const customBorder = (params: {
  color?: ColorValue; width?: number; cornerRadius?: number;
}) => createModifier('customBorder', params);
```

JS 생성 이름과 Registry 등록 이름을 일치시키고 module entry에서 export한다. 이후 기존 Column/Text 등에도 `modifiers={[paddingAll(20), customBorder({ width: 3 })]}`로 적용할 수 있다. 순서에 따른 레이아웃 의미는 내장 modifier와 같으므로 API를 늘릴 때도 배치와 이벤트 동작을 함께 검토한다.

## 출처

- [Expo Documentation, Custom Jetpack Compose components](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/extending)

## 관련 문서

- [[Expo-Compose-Modifiers-Layout]]
- [[Expo-Compose-Host]]
