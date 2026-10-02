---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Update end-to-end 서명과 key rotation"]
---

# EAS Update end-to-end 서명과 key rotation

expo-updates는 개발자의 private key로 update를 서명하고 binary에 포함한 certificate로 client가 적용 전에 검증한다. CDN/ISP/cloud/EAS가 전달 내용을 바꾸는 것을 검출한다. signing key의 유출, 정상 권한자가 만든 악성 코드, native/data 호환성은 별도 문제다. EAS 서비스의 code signing은 현재 문서상 Production/Enterprise plan에 제공되며 사용 전 최신 plan을 확인한다.

## Key, certificate와 config

```sh
npx expo-updates codesigning:generate --key-output-directory ../keys --certificate-output-directory certs --certificate-validity-duration-years 10 --certificate-common-name "Example Organization"
npx expo-updates codesigning:configure --certificate-input-directory certs --key-input-directory ../keys
```

private-key.pem은 source control 밖/KMS/password manager 등 안전한 위치에 저장한다. public-key.pem은 비밀이 아니며 certs/certificate.pem은 binary와 repository에 포함할 수 있다. 예제10년은 선택값이다. 짧은 validity는 유출 노출 기간을 줄이지만 더 자주 새 certificate와 binary를 배포해야 한다. 만료된 certificate의 binary는 새 update를 적용하지 못한다.

config는 updates.codeSigningCertificate와 codeSigningMetadata{keyid:'main', alg:'rsa-v1_5-sha256'}다. CNG는 다음 native generation에 반영한다. bare Android는 CODE_SIGNING_CERTIFICATE/CODE_SIGNING_METADATA를 application meta-data에 넣고 certificate CR/LF와 JSON 따옴표를 XML escape한다. iOS는 EXUpdatesCodeSigningCertificate와 EXUpdatesCodeSigningMetadata dict를 Expo.plist에 넣으며 CR을 escape한다. 원문의 Android unescaped JSON attribute를 그대로 사용하지 않는다.

## Signed publish와 검증

```sh
eas update --channel production --environment production --private-key-path ../keys/private-key.pem
```

certificate를 포함한 새 runtime/build를 먼저 만든다. EAS CLI는 local에서 private key로 서명하고 signature를 upload하며 private key를 서비스로 보내지 않는다. client는 download 후 적용 전에 certificate/signature를 검증하고 유효하지 않으면 reject한다. publish 성공과 client 검증 성공은 별도다.

## Rotation, expiration와 제거

만료, 유출 또는 정기 rotation 시 이전 keys/certificate를 안전하게 백업하고 새 key/certificate를 생성한다. keyid를 바꾸면 진단에 도움이 된다. certificate도 runtime 구성이라 새 runtime/build를 만들고 해당 key로 새 updates를 publish한다. 만료 전에 모든 사용자 upgrade 경로를 마련한다. 만료 전에 받은 update는 계속 실행할 수 있다.

서명 제거도 certificate 없는 별도 runtime으로 전환하는 방식이다. metadata만 제거하라는 원문 목록을 기존 certificate와 native 설정까지 그대로 둬도 안전하다는 보장으로 읽지 않는다. certificate/metadata가 원하는 signing 상태로 반영됐는지 확인하고 rebuild하며 이전 binary 지원 정책을 유지한다. URL override의 anti-bricking 해제는 signing만으로 완전히 안전해지지 않는다.

## 출처

- [Expo Documentation, End-to-end code signing with EAS Update](https://docs.expo.dev/eas-update/code-signing)

## 관련 문서

- [[Expo-EAS-Update-Runtime]]
- [[Expo-EAS-Update-Override]]
