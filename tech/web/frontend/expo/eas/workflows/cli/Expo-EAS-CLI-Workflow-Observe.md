---
tags: [expo, eas, workflows]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Workflow와 운영 지표 CLI"]
---

# Workflow와 운영 지표 CLI

## Workflow 실행과 조회

workflow:create는 build/update/deploy/custom template을 생성한다. 이름만 주면 placeholder이며 --skip-validation은 schema 검증을 생략한다. validate는 .yml/.yaml과 연결된 custom function을 검사한다.

workflow:run FILE은 기본적으로 로컬 프로젝트를 package/upload한다. --ref를 쓰면 지정 Git ref로 실행한다. -F로 입력을 주며 wait 기본false다. 따라서 명령 종료만으로 원격 작업 완료를 판단하지 않는다.

workflow:runs/status/view/logs로 run ID와 job 결과를 추적한다. logs는 run/job ID를 받으며 non-interactive에서는 모든 step을 출력한다. cancel은 실행 취소이고 insights는 workflow/ref/status/trigger/기간별 지표다.

workflow:insights:maestro는 PASSED(첫 시도 통과)/FLAKY/FAILED, tag/search/sort 또는 단일 flow history를 조회한다. --flow는 overview filter/sort 옵션들과 함께 쓸 수 없다. 재시도 후 통과를 처음부터 통과한 결과에 섞지 않는다.

## Observe 명령

| 명령 | 조회 대상 |
| --- | --- |
| observe:errors | fingerprint별 오류 group, fingerprint 지정 시 개별 stack occurrence |
| observe:event ID | 한 metric/log/error event |
| observe:events [NAME] | 이름별 건수 또는 이름의 개별 event, all-events는 전체 event 목록 |
| observe:metrics [METRIC] | 개별 성능 sample, slowest/fastest/newest/oldest 정렬 |
| observe:metrics-summary | 앱 버전별 min/median/max/average/p80/p90/p99/eventCount |
| observe:routes | route별 cold/warm TTR/TTI와 count |
| observe:session [ID] | 한 session의 metric/log timeline |
| observe:versions | 앱 버전과 build/update 상세 |

Platform의 apple은 iOS/iPadOS/tvOS/macOS를 묶는다. project-id/environment/app-version/build-number/update-id, 기간과 cursor를 지원하는 명령에서 필요한 범위를 고른다. days와 start/end는 동시 사용하지 않는다. 순위나 평균만 보고 다른 기기/버전의 표본을 직접 비교하지 않는다.

## TestFlight 피드백

testflight:crashes와 testflight:feedback은 crash log와 screenshot 피드백을 조회한다. ID 또는 App Store Connect API URL을 사용할 수 있고 workflow beta_feedback event와 연결할 수 있다. bare ID가 다른 유형이면 --type을 지정한다.

반환된 screenshot URL, 댓글과 device 정보에는 개인정보가 있을 수 있다. 분석에 필요한 범위만 익명화해 문서에 남긴다. API key를 선택하는 submit profile이 올바른 앱을 가리키는지 먼저 확인한다.

## 출처

- [Expo Documentation, EAS CLI reference](https://docs.expo.dev/eas/cli)

## 관련 문서

- [[Expo-EAS-CLI-Reference]]

- [[Expo]]
