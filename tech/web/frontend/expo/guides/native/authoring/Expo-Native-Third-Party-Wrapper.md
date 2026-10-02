---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["서드파티 native 라이브러리 감싸기"]
---

# 서드파티 native 라이브러리 감싸기

## 공통 API를 먼저 정의

radial chart 예제는 Android MPAndroidChart와 iOS DGCharts를 각각 사용하면서 JS에는 `data: {color: string, percentage: number}[]`와 style을 받는 하나의 view를 제공한다. local 모듈 또는 standalone 모듈 둘 다 가능하다. 플랫폼 library의 함수가 유사하더라도 값의 단위, 색 변환, null과 이벤트 의미를 공통 API에 맞춘다.

Android native dependency는 module의 build.gradle, iOS dependency는 module podspec에 선언한다. 앱의 package.json만 수정해서 platform SDK가 추가되는 것은 아니다.

## Binary dependency 경로

SDK 52 이상에서 Android `.aar`은 module의 `android/libs`에 두고 autolinking의 Gradle project로 구성한 뒤 `${project.name}$` 접두사로 dependency를 참조하는 방식이다. SDK 51 이하의 flat directory repository 예제를 최신 기본 방식으로 사용하지 않는다. 원문 markdown snapshot의 일부 dependency 설정은 interactive code block이 비어 있으므로 실제 AAR project 설정은 현재 module/autolinking schema와 대조한다.

iOS `.framework`/`.xcframework`는 podspec의 `vendored_frameworks`로 선언한다. pattern은 podspec 상대 경로이며 `..`로 부모 경로를 탐색하지 못한다. framework를 ios/하위에 두고 Swift source는 ios/src 등으로 분리하여 `source_files` pattern이 framework 내부 파일을 포함하지 않도록 한다.

## Native view 구현

| 기능 | Android | iOS |
|---|---|---|
| chart 보관 | ExpoView의 PieChart child | ExpoView의 PieChartView child |
| layout | MATCH_PARENT LayoutParams | layoutSubviews에서 bounds |
| data parsing | `Series: Record`, @Field color/percentage | Swift `Series: Record`, UIColor/Double |
| 값 반영 | PieEntry/PieDataSet/PieData, invalidate | PieChartDataEntry/PieChartDataSet, chart.data |
| prop 처리 | Prop data에서 setChartData | 동일 |

Android 예제는 Color.parseColor, iOS는 UIColor converter를 사용한다. 임의의 malformed 색 문자열, 음수 값이나 합계가 1이 아닌 입력의 허용 여부는 wrapper contract에서 정한다. 원문 percentage 값 0.5/0.2/0.3은 series weight로 전달되며 입력 정규화가 자동으로 제공되는 것은 아니다.

web wrapper는 Not implemented 표시만 제공한다. web chart 구현이 있다는 뜻으로 문서화하지 않는다. native dependencies와 Swift/Kotlin 변경 후 두 플랫폼 앱을 다시 빌드한다.

## 출처

- [Expo Documentation, Wrap third-party native libraries](https://docs.expo.dev/modules/third-party-library)

## 관련 문서

- [[Expo-Native|Expo native 모듈과 알림]]
