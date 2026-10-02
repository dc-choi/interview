---
tags: [expo, testerarmy, e2e, eas, testing]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
aliases: ["Expo TesterArmy Hosted Testing"]
---

# Expo의 호스팅 테스트와 PR 탐색

TesterArmy는 클라우드 Android Emulator/iOS Simulator에서 저장된 테스트와 탐색 agent를 실행하는 플랫폼이다. 로컬 오픈소스 e2e 프레임워크의 실행 환경, 인증과 결과 연동을 그대로 적용하지 않는다.

## 테스트 계약과 앱 산출물

사전 조건은 테스트가 들어 있는 TesterArmy mobile project/test group, EAS와 연결된 GitHub 저장소와 TesterArmy GitHub integration이다. Dashboard에서 테스트를 먼저 실행해 확인한다. GitHub integration이 없으면 PR check/comment를 게시할 수 없다.

2026-10-02 가이드 기준 Android `.apk`와 iOS Simulator `.app`을 받으며 `.aab`나 device `.ipa`를 받지 않는다. Android package 식별자도 필요하다.

```json
{
  "build": {
    "testerarmy-ios-simulator": { "ios": { "simulator": true } },
    "testerarmy-android-apk": { "android": { "buildType": "apk" } }
  }
}
```

환경 변수는 `TESTERARMY_API_KEY`, `TESTERARMY_PROJECT_ID`, `TESTERARMY_GROUP_ID`다. API key는 EAS Secret으로 두고 `EXPO_PUBLIC_` prefix를 붙이지 않는다. `TESTERARMY_DYNAMIC_AGENT_ENABLED`는 탐색 agent를 끄는 선택 변수이며 가이드의 기본은 true다.

## Build, upload, test의 연결

각 플랫폼에서 build job, artifact download/upload job, test job을 연결한다. Upload의 JSON `uploadedAppId`를 job output으로 전달하고 test의 `--app-id`로 사용한다. 업로드 성공과 테스트 완료는 별도 단계다.

`testerarmy ci`에는 test group/project/platform/app ID와 commit SHA를 전달한다. PR 실행에는 PR number도 주어 check와 comment를 연결한다. main push는 commit check를 연결한다. 공식 예제의 timeout/poll interval은 각각 1,800,000ms와 10초이며 업무상 통과 판정과 별개의 대기 설정이다.

`--delete-app-after-run`은 테스트 뒤 업로드 앱 정리를 요청한다. 업로드 시 `--remove-after 86400` 같은 만료 설정은 후속 정리를 위한 별도 계약이다. 결과 JSON과 실패 증거는 재현과 검토에 사용할 수 있도록 보존 정책을 정한다.

## Native fingerprint와 repack

JavaScript만 바뀌어도 native build를 매번 할 필요는 없다. Fingerprint job으로 플랫폼별 native hash를 계산하고 같은 profile/hash의 기존 build를 조회한다. 있으면 repack으로 현재 JavaScript bundle을 넣고, 없으면 새 build를 만든다.

| 의존 관계 | 의미 |
|---|---|
| `needs` | 필수 선행 job 결과를 기다린다. |
| `after` | build/repack 대안이 끝난 뒤 실행하는 연결에 사용한다. |
| 조건부 build ID 선택 | 실행된 대안의 산출물을 upload에 넘긴다. |

한 대안이 skip되는 분기에서는 실제 나온 build ID를 조건으로 확인한다. 두 경로 모두 성공했다고 가정하거나 skip된 job output만 참조하지 않는다.

Fingerprint job의 environment는 build profile의 environment와 맞춘다. 공식 가이드의 fingerprint job은 CNG만 지원하므로 `android`/`ios`를 커밋하는 프로젝트는 단순 build 흐름을 사용한다. Repack은 native 변경을 새 빌드 없이 적용하는 수단이 아니다.

## PR 탐색 agent의 범위

탐색 agent는 PR에서만 실행한다. PR title/description/changes를 읽고 테스트 단계를 작성해 업로드 앱에서 수행하며 단계별 결과와 영상을 PR comment에 반영한다. 저장된 테스트 실행과 변경 기반 탐색을 각각 관찰한다.

PR metadata를 workflow `env`로 전달하고 shell에서는 quoted variable/argument array로 CLI에 전달한다. PR 본문을 shell script에 직접 삽입하면 외부 입력이 실행 코드가 될 수 있으므로 command와 data의 경계를 유지한다.

`TESTERARMY_DYNAMIC_AGENT_ENABLED=false`이면 탐색만 건너뛸 수 있다. 사용자에게 보이는 변경이 없는 docs/config PR은 플랫폼별로 Tests skipped와 이유가 표시될 수 있다. Skip은 앱을 실제로 시험해 통과했다는 의미가 아니다.

TesterArmy check는 기본적으로 merge를 막지 않는다. 배포 gate로 쓰려면 저장소의 required checks와 실패/skip 정책을 명시적으로 설정하고 실제 동작을 검증한다. PR 설명에 테스트 단계를 포함하는 지침을 추가하는 선택지도 있지만, 모델이 작성한 단계만으로 요구사항 검증이 끝나지 않는다.

## 선택 기준

로컬에서 locator와 assertion을 직접 작성하고 trace replay를 제어하려면 e2e가 맞는다. 호스팅 기기, test group과 PR comment/check 연동이 필요하면 TesterArmy 플랫폼 계약을 확인한다. 어느 쪽도 앱 상태 초기화, test account 관리와 backend 결과 검증을 자동으로 대신하지 않는다.

## 출처

- [Expo Documentation, Using TesterArmy](https://docs.expo.dev/guides/using-testerarmy) — 2026-10-01 수정본을 2026-10-02 대조

## 관련 문서

- [[Expo-Integrations-E2E]]
- [[Expo-EAS-Workflows]]
- [[Expo-EAS-Repack]]
