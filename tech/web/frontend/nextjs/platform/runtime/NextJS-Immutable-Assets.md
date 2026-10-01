---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js immutable asset 배포 계약", "NextJS-Immutable-Assets"]
---

# Next.js immutable asset 배포 계약

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## immutable static assets

16.3의 immutable assets는 content-addressed 파일을 /_next/static/immutable/*에 배치한다. deployment query ?dpl을 붙이지 않아 변하지 않은 assets의 browser/CDN cache를 배포 간 재사용한다. public assets와 이전 Next.js의 mutable assets는 계속 deployment-scoped serving을 지원해야 한다.

## adapter activation

modifyConfig의 production build phase에서 사용자가 false를 명시하지 않은 경우 supportsImmutableAssets를 true로 설정한다. onBuildComplete는 staticFiles.immutableHash가 있는 항목을 별도로 처리한다. 앱에서 true를 넣기 전에 provider가 이 계약을 구현해야 한다.

```js
if (phase === 'phase-production-build') {
  config.supportsImmutableAssets = config.supportsImmutableAssets ?? true
}
```

## 저장소 불변성과 collision

immutable pathname의 byte contents를 새 deployment에서도 바꾸지 않는다. active deployment가 참조하는 동안 파일을 삭제하지 않는다. 파일명 hash는 truncated일 수 있으므로 full immutableHash로 기존 object와 비교해 collision을 탐지한다. 충돌이면 overwrite하지 않고 outputHashSalt로 namespace를 회전하는 대응을 검토한다.

upload가 이미 같은 full hash를 가진 object에 대한 중복이면 생략할 수 있다. URL에는 deployment ID가 없어 여러 deployment가 같은 object를 참조하므로 rollback/retention을 단일 최신 build 기준으로 설계하면 안 된다.

## non-immutable assets

immutableHash가 없는 public 파일은 내용이 바뀔 수 있고 ?dpl을 가진 deployment namespace로 제공한다. 전부 long-lived immutable cache header를 붙이면 새 파일 내용이 반영되지 않는다. onMatch routing에서 제공하는 immutable header metadata를 적절한 assets에만 적용한다.

## 확인

두 deployment의 동일 파일 URL과 full hash, 변경 파일의 새 URL, active old deployment의 asset 접근, user false opt-out, hash collision rejection과 cleanup retention을 검사한다. deploymentId는 version mismatch detection, outputHashSalt는 filename hash rotation, immutable namespace는 byte identity 보장으로 서로 역할이 다르다.

## upload 분기와 CDN prefix

CDN은 /_next/static/immutable/* prefix로 공유 immutable namespace를 분리할 수 있다. onBuildComplete에서 output.immutableHash != null이면 uploadOrVerifyImmutableStaticAsset(filePath,pathname,fullHash)로 원본 pathname에 dpl 없이 접근 가능하게 한다. 그 외는 uploadStaticAsset(filePath,pathname)로 deployment-scoped mutable 경로를 유지한다. 충돌 등 hash 회전 이유가 있을 때 modifyConfig에서 outputHashSalt를 프로젝트별 salt로 설정할 수 있다. 이 작업은 기존 asset의 overwrite/delete를 허용하지 않는다.

## 출처

- [Next.js, app/api-reference/adapters/immutable-static-assets](https://nextjs.org/docs/app/api-reference/adapters/immutable-static-assets)

## 관련 문서

- [[NextJS-Config-Build-Deployment]]
- [[NextJS-Adapter-Outputs]]
