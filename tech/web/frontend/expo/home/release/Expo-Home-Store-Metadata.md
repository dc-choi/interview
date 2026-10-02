---
tags: [expo, react-native, release]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo EAS Metadata와 스토어 정보"]
---

# Expo EAS Metadata와 스토어 정보

## Metadata 책임

EAS Metadata는 store listing 정보를 config로 관리하고 알려진 제한을 CLI에서 점검한다. 2026-10-01 기준 beta이고 Apple App Store만 지원한다. breaking changes 가능성을 고려하며 Google Play listing과 screenshot 처리를 동일 지원으로 가정하지 않는다.

EAS Submit은 binary를 업로드하고 Metadata는 별도 store information을 관리한다. automated validation이 store review 승인이나 모든 정책 준수를 보장하지 않는다.

## Store config

project root의 `store.config.json`은 versioned schema를 사용한다.

```json
{
  "configVersion": 0,
  "apple": {
    "info": {
      "en-US": {
        "title": "Example App",
        "subtitle": "A useful app",
        "description": "Application description",
        "keywords": ["example", "app"],
        "marketingUrl": "https://example.com/promo",
        "supportUrl": "https://example.com/support",
        "privacyPolicyUrl": "https://example.com/privacy"
      }
    }
  }
}
```

`configVersion`은 incompatible schema 변화 구분에 사용한다. locale별 정보와 실제 support/privacy URLs를 준비한다. Expo Tools extension은 autocomplete, suggestions와 warning을 제공한다. static/dynamic config와 전체 schema는 Metadata reference를 확인한다.

## Upload 단계

새 binary를 먼저 제출하고 store processing이 끝난 뒤 `eas metadata:push`를 실행한다. configuration 오류가 있으면 warning을 확인하고 필요한 수정을 적용한다. 가능한 부분을 upload하는 동작이 있으므로 command success만으로 모든 locale/field가 갱신되었다고 보장하지 않는다.

변경한 store config는 같은 push 명령으로 다시 전달할 수 있다. 실제 App Store Connect의 적용 결과와 심사 상태를 확인하고 문구/URLs에 secret이나 공개하면 안 되는 PII를 넣지 않는다.

## 출처

- [Expo Documentation, App stores metadata](https://docs.expo.dev/deploy/app-stores-metadata)

## 관련 문서

- [[Expo-Home-Release-Build]]
