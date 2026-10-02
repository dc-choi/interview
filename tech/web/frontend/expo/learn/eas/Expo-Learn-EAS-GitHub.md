---
tags: [expo, react-native, eas]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["GitHub trigger와 EAS 후속 자동화"]
---

# GitHub trigger와 EAS 후속 자동화

## Repository 연결

Expo GitHub App은 EAS 계정과 GitHub installation을 연결한 뒤 project settings에서 특정 repository를 연결한다. account connection, installation authorization, project/repo connection은 서로 다른 단계다. monorepo면 project source directory를 지정하고 root project면 `/`를 사용할 수 있다.

trigger 방식은 Builds page 수동 실행, push 자동 실행, PR label이다. tutorial label `eas-build-all:development`는 Android/iOS development profile을 요청한다. platform/profile 이름이 실제 eas.json에 존재해야 한다. build detail의 Created by와 commit을 확인해 GitHub app이 의도한 revision에서 실행했는지 검증한다.

```json
{"build":{"development":{"android":{"image":"latest"},"ios":{"image":"latest"}}}}
```

원문은 build image latest를 예시로 지정한다. reproducibility가 필요하면 SDK에 맞는 image 선택과 pin 전략을 검토하고 latest가 영구 고정 환경이라고 생각하지 않는다. label/push 연결은 credential 준비와 repository 접근 권한도 요구한다.

## 자동화의 확장 범위

Workflows는 build/test/update/deploy의 dependency를 연결하는 automation이고 Build는 compile/sign, Submit은 store upload, Hosting은 web/API routes deploy, Update는 runtime-compatible JS/assets publish를 맡는다. Metadata와 Insights는 원문 기준 preview 상태다. 각 기능의 rollout/status와 project eligibility는 사용 시 해당 reference를 확인한다.

eas.json reference는 build/submit 옵션과 defaults의 정본이고 custom builds는 standard pipeline보다 세부 steps를 직접 구성할 때 사용한다. GitHub Actions로 Update publish를 실행하는 외부 CI 경로와 Expo-hosted Workflows는 선택 가능한 별도 실행 환경이다. credentials와 store review 책임은 automation을 도입해도 남는다.

## 출처

- [Expo Documentation, Trigger builds from a GitHub repository](https://docs.expo.dev/tutorial/eas/using-github)
- [Expo Documentation, Next steps](https://docs.expo.dev/tutorial/eas/next-steps)

## 관련 문서

- [[Expo-Learn-EAS-Setup]]
- [[Expo-Learn-EAS-Updates]]
