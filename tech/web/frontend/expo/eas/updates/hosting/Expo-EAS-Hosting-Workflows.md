---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Workflows의 web deployment"]
---

# EAS Workflows의 web deployment

EAS Workflows의 deploy job은 web export와 Hosting 배포를 수행한다. GitHub integration을 연결하고 .eas/workflows 안에 YAML을 둔다. main push 또는 PR merge가 production 배포를 trigger하도록 범위를 제한한다.

```yaml
name: Deploy
on:
  push:
    branches: ['main']
jobs:
  deploy:
    type: deploy
    environment: production
    params:
      prod: true
```

production environment는 job에 명시한다. eas workflow:run .eas/workflows/deploy.yml로 수동 trigger할 수도 있다. deploy job의 params.alias와 prod 조건식을 사용해 branch별 배포를 구성할 수 있다.

## PR preview와 comment

```yaml
name: PR Preview
on:
  pull_request: {}
jobs:
  deploy:
    type: deploy
  comment:
    needs: [deploy]
    type: github-comment
```

opened/reopened/synchronize 이벤트에 preview를 만들며 github-comment job은 선행 deploy output을 찾아 PR에 URL을 기록한다. preview의 공개 범위와 environment 값을 선택한다. YAML 예제는 자동화 기능 설명이며 이 문서화 작업에서 workflow 실행이나 외부 comment를 수행한 것은 아니다.

## 출처

- [Expo Documentation, Web deployments with EAS Workflows](https://docs.expo.dev/eas/hosting/workflows)

## 관련 문서

- [[Expo-EAS-Hosting]]
- [[Expo-EAS-Hosting-Aliases]]
