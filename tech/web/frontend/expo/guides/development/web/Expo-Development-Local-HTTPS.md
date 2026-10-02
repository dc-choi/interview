---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 로컬 HTTPS proxy와 개발 인증서"]
---

# Expo 로컬 HTTPS proxy와 개발 인증서

## secure context의 목적

HTTPS 개발 환경은 secure browser API와 cookie/auth 흐름을 production에 가까운 origin에서 검사할 때 쓴다. 인증서가 유효한 browser trust와 요청 host가 함께 맞아야 한다. Expo dev server 자체를 production TLS 서버로 바꾸는 절차는 아니다.

## 두 process 연결

```sh
npx expo start --web
mkcert -install
mkcert localhost
npx local-ssl-proxy --source 443 --target 8081 --cert localhost.pem --key localhost-key.pem
```

첫 process는 HTTP localhost:8081에서 Metro를 유지한다. mkcert는 local CA를 trust store에 등록하고 localhost용 certificate/private key를 생성한다. 두 번째 proxy는 HTTPS port443을 받아 8081로 전달한다. browser는 `https://localhost`를 연다.

## 확인과 운영 범위

`localhost.pem`과 `localhost-key.pem`은 예제 생성 이름이며 실제 proxy 인자와 일치해야 한다. private key와 local CA material을 source에 공개하지 않는다. port443 사용 가능 여부/권한은 OS 상태를 확인한다. 인증서 경고가 있으면 CA trust, host name과 사용한 key pair를 대조한다.

다른 기기의 localhost는 그 기기 자신이다. team member/실기기로 공유할 주소는 DNS/IP와 certificate SAN/trust를 따로 구성해야 한다. local HTTPS 성공이 public 도메인의 인증서나 production auth callback 설정을 확인한 결과는 아니다.

## 출처

- [Expo Documentation, Using local HTTPS development](https://docs.expo.dev/guides/local-https-development)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
