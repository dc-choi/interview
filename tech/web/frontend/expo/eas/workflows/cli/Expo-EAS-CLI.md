---
tags: [expo, eas, workflows]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS CLI 실행과 프로젝트 관리"]
---

# EAS CLI 실행과 프로젝트 관리

## CLI 기준과 실행 방식

2026-10-01 공식 command reference는 EAS CLI 24.8.0 기준이다. EAS CLI는 cloud 서비스 제어 도구이며 프로젝트 expo 패키지의 `npx expo`와 다르다. 전역 설치 또는 `npx eas-cli@버전`으로 실행할 수 있다. CI는 검증한 버전을 고정한다.

```sh
npx eas-cli@24.8.0 whoami
npx eas-cli@24.8.0 project:info
npx eas-cli@24.8.0 status --json
```

--json은 지원 명령에서 stdout을 기계 판독용으로 만들고 진단은 stderr로 보낸다. 많은 명령이 비대화형을 포함하지만 모든 명령에서 동일하다고 가정하지 않는다. --non-interactive는 승인이나 credential 준비를 대신하지 않는다.

## 계정과 프로젝트

account:login/logout/view는 login/logout/whoami alias를 제공한다. Browser login이 기본이며 --no-browser 또는 --sso를 선택할 수 있다. account:audit는 cursor/limit으로 감사 기록, account:usage는 현재 billing cycle 사용량을 조회한다.

project:init(init)은 새 프로젝트를 만들거나 기존 ID를 연결한다. --force는 기존 project ID를 덮을 수 있으므로 account와 ID를 먼저 확인한다. project:new(new)는 디렉터리에 새 프로젝트를 만들며 package manager/SDK version을 지정한다.

project:info는 연결 정보, project:status(status)는 최근 build/dev build/workflow/submit/update snapshot이다. project:icon:set은 dashboard icon(PNG/JPEG 최대10MB)을 바꾸고 정사각형이 아니면 중앙 crop한다. browse --no-browser는 URL만 반환한다.

project:delete는 실제 원격 프로젝트 삭제다. 비대화형에서는 전체 @account/slug 확인값을 요구한다. 연결 해제나 로컬 파일 정리와 혼동하지 않는다. billing:subscribe/manage는 결제/관리 portal을 열 수 있고 --no-open은 URL만 표시한다.

## 진단과 탐색

config는 app/eas 설정을 평가하고 diagnostics는 환경 정보를 출력한다. help와 --nested-commands로 세부 명령을 확인한다. analytics는 CLI 수집 설정, autocomplete는 shell completion 설치 안내다.

목록의 기본 limit과 최대값은 명령마다 다르다. 첫 페이지가 전체라고 가정하지 말고 offset 또는 after cursor를 이어 읽는다. 조회 결과에 credential이나 사용자의 계정 정보가 포함될 수 있으므로 공개 문서에 원본을 그대로 저장하지 않는다.

## 출처

- [Expo Documentation, EAS CLI reference](https://docs.expo.dev/eas/cli)

## 관련 문서

- [[Expo-EAS-CLI-Reference]]

- [[Expo]]
