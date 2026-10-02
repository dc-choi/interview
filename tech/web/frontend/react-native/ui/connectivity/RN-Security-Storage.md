---
tags: [react-native, mobile, networking, security]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React Native 비밀값과 민감정보 저장

React Native 0.87 Security 기준. 앱 번들은 사용자 기기에서 조사할 수 있으므로 앱 코드와 환경변수에 넣은 secret을 서버 비밀값처럼 취급하지 않는다. 보안 수단은 데이터 민감도, 사용자 수와 피해 규모에 맞춰 선택한다.

## 앱 번들에 있는 값의 경계

`react-native-dotenv`, `react-native-config` 같은 도구는 환경별 API endpoint 등을 구성하는 데 유용하다. 앱에 포함되는 값을 숨겨 주는 비밀 저장소는 아니다.

제3자 API에 필요한 secret을 앱에서 직접 사용해야 하는 구조라면 앱과 리소스 사이에 서버 orchestration 계층을 두는 방법을 검토한다.

```text
앱 -> 자신의 서버 API -> secret을 이용한 외부 API 요청
```

서버나 serverless 함수가 secret을 보유하고 앱에는 필요한 결과를 반환한다. 서버 secret이 앱 번들처럼 공개된다는 문제를 줄이는 구조이며 서버 권한과 운영 보안까지 자동 보장하는 것은 아니다.

## persisted와 unpersisted

persisted 데이터는 디스크에 남아 재실행 때 읽을 수 있다. 오프라인 사용, 요청 감소, 재로그인 감소에 유리하지만 추출 대상이 늘어난다. 메모리에만 두면 디스크에 남는 사본을 줄일 수 있으나 앱이 종료되면 다시 확보해야 한다.

메모리만 쓴다는 사실로 실행 중 모든 공격에 안전하다고 보장하지 않는다. 보관할 필요가 없는 정보는 요청하고 저장하지 않는 선택도 검토한다.

## Async Storage의 용도

Async Storage는 커뮤니티가 유지하는 비동기 **비암호화** key-value store다. 앱별 sandbox를 사용하지만 암호화된 보안 저장소라는 뜻은 아니다.

| 용도 | 가이드의 구분 |
|---|---|
| 비민감 설정의 재실행 간 유지 | 적합 |
| Redux, GraphQL 상태 persistence | 민감정보 포함 여부를 먼저 확인 |
| 앱 전역 비민감 값 | 사용 가능 |
| access token, secret | 보안 저장 용도로 사용하지 않음 |

Redux에 민감 폼 값을 잠시 넣었다가 전체 state tree를 persist하면 의도와 다르게 디스크에 남는다. persistence 대상과 제외 대상을 데이터 단위로 정한다.

## 플랫폼 보안 저장소

React Native 코어에는 민감정보용 저장 기능이 번들돼 있지 않다. 플랫폼 기능이나 그 wrapper를 사용해야 한다.

| 플랫폼 기능 | 목적과 구분 |
|---|---|
| iOS Keychain Services | 토큰, 비밀번호, 인증서 등 작은 민감 데이터 |
| Android SharedPreferences | persistent key-value, 기본 암호화 아님 |
| Android Keystore | 암호 키를 보호하는 컨테이너, 임의 데이터 저장 API와 구분 |
| EncryptedSharedPreferences | RN 가이드가 소개하는 암호화 wrapper, 현재 deprecated 확인 필요 |

가이드의 라이브러리 후보는 `expo-secure-store`, `react-native-keychain`이다. 직접 bridge를 만들 수도 있지만 wrapper의 현재 플랫폼 지원과 저장 접근 조건을 확인하고 책임을 평가한다. 소개된 후보가 특정 프로젝트의 검증된 선택이라는 뜻은 아니다.

## Android 가이드와 현행 API의 차이

2026-10-01 대조한 Android Developers reference는 `EncryptedSharedPreferences`를 AndroidX Security Crypto 1.1.0에서 deprecated로 표시한다. RN Security 가이드의 옵션 소개를 새 프로젝트의 현행 기본 추천으로 그대로 사용하지 않는다. [Android Developers의 API 상태](https://developer.android.com/reference/androidx/security/crypto/EncryptedSharedPreferences)를 함께 확인한다.

이 deprecation을 토큰을 비암호화 SharedPreferences에 옮겨도 안전하다는 뜻으로 해석하지 않는다. 사용하는 wrapper가 실제로 어떤 backend와 key 관리 정책을 쓰는지 확인한 뒤 교체 방향을 정한다.

## 로그와 모니터링의 사본

민감정보는 저장소만 살펴보면 놓칠 수 있다. 토큰과 개인정보가 Sentry, Crashlytics 등 monitoring event, error context나 persisted 상태에 전송되는지 확인한다.

추가 점검 제안으로는 로그아웃 시 삭제 범위, backup 포함 여부, 기기 잠금과 생체 인증 접근 조건을 사용하는 보안 저장 라이브러리의 공식 문서로 대조하는 것이 있다. 이 조건들은 모든 wrapper가 동일하다고 검증한 사실이 아니다.

## 확인할 점

앱 번들의 환경값, persisted state, error payload를 데이터 흐름대로 확인한다. secret을 서버로 옮길지, 토큰을 어디에 저장할지, 정말 디스크에 남겨야 하는지를 구분한다. 특정 앱의 저장 안전성을 실행 검증한 문서가 아니다.

## 출처

- [React Native 0.87, Security](https://reactnative.dev/docs/security)
- [Android Developers, EncryptedSharedPreferences](https://developer.android.com/reference/androidx/security/crypto/EncryptedSharedPreferences)

## 관련 문서

- [[RN-Security-Authentication|인증 redirect와 PKCE]]
- [[RN-Security-Transport|전송 보호와 pinning]]
- [[RN-Networking|요청과 인증 제약]]
