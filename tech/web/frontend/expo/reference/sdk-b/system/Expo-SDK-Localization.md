---
tags: [expo, expo-sdk, system]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK Locale와 Calendar 설정"]
---

# Expo SDK Locale와 Calendar 설정

expo-localization은 OS language/region/calendar 설정을 읽는다. translation dictionary와 RTL 앱 설계는 [[Expo-Integrations-Localization]]을 재사용한다. npx expo install expo-localization, getLocales/getCalendars/useLocales/useCalendars를 import한다. Android/iOS/tvOS/web, Expo Go를 지원하며 config plugin 설정은 binary rebuild가 필요하다.

## 조회와 변경

getLocales():[Locale,...Locale[]], getCalendars():[Calendar,...Calendar[]]는 synchronous이고 최소 1항목을 보장한다. locale은 사용자 preference 순서, calendar는 현재 한 항목이지만 future list를 허용하는 계약이다. hooks는 OS 설정 변경 시 rerender한다. iOS 실행 중 synchronous 결과는 고정이고 Android는 앱 restart 없이 설정을 바꿀 수 있으므로 foreground 진입시 다시 읽는다.

```ts
const [locale] = getLocales();
const [calendar] = getCalendars();
const number = new Intl.NumberFormat(locale.languageTag).format(1234.5);
```

## Locale field

languageTag는 BCP47, languageCode/regionCode/languageRegionCode/languageScriptCode는 nullable이다. textDirection은 ltr/rtl이다. decimalSeparator/digitGroupingSeparator는 format 힌트, measurementSystem은 metric/us/uk|null, temperatureUnit celsius/fahrenheit|null이다.

iOS currencyCode/currencySymbol/regionCode는 device Region 설정, languageCurrencyCode/languageCurrencySymbol/languageRegionCode는 현재 preferred language에 연결된다. Android languageCurrency 값은 currency 값과 같으며 locale별 값이다. 국제화에는 currencyCode/regionCode를 우선한다. web currency/measurement는 null이다. locale에서 사용자의 unit preference를 확정할 수 없으므로 table lookup은 추론으로 취급하고 필요하면 사용자가 선택하게 한다.

## Calendar field

calendar는 Unicode CalendarIdentifier|null, timeZone은 string|null, uses24hourClock은 boolean|null, firstWeekday는 1Sunday..7Saturday|null이다. browser Intl hourCycle/weekInfo 부재면 null일 수 있다. timeZone은 IANA 또는 GMT offset 문자열일 수 있다.

GREGORIAN/GREGORY는 모두 gregory alias다. buddhist/chinese/coptic/dangi/ethioaa/ethiopic/hebrew/indian/islamic 계열/islamic-umalqura/iso8601/japanese/persian/roc 등 enum을 제공하지만 iOS는 dangi/islamic-rgsa를 구현하지 않는다. source ROC 설명의 Arabic calendar 표기는 enum value roc의 실제 의미를 증명하지 않으므로 그대로 학습 사실로 복제하지 않는다.

## 출처

- [Expo Documentation, Localization](https://docs.expo.dev/versions/latest/sdk/localization)

## 관련 문서

- [[Expo-Integrations-Localization]]
