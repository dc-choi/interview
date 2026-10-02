---
tags: [expo, eas, operations]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Metadata 정적 설정과 동적 설정"]
---

# Metadata 정적 설정과 동적 설정

## 파일 선택

기본은 프로젝트 root의 store.config.json이다. eas.json의 submit.<profile>.ios.metadataPath로 다른 위치나 store.config.js를 지정한다.

```json
{
  "configVersion": 0,
  "apple": {
    "info": {
      "ko": {
        "title": "예제 앱",
        "privacyPolicyUrl": "https://example.com/privacy"
      }
    }
  }
}
```

이는 구조 예시이며 실제 제출에 필요한 정보 전체를 채운 설정은 아니다. App Store의 현재 필수 항목과 앱 내용에 맞춰 추가한다.

## Dynamic config

store.config.js는 Node.js에서 object, synchronous function 또는 async function을 export한다. 외부 번역 서비스 값을 가져오면 완료를 기다린 뒤 검증하고 동기화한다. 서비스 key는 환경 변수로 읽고 소스에 저장하지 않는다.

metadata:pull은 JavaScript를 수정하지 못한다. 같은 이름의 JSON 파일을 만들므로 dynamic 파일에서 그 JSON을 import하여 계산값을 더할 수 있다. 외부 서비스 실패 때 빈 번역을 정상 값처럼 push하지 않도록 오류를 처리한다.

## 출처

- [Expo Documentation, Configuring EAS Metadata](https://docs.expo.dev/eas/metadata/config)

## 관련 문서

- [[Expo-EAS-Metadata]]

- [[Expo]]
