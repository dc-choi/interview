---
tags: [expo, eas, workflows]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Workflow 승인 알림 정리 작업"]
---

# Workflow 승인 알림 정리 작업

## 승인과 device 등록

require-approval은 승인 시 success, 거절 시 failure가 된다. 승인 뒤 실행할 job을 needs로 연결한다. doc job은 params.md로 run 화면에 Markdown 안내를 표시할 뿐 외부 문서를 작성하거나 release를 실행하지 않는다.

apple-device-registration-request는 QR/link에서 iOS 기기 등록 profile 설치, UDID 수집과 팀원의 승인까지 action-required로 기다린다. 이미 등록된 UDID도 이 승인을 건너뛰지 않는다. 계정에 Apple team이 정확히 하나가 아니면 apple_team_identifier를 명시한다.

승인 출력 apple_device_id/identifier/name/model/device_class/software_version 중 일부는 비어 있을 수 있다. 새 기기를 실제 ad hoc build에 포함하려면 managed credential과 profile refresh 조건도 맞춰야 한다. UDID를 공개 로그나 외부 메시지에 무조건 노출하지 않는다.

## Slack와 GitHub comment

slack job은 webhook_url과 message/payload 중 하나를 받는다. webhook은 EAS 변수로 공급한다. 실패까지 보고하려면 needs 대신 after와 각 job의 상태를 사용한다.

github-comment는 연결된 GitHub PR에 build/update/deploy 결과를 게시한다. ID 목록 생략은 현재 workflow 결과 자동 검색, 빈 배열은 해당 항목 제외다. payload로 전체 본문을 지정할 때 다른 params를 함께 사용할 수 없다. comment_url은 실제 게시됐을 때만 존재한다.

## Branch 삭제

branch-delete는 branch_name의 EAS Update branch와 그 update를 삭제한다. fail_on_missing 기본false이면 대상이 없어도 성공하며 branch_id는 null일 수 있다. Channel이 연결된 branch는 삭제가 막힌다. Git branch와 EAS Update branch가 별개임을 전제로 보존할 production/release branch를 제외한다.

## Repack

repack은 build_id의 native binary를 재사용해 JS/metadata를 다시 넣는다. profile 기본은 원본 build의 profile, embed_bundle_assets는 원본 조건에 따라 결정, js_bundle_only 기본false다. native 변경이 있으면 full build가 필요하다.

iOS entitlements는 원본 사용 옵션과 명시 파일 경로 중 하나만 선택한다. repack_version/package를 바꿀 수 있으나 보통 공식 도구의 검증한 버전을 사용한다. 정확한 signing/symbolication을 위한 전체 pipeline이 필요한 production에는 적합하지 않다는 현재 제한을 따른다.

## 출처

- [Expo Documentation, Pre-packaged jobs in EAS Workflows](https://docs.expo.dev/eas/workflows/pre-packaged-jobs)

## 관련 문서

- [[Expo-EAS-Workflow-Jobs]]

- [[Expo]]
