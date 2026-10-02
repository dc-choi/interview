---
tags: [expo, react-native, cicd]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Hosting deploy와 workflow 확장"]
---

# EAS Hosting deploy와 workflow 확장

## Static export와 URL

EAS Hosting deploy job은 web export, output upload, deployment URL 반환을 맡는다. tutorial은 app config web.output static을 사용한다. static은 HTML/JS/assets plain files를 만든다. single/server도 별도 output mode이며 static tutorial 설정만으로 API routes server deployment를 구성했다고 볼 수 없다.

```json
{"expo":{"web":{"output":"static"}}}
```

```yaml
deploy_web:
  type: deploy
  params:
    prod: true
    alias: staging
```

prod omitted는 preview unique deployment URL, prod true는 project production URL을 새 deployment로 연결한다. alias는 별도 stable named URL이며 prod와 목적을 구분한다. preview/prod/alias 조합은 실제 원하는 target에 맞춰 사용한다.

needs 없는 deploy_web은 native builds/fingerprint jobs와 parallel로 실행한다. 같은 release event에서 native build 실패에도 web deployment가 이미 완료될 수 있으므로 release를 모든 platform의 성공으로 묶고 싶으면 dependency/gates를 추가한다. tutorial 예제는 cross-platform atomic release를 보장하지 않는다.

preview workflow에서 manual run 후 View Deployment로 실제 browser를 확인하고 production tag release에서는 production URL 변경을 확인한다. web env가 native와 같아야 하는 부분과 별도 public config를 구분하고 deploy job의 environment를 명시적으로 확인한다.

## 후속 reference의 역할

syntax reference는 triggers/expressions/condition/dependency 계약, packaged jobs reference는 각 type params/outputs, env reference는 secret/config visibility와 evaluation을 확인하는 문서다. Build/Update/Submit/Hosting의 service-specific limits는 각 reference에서 확인한다.

custom builds는 standard build pipeline보다 세부 steps가 필요한 경우, GitHub Actions Update는 외부 CI에서 OTA publish하려는 경우의 확장이다. sample pipeline을 갖췄다는 사실과 실제 credential/store review/physical device compatibility 검증을 마쳤다는 사실을 구분한다.

## 출처

- [Expo Documentation, Deploy web apps to EAS Hosting with EAS Workflows](https://docs.expo.dev/tutorial/cicd/web-deployments)
- [Expo Documentation, Next steps](https://docs.expo.dev/tutorial/cicd/next-steps)

## 관련 문서

- [[Expo-Home-Web-Deployment]]
- [[Expo-Learn-CICD-Release]]
