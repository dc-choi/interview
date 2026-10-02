---
tags: [nodejs, native-addon, build, distribution]
status: done
verified_at: 2026-10-01
category: "OS & Runtime"
---

# 네이티브 애드온 빌드와 배포

애드온 프로젝트는 네이티브 소스, 빌드 정의, JavaScript 진입점, package.json과 테스트를 분리한다. Node-API 자체는 Node에 포함되지만 C++ 래퍼와 빌드 도구는 별도 의존성이다. 지원 Node 범위, 컴파일러와 Python 요구사항은 선택한 node-addon-api와 node-gyp 버전에 맞춘다.

## node-gyp

`binding.gyp`에 타깃 이름과 소스를 선언한다. `node-gyp configure`는 빌드 파일을 만들고 `build`는 컴파일하며 `rebuild`는 정리부터 다시 수행한다.

```json
{
  "targets": [{
    "target_name": "addon",
    "sources": ["src/addon.cc"],
    "dependencies": [
      "<!(node -p \"require('node-addon-api').targets\"):node_addon_api"
    ]
  }]
}
```

node-addon-api의 현재 setup 문서는 예외를 사용하지 않는 `node_addon_api`, `Napi::Error`를 처리하는 `node_addon_api_except`, 모든 C++ 예외를 처리하는 `node_addon_api_except_all` 타깃을 구분한다. 기존 include/define 예시와 설정을 중복해 섞지 말고 설치한 래퍼 버전의 구성을 사용한다.

npm은 패키지 루트에 `binding.gyp`가 있고 자체 `install` 또는 `preinstall` 스크립트가 없으면 기본 install 작업으로 `node-gyp rebuild`를 사용한다. `gypfile`이라는 메타데이터 하나만으로 모든 설치 환경의 빌드 성공을 보장하지는 않는다. install scripts를 차단하는 정책도 확인한다.

## CMake.js

기존 CMake 프로젝트를 통합할 때 사용한다. `.node` 확장자를 갖는 공유 라이브러리를 만들고 `CMAKE_JS_INC`, `CMAKE_JS_SRC`, `CMAKE_JS_LIB`로 Node 관련 빌드 입력을 연결한다. 사용 API에 필요한 최소 `NAPI_VERSION`과 래퍼가 요구하는 C++ 표준을 함께 정한다.

소비자 설치 과정에서 `cmake-js compile`을 실행한다면 그 명령과 네이티브 도구 체인이 소비자 환경에 있어야 한다. 게시자에게만 설치되는 `devDependencies`에 도구를 넣고 소비자의 install 스크립트에서 호출하는 구성은 실패할 수 있다.

## 사전 빌드 바이너리

배포 행렬은 OS, 아키텍처, libc와 외부 라이브러리 ABI를 기준으로 잡는다. 안정 Node-API만 사용하면 호환 Node 버전마다 같은 바이너리를 재사용할 수 있다. Node/V8 ABI에 직접 연결한 애드온의 행렬과 구분한다.

- 패키지에 바이너리를 포함하면 추가 다운로드 의존성을 줄이지만 패키지 크기가 커진다.
- 외부 호스트에서 받으면 설치 시 네트워크, 무결성 검증, 호스트 가용성을 고려해야 한다.
- 소스 빌드 fallback을 제공하면 미지원 환경에서 설치 가능성이 높아지지만 도구 체인과 소스 배포가 필요하다.
- fallback을 제공하지 않는다면 지원 플랫폼과 실패 메시지를 명확하게 공개한다.

`@mapbox/node-pre-gyp`는 `binary` 설정의 모듈 이름, 파일 경로와 원격 위치로 바이너리를 찾는다. Node-API 대상으로 배포할 때 `napi_versions`와 빌드 시 `napi_build_version`이 맞아야 한다. `napi_versions`는 이 도구의 배포 설정이며 Node-API 자체의 보편적 필수 package.json 필드는 아니다.

배포 테스트는 소스 디렉터리에서 require 성공만 확인하지 않는다. `npm pack` 결과를 깨끗한 소비자 환경에 설치해 실제 파일 포함, 다운로드와 fallback, 대표 Node 버전의 로드와 동작을 확인한다. 업로드 자격 증명은 소스나 바이너리에 넣지 않는다.

## 기존 V8/NAN 구현의 이전

1. 기존 동작과 오류 계약을 테스트로 고정한다.
2. 자동 변환 도구는 복사본이나 복구 가능한 Git 상태에서 사용한다.
3. include, 환경 인자, 값 변환, exports 반환과 오류 처리를 직접 검토한다.
4. 전역 JavaScript reference를 환경별 상태로 옮기고 Worker 로드와 종료를 검증한다.
5. 지원 Node 범위와 플랫폼에서 빌드, 로드, 동작을 확인한다.

자동 치환 성공은 ABI 호환성이나 수명 관리의 검증이 아니다. 병행 배포에서는 prerelease 버전과 dist-tag로 사용 경로를 나눌 수 있다. tag는 이동 가능한 포인터이므로 재현성은 정확한 버전과 lockfile로 확보한다.

## 출처

- [Node.js, Prerequisites](https://nodejs.org/learn/node-api/getting-started/prerequisites)
- [Node.js, Tools](https://nodejs.org/learn/node-api/getting-started/tools)
- [Node.js, Project structure](https://nodejs.org/learn/node-api/getting-started/project-structure)
- [Node.js, Node-API build tools](https://nodejs.org/learn/node-api/build-tools)
- [Node.js, node-gyp](https://nodejs.org/learn/node-api/build-tools/node-gyp)
- [Node.js, CMake.js](https://nodejs.org/learn/node-api/build-tools/cmake-js)
- [Node.js, node-pre-gyp](https://nodejs.org/learn/node-api/build-tools/node-pre-gyp)
- [Node.js, Migration](https://nodejs.org/learn/node-api/getting-started/migration)
- [Node.js, Publishing Node-API modules](https://nodejs.org/learn/modules/publishing-node-api-modules)
- [node-addon-api setup — Node.js](https://github.com/nodejs/node-addon-api/blob/main/doc/setup.md)
- [npm, Scripts](https://docs.npmjs.com/cli/v11/using-npm/scripts/)

## 관련 문서

- [[Nodejs-Native-Addons]]
- [[Native-Addon-Lifetime]]
- [[Package-Publishing-Workflow]]
