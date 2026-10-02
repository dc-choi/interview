---
tags: [expo, eas, workflows]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS 환경 변수 관리와 제한"]
---

# EAS 환경 변수 관리와 제한

## 생성과 동기화

Dashboard의 project/account 환경 변수에서 이름, 값, environment, visibility를 정한다. CLI는 env:set으로 생성/갱신하고 env:list로 목록을 조회한다.

```sh
eas env:set --name EXPO_PUBLIC_API_URL --value https://api.example.com --environment production --visibility plaintext
eas env:list --environment production
eas env:pull --environment development
```

실제 secret을 command argument에 적으면 shell history/process 기록에 남을 수 있으므로 공개 예시를 비밀 값 입력 방식으로 그대로 복제하지 않는다. pull은 읽을 수 있는 값만 로컬 파일에 저장한다. 생성한 .env 파일은 Git에서 제외하고 잘못된 production 값이 개발 환경을 덮지 않았는지 확인한다.

## File 변수

빌드에서 GOOGLE_SERVICES_JSON 같은 file 변수는 임시 파일 경로로 제공된다. app.config에서 `process.env.GOOGLE_SERVICES_JSON ?? './google-services.json'`처럼 로컬 대체 파일을 사용할 수 있다. 대체 파일도 실제 존재해야 하며 공개 저장소에 올릴 수 있는 내용인지 따로 판단한다.

## 한도와 custom environment

2026-10-01 문서 기준 secret 값은 최대 32 KiB, 나머지 visibility 값은 최대 4 KiB다. 계정당 account 변수 150개, 앱별 project 변수 200개, custom environment는 프로젝트당 10개다.

Custom environment 생성은 Production/Enterprise plan에 제공된다. 이름은 3~100자이며 문자, 숫자, underscore/hyphen을 쓴다. 해당 environment에 변수가 적어도 하나 연결되어 있어야 선택 목록에 나타난다. 계획 이름/한도는 사용 시점의 정책을 다시 확인한다.

## 누락 진단

선택한 environment와 scope, visibility, 로컬 평가/remote 실행 중 어느 단계인지 먼저 확인한다. 변수 확인을 위해 전체 env를 로그에 찍지 않는다. SDK 57 Update에는 environment를 명시하고 Build profile env가 자동으로 Update에 전달된다고 가정하지 않는다.

## 출처

- [Expo Documentation, Create and manage environment variables in EAS](https://docs.expo.dev/eas/environment-variables/manage)
- [Expo Documentation, Frequently asked questions about environment variables in EAS](https://docs.expo.dev/eas/environment-variables/faq)

## 관련 문서

- [[Expo-EAS-Configuration]]

- [[Expo]]
