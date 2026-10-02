---
tags: [expo, eas, workflows]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS CLI 환경과 외부 연동"]
---

# EAS CLI 환경과 외부 연동

## 환경 변수 명령

env:set은 string/file, visibility, project/account scope와 environment를 지정한다. env:get/list는 조회이며 --include-sensitive/--include-file-content는 민감한 값을 실제 출력할 수 있다. env:delete는 대상 environment/name/scope를 확인한다.

env:pull은 기본 .env.local로 저장하고 env:push는 그 파일을 EAS에 전송한다. --force는 기존 값을 확인 없이 덮는다. env:exec는 다음처럼 positional environment를 사용한다.

```sh
eas env:exec production 'node -e "console.log(process.env.APP_VARIANT)"'
```

Environment usage guide의 --environment 예시와 CLI24.8 signature가 달라 여기서는 CLI reference를 따른다. 로컬 .env 파일과 EAS CLI의 config 평가/remote 변수 주입은 [[Expo-EAS-Environment-Usage]]에서 구분한다.

## Fingerprint와 device

fingerprint:generate는 build-profile 또는 environment를 선택해 플랫폼 hash를 만든다. fingerprint:compare는 hash/build-id/update-id 조합을 비교하며 로컬 config를 평가할 때 environment를 맞춘다.

device:create/list/view/rename/delete는 Apple device 등록 정보를 관리한다. apple-team-id와 UDID로 정확한 대상을 고른다. Device 삭제가 Apple의 연간 기기 한도를 즉시 복원한다고 가정하지 않는다.

## 외부 서비스 연결

integrations:asc:connect/status/disconnect는 App Store Connect 앱 연결을 관리한다. connect에 api-key-id/asc-app-id/bundle-id를 지정할 수 있다. Metadata push/submit credential과 event 연결은 각각 필요한 조건을 확인한다.

integrations:convex:connect는 team/project/region을 선택해 연결하고 dashboard/project/team으로 조회한다. project:delete/team:delete는 EAS의 연결 제거이지 외부 프로젝트 삭제라는 뜻은 아니다. team:invite는 이메일 초대를 발송하는 실제 동작이다.

integrations:posthog:connect는 region, session replay/error tracking과 개인 key를 설정한다. --overwrite는 기존 변수를 덮으며 dashboard --show-link의 URL에는 일회용 login token이 들어가므로 공유하지 않는다. disconnect는 EAS 연결을 제거한다.

integrations:supabase:connect는 SDK 설치와 공개 URL/key 작성까지 수행할 수 있다. --link는 기존 project, --environment는 primary 연결 후 별도 hosted 환경이며 서로 함께 쓰지 않는다. --reauth는 interactive 재인증이고 기존 외부 project는 유지한다. disconnect도 Supabase project와 EXPO_PUBLIC_SUPABASE_ 변수를 삭제하지 않는다. advisors는 security/performance 미해결 항목을 조회한다.

## Metadata와 webhook

metadata:lint는 로컬 설정 검증, pull은 스토어 정보를 가져오기, push는 실제 스토어 변경이다. webhook:create/list/view/update/delete는 BUILD/SUBMIT event callback을 관리하며 secret으로 Expo-Signature 검증을 구성한다. 키와 callback body를 공개 로그에 남기지 않는다.

## 출처

- [Expo Documentation, EAS CLI reference](https://docs.expo.dev/eas/cli)

## 관련 문서

- [[Expo-EAS-CLI-Reference]]

- [[Expo]]
