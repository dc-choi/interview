---
tags: [expo, eas, workflows]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS CLI Build와 Submit 명령"]
---

# EAS CLI Build와 Submit 명령

## 생성과 검사

build는 platform/profile, local/output, wait, clear-cache, auto-submit 또는 auto-submit-with-profile을 받는다. --freeze-credentials는 비대화형 credential 변경을 막고 --refresh-ad-hoc-provisioning-profile은 managed iOS profile 갱신을 요청한다. 두 옵션의 목적을 구분한다.

build:configure는 프로젝트 설정을 만들고 credentials:configure-build는 같은 platform/profile의 서명 자료를 준비한다. credentials는 자료 관리 UI다. build:inspect의 archive는 업로드 파일, pre-build는 native compile 전, post-build는 실제 compile 후 상태를 남긴다. --force는 출력 디렉터리를 삭제하므로 새 경로로 검사한다.

## 조회와 실행

build:list는 platform/profile/status, app 식별자/버전, source SHA/fingerprint/runtime/channel로 좁힌다. build:view는 한 build, build:cancel은 실행 취소, build:delete는 기록 삭제다. 취소를 삭제와 같은 것으로 설명하지 않는다.

build:download의 --build-id는 fingerprint/platform/dev-client 검색 옵션과 상호 배타적이다. --all-artifacts는 app archive 외 로그/추가 artifact도 받는다. build:run은 id/latest/path/url 중 하나로 Emulator/Simulator artifact를 설치한다.

build:dev는 일치하는 fingerprint의 development client를 찾아 실행하거나 새로 만든다. 기본 profile은 development-simulator이고 --skip-build-if-not-found로 자동 build를 막을 수 있다. --skip-bundler는 Metro 시작만 생략한다.

## 버전과 재서명

build:version:get/set/sync는 remote version 조회/변경/native 동기화다. local source version과 remote version source를 먼저 확인한다. build:resign은 source-profile로 후보를 찾고 target-profile의 credential/environment를 적용한다. 새 UDID 등록만으로 기존 ad hoc 바이너리가 바뀌지는 않는다.

upload는 로컬 build를 EAS에 업로드하고 공유 링크를 만든다. 올린 바이너리의 platform/fingerprint와 접근 범위를 확인한다.

## 제출

submit(build:submit alias)은 latest/id/path/url 중 하나를 선택한다. 정확한 release에는 latest보다 검토한 build ID가 안정적이다. profile, groups(내부 TestFlight), what-to-test, auto-testflight-setup과 wait 옵션이 있다.

submit:list/view로 상태를 조회하고 retry는 실패 제출을 다시 요청한다. submit:cancel은 취소다. submit:status는 App Store live version과 TestFlight build 상태를 조회하는 명령이며 실제 지원 플랫폼을 확인한다. 모든 제출 명령의 성공을 스토어 심사 통과로 해석하지 않는다.

## 출처

- [Expo Documentation, EAS CLI reference](https://docs.expo.dev/eas/cli)

## 관련 문서

- [[Expo-EAS-CLI-Reference]]

- [[Expo]]
