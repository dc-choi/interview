---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Custom build 내장 단계 API"]
---

# Custom build 내장 단계 API

## 준비와 구성

기본 제공 함수 이름은 eas/로 시작한다. 전체 기본 절차가 목적이면 eas/build를 먼저 고려한다. 직접 구성할 때는 다음 단계의 입력 파일과 credential이 이전 단계에서 준비되는지 확인한다.

| 함수 | 계약과 순서 |
| --- | --- |
| eas/checkout | 소스를 복원한다. ref는 Git 기반 소스에서만 branch, qualified tag 또는 full SHA를 받는다. local/tarball 소스에는 적용되지 않는다. |
| eas/use_npm_token | NPM_TOKEN으로 private registry 접근용 .npmrc를 구성한다. 의존성 설치 전에 둔다. |
| eas/install_node_modules | 감지한 bun/npm/pnpm/Yarn으로 설치하며 monorepo를 지원한다. |
| eas/resolve_build_config | dependency 설치 뒤 config plugin 등을 반영해 설정을 평가한다. GitHub job/metadata도 갱신한다. |
| eas/get_credentials_for_build_triggered_by_github_integration | Deprecated. resolve_build_config로 대체한다. |
| eas/resolve_apple_team_id_from_credentials | iOS credential에서 apple_team_id를 출력한다. prebuild의 입력에 연결한다. |
| eas/prebuild | native 프로젝트 생성. clean 기본 false, iOS 서명 빌드에는 apple_team_id를 전달한다. |
| eas/configure_eas_update | 이미 Update를 설정한 앱의 runtime_version/channel을 구성한다. |

Git ref override는 eas/build보다 앞에 checkout을 두어 적용한다. 다른 ref를 빌드했다면 trigger의 SHA와 실제 checkout SHA를 혼동하지 않는다. `clean:true`는 native 변경 보존 전략을 확인한 뒤 사용한다.

## 서명, 버전과 compile

Android는 inject_android_credentials로 keystore/signing config를 주입하고 configure_android_version으로 version_code/version_name을 설정한다. run_gradle의 command를 생략하면 job 구성에 따라 결정되며 `:app:bundleRelease`처럼 명시할 수 있다.

iOS는 configure_ios_credentials로 target의 provisioning profile을 지정하고 configure_ios_version으로 build_number/app_version을 설정한다. build_configuration 기본은 development client에 Debug, 나머지에 Release로 결정된다. 버전 단계를 생략하면 native 생성 결과의 값을 사용하므로 remote version을 의도했다면 누락하지 않는다.

CocoaPods 설치 뒤 generate_gymfile_from_template로 Gymfile을 만들고 run_fastlane으로 ios 디렉터리의 fastlane gym을 실행한다. Gymfile 함수의 scheme/build_configuration/credentials/template/extra로 조절할 수 있으며 clean 기본값은 true다. credentials가 없으면 Simulator template을 사용한다. prebuild의 clean 기본값과 구분한다.

## Cache

restore_build_cache는 필수 key/path, 선택 restore_keys를 받는다. save_build_cache는 같은 key/path로 저장한다. prefix fallback은 정확한 dependency 일치와 다르므로 호환 조건을 key에 포함한다. 문서의 표현식 문법 혼용은 [[Expo-EAS-Custom-Build-Schema]]의 경계를 따른다.

## Artifact

find_and_upload_build_artifacts는 기본 위치와 buildArtifactPaths에서 app archive, 추가 artifact와 Xcode 로그를 찾아 업로드한다. upload_artifact는 path 또는 newline으로 구분한 glob 목록을 받는다.

Build job에서는 application-archive/build-artifact, 일반 custom job에서는 other 유형을 사용한다. 기본 유형은 build platform 유무에 따라 다르다. name/metadata로 일반 artifact를 식별하고 출력 artifact_id를 이후 download에 전달할 수 있다. ignore_error 기본 false다.

현재 build job에서는 각 artifact type 업로드가 한 번으로 제한된다. 자동 수집과 수동 업로드가 같은 type을 중복 사용하면 실패한다. 여러 파일을 한 upload로 묶거나 custom profile의 buildArtifactPaths와 수동 수집 범위를 정리한다. 서명 키, 환경 파일과 token을 glob에 포함하지 않는다.

## 출처

- [Expo Documentation, Custom build configuration schema](https://docs.expo.dev/custom-builds/schema)

## 관련 문서

- [[Expo-EAS-Custom-Build-Reference]]

- [[Expo]]
