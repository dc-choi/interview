---
tags: [expo, expo-integrations, user-interface]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 번역, locale와 RTL"]
---

# Expo 번역, locale와 RTL

expo-localization은 user locale/calendar preference를 읽고 translation library는 문자열을 관리한다. 날짜/숫자/currency/plural/list formatting은 Hermes의 Intl API를 사용한다. locale 추정과 사용자의 실제 단위 선호가 항상 같지는 않아 중요한 단위는 앱에서 바꿀 수 있게 한다.

## Locale 읽기와 번역

getLocales/getCalendars는 preference 순서 배열이고 최소 하나가 있다. locale은 languageTag/languageCode/textDirection/regionCode, grouping/decimal separator, measurementSystem/currencyCode/currencySymbol 등을 준다. calendar는 calendar/timeZone/uses24hourClock/firstWeekday다. 미지원 property는 null일 수 있고 temperature unit을 정확히 읽는 API가 없어 추정이나 user selection이 필요하다.

```ts
const i18n = new I18n({ en:{welcome:'Hello'}, ko:{welcome:'안녕하세요'} });
i18n.locale = getLocales()[0].languageCode ?? 'en';
i18n.enableFallback = true;
```

i18n.t(key)로 문자열을 읽고 fallback에 missing key를 맡긴다. Android language 변경은 app을 restart하지 않아 AppState active 시 재조회/render해야 한다. iOS device language 변경은 app reset을 수행한다. Intl은 값을 format할 뿐 user currency/measurement preference를 알아내는 API는 아니다. source의 locale='default' 동작은 engine에서 확인하고 일반 ECMA402 default locale은 locale argument 생략/undefined로 쓰는 편이 이식성이 높다.

Lingui, fbtee, react-i18next와 Intlayer 선택에는 translation-management/context/JSX integration/extractor/bundle 부담을 비교한다. 라이브러리 선택보다 문자열과 문맥 관리가 실제 운영 비용이다.

## Native metadata와 per-app language

expo-localization plugin supportedLocales를 array 또는 ios/android별 list로 선언해 OS per-app language 선택에 노출한다. app config locales의 language identifier→JSON file mapping과 iOS CFBundleAllowMixedLocalizations=true로 display name/usage description을 번역한다. matching NS*UsageDescription을 locale JSON ios에 넣으면 prebuild가 InfoPlist.strings를 생성한다. SDK55+ iOS Localizable.strings object는 notification의 localized key에 쓸 수 있다. JS translation 수정과 binary metadata 변경을 구분한다.

## RTL 지원과 SDK 경계

SDK57 이전 source 설명은 native RTL 기본 enabled, Expo Go disabled다. 현재 guide의 SDK58+는 Expo Go에서도 default RTL, iOS supportedLocales 조건과 Router LocaleProvider를 설명한다. SDK57에 SDK58 contract를 그대로 적용하지 않는다. supportsRTL:false는 opt out, forcesRTL:true는 test/RTL전용 강제 설정이며 native binary 재생성이 필요하다.

I18nManager.allowRTL/forceRTL 변경과 reload는 runtime override지만 Expo Go launcher가 preference를 reset한다. render 안에서 무조건 reload하면 loop가 날 수 있어 direction 변경 조건과 effect/lifecycle을 관리한다. LocaleProvider는 navigator header/gesture/transition 방향이며 app content 방향을 별도로 정한다.

## Layout, text와 asset

start/end는 LTR의 left/right와 RTL의 right/left에 대응한다. 웹 root View의 dir를 locale textDirection 또는 manual detection으로 지정하고 text의 lang을 설정한다. Firefox/older browser는 textDirection이 없을 수 있다. RN textAlign left/right와 actual default alignment의 차이는 platform/layout에서 확인한다.

재사용 Text에서 default style을 넣을 때 `style={[defaultStyle, props.style]}` 순서를 사용한다. source의 style 선언 뒤 {...props}는 props.style이 전체 default를 덮고 배열 style을 object spread하는 문제도 있어 그대로 복제하지 않는다. 방향성 icon/asset은 I18nManager.isRTL에 맞춰 선택하되 모든 그림을 자동 mirror하지 않는다.

## 출처

- [Expo Documentation, Localization](https://docs.expo.dev/guides/localization)

## 관련 문서

- [[Expo-Integrations-Icons-Store-Assets]]
- [[Expo-Router]]
- [[Expo-Integrations-TypeScript-Lint]]
