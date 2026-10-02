---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Custom build의 알림과 PostHog 단계"]
---

# Custom build의 알림과 PostHog 단계

## Slack 알림

eas/send_slack_message는 message 또는 Block Kit payload 중 하나를 받는다. slack_hook_url을 지정하거나 기본 SLACK_HOOK_URL 환경 변수를 사용한다. webhook은 발송 권한을 가진 secret이므로 공개 설정과 로그에 넣지 않는다.

success()/failure()/always() 조건으로 발송 시점을 정할 수 있다. job URL, step.status_text와 error_text를 넣을 때 오류 본문에 비밀 값이 섞였는지 확인한다. 성공 메시지가 나갔다는 사실과 실제 배포 검증 완료를 구분한다.

## PostHog 연결과 권한

EAS의 PostHog integration 설정으로 프로젝트와 필요한 환경 변수를 연결한다. capture_event는 공개 project API key를 사용하지만 나머지 관리 함수는 personal API key를 사용한다. 개인 키를 EXPO_PUBLIC_ 변수에 넣으면 안 된다.

| 함수 | 주요 입력과 결과 |
| --- | --- |
| eas/posthog_capture_event | 필수 event, 선택 distinct_id/properties. distinct_id 생략 시 익명 이벤트이며 person profile을 만들지 않는다. |
| eas/posthog_flag_rollout | 필수 flag, active/rollout_percentage/payload 중 하나 이상. 비율은 정수 0~100이다. |
| eas/posthog_wait_for_metric | query의 첫 행 첫 열 숫자를 operator(lt/lte/gt/gte/eq)와 threshold로 비교한다. 만족한 value는 문자열 출력이다. |
| eas/posthog_wait_for_query | query의 첫 행 첫 열이 true 또는 0이 아닌 숫자일 때 통과한다. |
| eas/posthog_annotation | 필수 content, 선택 ISO 8601 date_marker로 timeline에 표시한다. |
| eas/posthog_upload_sourcemaps | bundle 생성과 같은 job에서 directory(기본 dist)의 source map을 업로드한다. |

Flag 변경은 catch-all 조건에 적용하며 없으면 첫 조건을 사용한다. 다른 targeting 조건을 없애 전체 사용자 비율을 단순 고정하는 동작으로 해석하지 않는다. multivariate payload는 variant를 지정할 수 있다.

## 지표 대기와 오류 정책

두 wait 함수의 기본 timeout은 600초, interval은 30초다. query:read 권한이 필요하며 ignore_error를 지원하지 않는다. timeout이나 읽을 수 없는 query는 실패한다. 한 번 임계값을 통과한 결과가 일정 시간 안정성을 증명하는 것은 아니므로 query의 관찰 구간을 명시한다.

Flag 함수에는 feature_flag:read/write, annotation에는 annotation:write가 필요하다. ignore_error=true여도 이 함수들의 권한 오류는 실패하며 flag의 범위 밖 비율도 실패한다. capture_event의 전송 실패는 선택적으로 무시할 수 있다.

Source map 단계는 PostHog Metro 설정으로 bundle의 chunk ID를 맞추고 `expo export --source-maps` 결과를 사용한다. CLI가 인증 오류를 다른 실패와 구별하지 못하므로 이 단계의 ignore_error=true는 권한 오류까지 숨길 수 있다. 실패를 허용할 필요가 명확하지 않다면 기본 false를 유지한다.

## 출처

- [Expo Documentation, Custom build configuration schema](https://docs.expo.dev/custom-builds/schema)

## 관련 문서

- [[Expo-EAS-Custom-Build-Reference]]

- [[Expo]]
