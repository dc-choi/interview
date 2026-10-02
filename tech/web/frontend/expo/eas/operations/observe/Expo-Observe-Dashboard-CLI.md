---
tags: [expo, eas, operations]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Observe dashboard와 CLI 조사"]
---

# Observe dashboard와 CLI 조사

## Dashboard 조사 순서

Startup, update, events, navigation과 errors에서 플랫폼, app version, environment와 기간을 먼저 맞춘다. 기본 화면은 모든 environment, 최근 14일이다. median과 p90/p99, 표본 수를 함께 보고 느린 event의 session/device 조건을 확인한다.

Release marker는 가까운 시점끼리 묶일 수 있다. 최신/이전 release 비교와 필터한 모집단은 구분한다. 시간상 함께 나타났다는 이유만으로 regression 원인을 확정하지 않는다.

## CLI 명령 계약

인증된 프로젝트 디렉터리 또는 --project-id로 조회한다. JSON은 non-interactive를 포함하며 권한/plan 제한은 오류로 반환한다. 설치한 CLI --help를 기준으로 flags를 확인한다.

| 명령 | 주요 입력과 결과 |
| --- | --- |
| observe:metrics-summary | --metric 반복, --stat(min/median/max/average/p80/p90/p99/eventCount). version별 집계 |
| observe:metrics | metric은 positional argument. --sort oldest/newest/slowest/fastest, --limit 기본10/최대100, --after cursor |
| observe:routes | --metric nav_cold_ttr/nav_warm_ttr/nav_tti, route pattern별 집계. 기본50/최대200 |
| observe:session | session ID positional. ID가 없으면 interactive picker, JSON에서는 ID 필수 |
| observe:events | event name 또는 --all-events, 둘은 함께 못 쓴다. 생략하면 event별 개수 |
| observe:versions | app version/build/update ID 계층과 event 수 |

기본 조회 기간은 60일이다. --days와 --start/--end를 함께 쓰지 않는다. session ID를 지정하면 picker용 --event-name/--sort/기간 flags를 함께 쓰지 않는다. session은 이미 한 실행을 가리키므로 --platform도 없다.

```sh
eas observe:metrics tti --sort slowest --days 7 --json
eas observe:routes --metric nav_tti --days 7
eas observe:session SESSION_ID --json
```

위 SESSION_ID는 실제 조회 결과의 sessionId로 바꾼다. Nav metric의 CLI 이름은 nav_ prefix를 포함한다. integration 문서의 cold_ttr event 이름과 혼동하지 않는다. route 페이지는 플랫폼별 pagination이며 다음 cursor도 해당 플랫폼에 적용한다.

## Update와 누락 진단

expo-updates와 Observe가 함께 있으면 download time을 자동 수집한다. update별 dashboard는 unique installations, median/p90과 최초 다운로드 시각을 보여 준다. 최초 다운로드 시각은 publish 시각이 아니다. CLI summary는 app version별 update_download 집계다.

기록이 없으면 새 native build에 library가 포함됐는지, project ID, debug 전송, sampling과 서버 ingestion을 확인한다. TTR은 root HOC, TTI는 실제 markInteractive 실행 여부를 확인한다. private preview expo-eas-observe에서 전환할 때 package/import/root wrapper를 바꾸고 재빌드해야 한다.

## 출처

- [Expo Documentation, EAS Observe dashboard](https://docs.expo.dev/eas/observe/dashboard)
- [Expo Documentation, Querying with EAS CLI](https://docs.expo.dev/eas/observe/eas-cli)
- [Expo Documentation, EAS Update download performance](https://docs.expo.dev/eas/observe/eas-update)
- [Expo Documentation, Troubleshooting EAS Observe](https://docs.expo.dev/eas/observe/reference/troubleshooting)

## 관련 문서

- [[Expo-Observe]]

- [[Expo]]
