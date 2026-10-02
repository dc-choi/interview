---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Hosting deployment, alias와 production"]
---

# EAS Hosting deployment, alias와 production

Deployment는 고유 ID로 식별하는 immutable output이다. preview subdomain은 project에 연결된 전역 고유 prefix이며 첫 deploy 또는 Hosting settings에서 정한다. ID는 기본 random 문자열이고 custom ID도 설정할 수 있다.

## URL과 alias

| URL | 의미 |
| --- | --- |
| my-app--<id>.expo.app | 특정 배포를 고정한 preview |
| my-app--staging.expo.app | staging alias가 가리키는 배포 |
| my-app.expo.app | production alias |

alias는 project 안에서 고유하다. 같은 이름에 새 배포를 지정하면 재할당하며 하나의 배포에 여러 alias를 붙일 수 있다. 기존 배포의 내용을 수정하는 작업은 아니다.

```sh
eas deploy --alias staging
eas deploy:alias --id=my-id
eas deploy --prod
eas deploy:alias --prod --id=previous-id
```

첫 명령은 새 배포와 staging alias, 두 번째는 기존 배포에 alias를 지정하는 대화형 절차, 세 번째는 새 production, 마지막은 기존 배포를 production으로 승격한다. production rollback에는 검증한 이전 ID를 지정한다. custom domain도 production을 따르므로 alias 변경 영향에 포함된다.

## IP와 서버 호환성

Hosting은 SNI로 IP를 공유하며 dedicated IP를 제공하지 않는다. IP 고정에 의존하는 allowlist는 이 조건을 고려한다. immutable URL로 native build가 참조하는 서버를 고정하는 전략과 mutable production alias를 따르는 전략은 호환성 요구가 다르다.

## 출처

- [Expo Documentation, Assign aliases and promote to production](https://docs.expo.dev/eas/hosting/deployments-and-aliases)

## 관련 문서

- [[Expo-EAS-Hosting]]
- [[Expo-EAS-Hosting-Domains]]
