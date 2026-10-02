---
tags: [expo, eas, workflows]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS 환경 변수와 공개 범위"]
---

# EAS 환경 변수와 공개 범위

## Environment와 scope

기본 environment는 development/preview/production이다. 이름이 같은 변수도 environment별 다른 값을 가질 수 있고 한 값을 여러 environment에 연결할 수 있다. Project scope는 한 앱, account scope는 계정의 여러 앱에서 사용한다.

문자열 변수와 file 변수를 지원한다. File 변수는 runner에 파일을 만들고 환경 변수에 그 경로를 넣는다. JSON 내용 자체가 process.env에 들어오는 것으로 처리하지 않는다.

| Visibility | 조회와 사용 범위 |
| --- | --- |
| plaintext | 웹/CLI/로그에서 볼 수 있다. |
| sensitive | 웹에서 표시를 전환하고 CLI로 읽을 수 있다. build/workflow 로그는 가린다. |
| secret | EAS 서버 밖에서 값을 읽을 수 없다. 웹/CLI 조회와 로컬 pull이 불가능하다. |

Client bundle에 넣은 값은 visibility와 관계없이 공개 정보다. `EXPO_PUBLIC_`에는 API endpoint 같은 공개 설정만 넣고 서버 키를 넣지 않는다. 로그 마스킹도 최종 앱 안의 값을 숨겨 주지는 않는다.

## 로컬과 cloud의 차이

Git에서 제외한 .env.local은 remote runner에 자동 전달되지 않는다. 외부 CI에서 export한 변수도 원격 EAS Build의 변수로 자동 복제되지 않는다. 반대로 development build 안의 native config가 cloud에서 만들어졌어도 Metro가 공급하는 JS는 개발 PC의 환경으로 bundle된다.

EAS CLI의 로컬 app.config 평가는 plaintext/sensitive를 읽을 수 있지만 secret은 읽지 못한다. package/bundle ID처럼 로컬에서도 결정해야 하는 값은 secret으로 숨기지 않는다. 빌드 전용 NPM_TOKEN 같은 값은 server secret에 적합하다.

## 출처

- [Expo Documentation, Environment variables in EAS](https://docs.expo.dev/eas/environment-variables)

## 관련 문서

- [[Expo-EAS-Configuration]]

- [[Expo]]
