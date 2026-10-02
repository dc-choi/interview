---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo iOS Universal Links와 AASA"]
---

# Expo iOS Universal Links와 AASA

## 도메인과 앱의 상호 승인

웹의 `/.well-known/apple-app-site-association` 파일(AASA)은 Team ID와 bundle ID, 처리할 path를 선언한다. 앱의 associated-domain entitlement는 같은 도메인을 선언한다. AASA는 파일 확장자 없이 HTTPS로 제공한다. Router 웹에서는 `public/.well-known/`에 둔다.

```json
{
  "applinks": {
    "apps": [],
    "details": [{
      "appID": "<TEAM_ID>.com.example.store",
      "paths": ["/product/*"]
    }]
  }
}
```

`appID`는 Team ID와 bundleIdentifier의 조합이다. optional `activitycontinuation.apps`는 Handoff, `webcredentials.apps`는 Shared Web Credentials를 연결한다. Universal Links만 필요할 때 서로 다른 capability를 무조건 추가하지 않는다.

## iOS13 이상 components 표현

`details`의 `appIDs` 배열로 여러 앱을 묶고 `components`로 path(`/`), query(`?`), fragment(`#`)와 `exclude:true`를 표현할 수 있다. 예를 들어 `/help/*`와 특정 query 길이를 요구하거나 `/help/website/*`를 web 전용으로 제외한다. 오래된 OS와 최신 표현을 함께 제공할 때는 최신 설정을 앞에 둔다. glob의 구체적 일치 조건은 Apple AASA format에서 확인하며 임의 정규식처럼 해석하지 않는다.

## app config와 signing

```json
{ "expo": { "ios": { "associatedDomains": ["applinks:example.com"] } } }
```

`applinks:` 뒤에 protocol이나 path를 붙이지 않는다. `applinks:https://example.com`은 올바른 형식이 아니다. EAS Build는 entitlement/capability 등록을 지원한다. EAS/CNG 없이 native를 유지하면 Developer Console의 Associated Domains capability와 `<app>.entitlements`의 `com.apple.developer.associated-domains`를 직접 구성한다.

AASA와 app config를 준비한 뒤 새 iOS binary를 설치해 OS 검증을 확인한다. 초기 URL과 실행 중 링크를 화면 routing에서 처리한다. 파일이 배포돼 있다는 사실만으로 entitlement/signing이 맞다는 결론을 내리지 않는다.

## 배포 cache와 크기

AASA의 uncompressed 크기 상한은 128KB다. iOS가 설치/업데이트 시 AASA를 가져오며 빈번하게 재조회하지 않으므로 서버 path 변경이 기존 설치에 즉시 반영되지 않을 수 있다. production 사용자 전체 반영을 계획할 때 App Store binary 업데이트도 고려한다.

개발에서는 HTTPS tunnel host를 AASA와 associatedDomains에 함께 넣고 development build로 검사할 수 있다. 실제 운영 도메인의 TLS/파일 응답과 Apple 검증 경로는 별도로 확인한다.

## Smart App Banner

미설치 사용자는 웹 콘텐츠로 이동할 수 있다. 설치 안내는 web `<head>`에 `<meta name="apple-itunes-app" content="app-id=<ITUNES_ID>" />`를 추가한다. Router static rendering은 `src/app/+html.tsx`에서 설정한다. `setup-safari`는 Apple 계정 리소스를 생성할 수 있는 실험적 도구이므로 단순 HTML 작성과 같은 read-only 작업으로 취급하지 않는다. banner 노출은 플랫폼/browser 조건의 영향을 받는다.

## 출처

- [Expo Documentation, iOS Universal Links](https://docs.expo.dev/linking/ios-universal-links)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
