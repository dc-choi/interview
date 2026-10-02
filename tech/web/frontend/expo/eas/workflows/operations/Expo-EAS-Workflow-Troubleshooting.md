---
tags: [expo, eas, workflows]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Workflow 검증과 실패 진단"]
---

# Workflow 검증과 실패 진단

## 실행 전 schema 확인

```sh
eas workflow:validate .eas/workflows/check.yml
eas workflow:runs
eas workflow:view RUN_ID
eas workflow:logs RUN_ID --all-steps
```

Validate는 호출한 custom function도 검사한다. YAML/schema 통과는 credential, 실제 build와 배포의 성공 증거가 아니다. Run detail에서 처음 실패한 job과 step의 직접 오류를 확인한다.

## Trigger가 실행되지 않을 때

GitHub 연결과 .eas/workflows 경로를 확인한다. Push/PR은 triggering commit의 파일, schedule/ref_delete는 default branch의 파일을 사용한다. branch/tag/path/types/label filter와 skip marker를 대조한다.

Scheduled run은 GMT 기준이고 부하로 지연될 수 있다. Fork PR 제외 조건도 확인한다. 수동 CLI 성공만으로 GitHub trigger 연결까지 정상이라고 결론 내리지 않는다.

## Build와 변수

`Missing build profile in eas.json`이면 job의 params.profile(기본 production)이 실제 존재하는지 확인한다. Credential은 같은 platform/profile로 준비한다. profile 이름과 environment 이름이 우연히 같다고 변수 집합까지 같다는 뜻은 아니다.

누락된 변수는 scope/visibility와 평가 시점을 확인한다. 모든 job의 기본 environment가 production이라는 오래된 문제 해결 문장보다 [[Expo-EAS-Workflow-Environment]]의 job별 규칙을 따른다. VM 없는 job에는 env를 넣지 않는다.

## 결과를 확인한다

Workflow run의 성공/실패, build ID와 배포 대상, source SHA를 묶어 확인한다. Source map 업로드 같은 선택 작업은 실패해도 전체 job이 성공할 수 있다. retry된 테스트와 처음부터 통과한 테스트를 구분하고 민감 값은 오류 공유 전에 제거한다.

## 출처

- [Expo Documentation, Troubleshoot EAS Workflows](https://docs.expo.dev/eas/workflows/troubleshooting)

## 관련 문서

- [[Expo-EAS-Workflow-Operations]]

- [[Expo]]
