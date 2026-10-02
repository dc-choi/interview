---
tags: [runtime, nodejs, npm]
status: done
verified_at: 2026-10-01
category: "OS & Runtime"
aliases: ["패키지 배포 워크플로", "npm unpublish", "npm deprecate"]
---

# 패키지 배포 워크플로

[[Package-Publishing|패키지 배포]]에서 게시 전 확인, dist-tag 운영과 잘못 배포한 버전의 대응을 분리한 문서다. CJS, ESM 진입점 전략과 `exports` 설정은 부모 문서를 따른다.

## 배포 전 확인
```bash
npm publish --dry-run    # 포함될 파일 목록 미리 확인
npm pack                 # 로컬에서 .tgz 생성하여 검증
npm pack --dry-run       # 패킹될 파일만 확인
```

### files 필드 (허용 목록)
```json
{
  "files": [
    "lib/",
    "esm/",
    "index.js",
    "index.mjs",
    "README.md"
  ]
}
```
- `files` 미지정 시 기본값 `["*"]`로 전체를 포함하고 `.npmignore`(없으면 `.gitignore`)로 제외할 파일을 결정
- `files` 지정 시 허용 목록 방식으로 동작 (더 안전). `package.json`, `README`, `LICENSE`, `main`과 `bin`의 파일은 설정과 무관하게 포함된다

## dist-tags와 버전 관리

### dist-tag 기본 개념
```bash
npm publish                    # 자동으로 latest 태그
npm publish --tag beta         # beta 태그로 배포
npm publish --tag next         # next 태그로 배포

npm dist-tag ls my-package     # 태그 목록 확인
npm dist-tag add my-package@2.0.0 latest  # 태그 수동 변경
```

### 사용자 설치 시
```bash
npm install my-package          # latest 태그 (기본)
npm install my-package@beta     # beta 태그
npm install my-package@2.0.0    # 정확한 버전
```

## Node-API 모듈 배포
안정 Node-API만 사용하는 애드온은 대상 런타임이 해당 Node-API 버전을 지원하고 OS, 아키텍처, libc와 외부 라이브러리 ABI가 호환될 때 바이너리를 재사용할 수 있다. 배포 행렬과 fallback은 [[Native-Addon-Build]]를 따른다. dist-tag는 기존 구현과 이전한 구현의 배포 경로를 나누는 선택지이며, 그 자체로 ABI를 검사하지는 않는다.

```bash
# Node-API 버전 배포
npm publish --tag n-api

# 사용자 설치
npm install my-native-addon@n-api
```

## 잘못 배포한 버전 대응

게시는 사실상 되돌릴 수 없다고 보고 위의 확인을 먼저 거친다. 한 번 쓴 `패키지@버전`은 unpublish한 뒤에도 다시 쓸 수 없어 새 버전을 게시해야 한다.

| 게시 후 경과 | 공개 레지스트리에서 unpublish할 수 있는 조건 |
|---|---|
| 72시간 이내 | 공개 레지스트리의 다른 패키지가 의존하지 않을 때 |
| 72시간 이후 | 의존하는 패키지가 없고, 지난 한 주 다운로드가 300회 미만이며, owner나 maintainer가 한 명일 때 |

- 조건은 2026-09-30에 확인한 npm unpublish 정책 기준이다. 모든 버전을 unpublish하면 24시간 동안 그 패키지의 새 버전을 게시할 수 없고, unpublish 자체도 되돌릴 수 없다.
- 조건을 만족하지 못하거나 의존 패키지를 깨고 싶지 않으면 deprecate한다. deprecate한 버전은 계속 설치되지만 설치할 때마다 경고가 표시된다. 버전 범위를 주면 prerelease 버전도 포함된다.

```bash
npm deprecate my-package@1.4.2 "보안 결함, 1.4.3으로 업그레이드"   # 범위도 가능: my-package@"< 1.4.3"
npm deprecate my-package@1.4.2 ""                                     # 빈 메시지로 deprecate 해제
npm dist-tag add my-package@1.4.1 latest                              # 수정본 전까지 latest를 직전 정상 버전으로
```

대응 순서는 수정 버전을 바로 낼 수 없으면 `latest`를 직전 정상 버전으로 옮기고, 수정 버전을 게시한 뒤 문제 버전을 deprecate하는 흐름을 기본으로 한다. unpublish는 위 조건을 만족하는 게시 직후의 사고에 한정한다.

## 출처

- [npm Docs, npm publish](https://docs.npmjs.com/cli/v11/commands/npm-publish/)
- [npm Docs, npm pack](https://docs.npmjs.com/cli/v11/commands/npm-pack/)
- [npm Docs, package.json files](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#files)
- [npm Docs, npm dist-tag](https://docs.npmjs.com/cli/v11/commands/npm-dist-tag/)
- [npm Docs, npm unpublish](https://docs.npmjs.com/cli/v11/commands/npm-unpublish/)
- [npm Docs, npm deprecate](https://docs.npmjs.com/cli/v11/commands/npm-deprecate/)
- [npm Docs, npm Unpublish Policy](https://docs.npmjs.com/policies/unpublish)
- [Node.js, Node-API, Implications of ABI stability](https://nodejs.org/api/n-api.html#implications-of-abi-stability)
- [Node.js, Publishing a Node-API version of a package alongside a non-Node-API version](https://nodejs.org/en/learn/modules/publishing-node-api-modules)
- [인프런, 얄팍한 코딩사전, npm](https://www.inflearn.com/courses/lecture?courseId=336276&unitId=277123)

## 관련 문서

- [[Package-Publishing|패키지 배포]]
- [[Dependency-Selection|의존성 선택]]
- [[Nodejs-Native-Addons|Native Addons]]
- [[Supply-Chain-Security|공급망 보안]]
