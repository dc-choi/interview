---
tags: [expo, eas, workflows]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Workflow Maestro와 Maestro Cloud"]
---

# Workflow Maestro와 Maestro Cloud

## EAS runner에서 테스트

maestro job은 현재 alpha다. build_id와 flow_path가 필수이고 Android에는 APK, iOS에는 Simulator .app가 필요하다. Android runner는 nested virtualization, iOS는 macOS를 사용한다. skip_build_check는 검사를 생략할 뿐 잘못된 artifact를 호환되게 바꾸지 않는다.

shards 기본1(실험), retries 기본0, retry_failed_only 기본true다. include_tags/exclude_tags로 flow를 고르고 maestro_version을 고정할 수 있다. output_format 기본 junit, record_screen 기본false이며 recording은 자원을 더 쓸 수 있다.

android_system_image_package는 x86_64 image, device_identifier는 문자열 또는 android/ios 객체다. 기기 목록은 image별로 다르다. MAESTRO_ prefix 변수는 테스트 환경으로 전달할 수 있으나 테스트 계정 정보가 screenshot/log에 남지 않도록 한다.

## 외부 Maestro Cloud

maestro-cloud에는 별도 계정/Cloud plan, build_id/maestro_project_id/flows가 필요하다. API key는 maestro_api_key 또는 MAESTRO_CLOUD_API_KEY로 전달한다. device_model/device_os/device_locale, maestro_config와 branch/name 등을 설정할 수 있다.

async=true는 업로드 완료만 뜻하며 테스트 성공을 뜻하지 않는다. 이 모드에서 확실한 출력은 maestro_cloud_url이고 flow counts/names는 없거나 유효하지 않을 수 있다. Release gate에는 최종 테스트 결과를 기다리는 경로를 사용한다.

## 결과와 hook

일반 모드에서는 total_flows_count, successful_flows_count, failed_flows_count와 성공/실패 이름 JSON을 확인한다. 성공 count에는 SUCCESS/WARNING, 실패에는 ERROR/STOPPED가 포함된다. 재시도로 통과한 flow를 처음부터 안정적이라고 해석하지 않는다.

EAS Maestro는 before_maestro_tests/after_maestro_tests, Cloud는 before_maestro_cloud/after_maestro_cloud hook을 제공한다. 테스트 파일 생성과 결과 수집은 해당 job에서 처리한다. 다른 job에 전달할 때 artifact를 사용한다.

## 출처

- [Expo Documentation, Pre-packaged jobs in EAS Workflows](https://docs.expo.dev/eas/workflows/pre-packaged-jobs)

## 관련 문서

- [[Expo-EAS-Workflow-Jobs]]

- [[Expo]]
