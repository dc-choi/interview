---
tags: [expo, eas, workflows]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Workflow Submit TestFlight Update Deploy"]
---

# Workflow Submit TestFlight Update Deploy

## Submit와 TestFlight

submit은 build_id가 필수이고 submit profile 기본은 production이다. groups는 내부 TestFlight 그룹이다. 출력은 apple_app_id/ios_bundle_identifier/android_package_id이며 스토어 공개 출시가 완료됐다는 뜻은 아니다.

testflight는 build_id와 asc_build_id 중 정확히 하나를 받는다. build_id는 EAS의 store iOS build를 업로드하며 profile과 처리 대기 timeout(기본 1800초)을 설정할 수 있다. asc_build_id는 이미 App Store Connect에 있는 build이며 연결 설정과 제출 가능한 상태가 필요하고 worker hooks는 지원하지 않는다.

internal_groups에는 자동 배포를 끈 그룹만 명시한다. external_groups, changelog와 submit_beta_review로 외부 테스트를 제어한다. external_groups가 있으면 review 기본 true이고 그렇지 않으면 false다. 기존 build의 정보만 바꿀 때 false를 명시하면 재심사 제출을 피할 수 있다.

## Update와 rollout

Update job은 branch/channel 중 하나만 선택한다. 수동 실행에서는 GitHub branch가 비어 있을 수 있어 대상을 명시한다. platform 기본 all, rollout_percentage 기본 100이며 정수 0~100이다. 출력 first_update_group_id와 updates_json(JSON 문자열)을 사용한다.

Signed Update의 private_key_path는 파일 경로이고 file 변수는 `$VARIABLE_NAME` 형태로 참조할 수 있다. upload_sentry_sourcemaps=true는 upload 실패를 job 실패로, false는 upload 생략으로 만든다. 생략하면 Sentry 설치 시 시도하되 upload 실패를 경고만 한다. source map이 필수인 release라면 기본 동작을 성공 보장으로 읽지 않는다.

update-rollout은 진행 중인 update_group_id의 비율을 올린다. 현재 값보다 낮출 수 없으며 기본 100은 rollout을 완료한다. 중단/rollback과는 다른 동작이다. rollout_percentage output 타입은 syntax의 string과 상세표의 number가 충돌하므로 소비 시 타입을 검증한다.

## Web deploy

deploy는 Hosting을 구성한 프로젝트를 export/deploy한다. alias, prod, source_maps를 지정한다. deploy_url은 production이면 production URL, 아니면 alias 또는 고유 deployment URL을 가리킨다. deploy_identifier/deploy_json/deploy_dashboard_url 등의 결과를 저장해 실제 배포를 식별한다.

Push main 조건은 merge뿐 아니라 main 직접 push에도 성립한다. Native submit과 web deploy를 병렬 실행했다고 원자적 다중 플랫폼 release가 보장되지는 않는다.

## 출처

- [Expo Documentation, Pre-packaged jobs in EAS Workflows](https://docs.expo.dev/eas/workflows/pre-packaged-jobs)

## 관련 문서

- [[Expo-EAS-Workflow-Jobs]]

- [[Expo]]
