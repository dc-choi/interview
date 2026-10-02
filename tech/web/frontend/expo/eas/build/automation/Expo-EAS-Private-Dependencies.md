---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS private 의존성과 submodule"]
---

# EAS private 의존성과 submodule

## Private npm

npm의 private 패키지 설치에는 읽기 범위의 NPM_TOKEN을 EAS 환경에 제공한다. 프로젝트 root에 .npmrc가 없을 때 EAS는 token을 사용하는 npm 설정을 자동 생성한다. 이미 .npmrc가 있으면 직접 token 참조와 registry를 맞춰야 한다.

```ini
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
registry=https://registry.npmjs.org/
```

직접 운영하는 registry는 registry URL과 해당 host의 인증 항목을 작성한다. 여러 registry를 함께 쓰면 scope별 registry와 기본 registry를 구분한다. 토큰 값을 .npmrc에 직접 넣지 않는다. EAS의 내부 cache host 주소는 구현 세부이므로 일반 프로젝트에 고정하지 않는다.

## Git submodule

기본 VCS upload는 현재 작업 폴더의 submodule 내용도 포함한다. CI, requireCommit 또는 private submodule에서는 초기화가 안 된 빈 디렉터리를 업로드하지 않도록 확인한다.

Builder에서 private submodule을 가져와야 하면 접근 권한이 제한된 SSH key를 비밀값으로 전달하고 pre-install에서 복원해 `git submodule update --init`을 실행할 수 있다. key 파일 permission을 제한하고 host key는 신뢰 가능한 값으로 확인한다. Base64는 암호화가 아니다.

.gitmodules가 상대 URL을 사용하면 upload packaging으로 원격 origin 정보가 사라진 경우 해석 기준을 복구해야 한다. 재귀 submodule 여부와 필요한 checkout 범위도 프로젝트에 맞춰 확인한다. 이 절차를 문서화했다고 실제 원격 저장소 접근을 검증한 것은 아니다.

## Yarn Classic cache

Yarn 1 lockfile은 registry URL을 고정하므로 registry 설정만 바꿔도 EAS npm cache를 쓰지 못할 수 있다. 공식 우회는 pre-install에서 EAS_BUILD_NPM_CACHE_URL이 있을 때 lockfile URL을 build 환경 안에서 교체하는 것이다.

전체 설치 오류를 숨기는 `|| true`를 무분별하게 확장하지 않는다. 이 조정은 Yarn Classic용 cache 최적화이며 package checksum과 lockfile 재현성 검증을 생략하는 이유가 아니다. Yarn Modern은 해당 registry override 문제가 다르다.

## 출처

- [Expo Documentation, Using private npm packages](https://docs.expo.dev/build-reference/private-npm-packages)
- [Expo Documentation, Using Git submodules](https://docs.expo.dev/build-reference/git-submodules)
- [Expo Documentation, Using npm cache with Yarn 1 (Classic)](https://docs.expo.dev/build-reference/npm-cache-with-yarn)

## 관련 문서

- [[Expo-EAS-Build-Automation]]

- [[Expo]]
