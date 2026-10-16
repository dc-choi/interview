---
tags: [cs, encoding, base64, binary, http]
status: done
verified_at: 2026-10-06
category: "CS - 기초"
aliases: ["Base64 인코딩", "Base64와 Base64url"]
---

# Base64: 바이너리를 텍스트로 옮기기

Base64는 임의의 바이트열을 ASCII 문자로 표현하는 인코딩이다. 암호화나 압축이 아니며, 문자만 받는 필드에 바이너리를 담을 때 쓴다.

## 동작과 크기

입력 3바이트(24비트)를 6비트씩 나누어 문자 4개로 바꾼다. 기본 알파벳은 `A–Z`, `a–z`, `0–9`, `+`, `/`이며 `=`는 패딩이다.

패딩을 포함하고 줄바꿈을 넣지 않은 출력 길이는 입력이 n바이트일 때 `4 × ceil(n / 3)`이다. 큰 입력은 약 33.3% 늘지만 작은 입력에서는 패딩 비중이 크다.

| 원본 ASCII | 입력 바이트 | Base64 | 출력 문자 |
|---|---:|---|---:|
| f | 1 | `Zg==` | 4 |
| fo | 2 | `Zm8=` | 4 |
| foo | 3 | `Zm9v` | 4 |

## JSON과 HTTP의 경계

JSON 문자열은 Unicode 문자로 구성되므로 임의의 파일 바이트를 그대로 넣는 필드가 아니다. Base64 문자열로 담으려면 인코딩 방식을 API 계약에 명시한다.

HTTP 자체가 바이너리를 보내지 못하는 것은 아니다. 파일은 `multipart/form-data`의 바이너리 part로 보낼 수 있다. RFC 7578은 HTTP처럼 바이너리를 지원하는 전송에서 part의 `Content-Transfer-Encoding` 사용을 권하지 않는다.

설계할 때 JSON 안에 포함해야 하는 작은 값인지, 별도 파일 전송으로 처리할 값인지 먼저 구분한다. 후자라면 Base64 변환과 크기 증가를 피할 수 있다.

## Base64url과 디코딩 계약

- Base64url은 `+`, `/`를 각각 `-`, `_`로 바꾼다. 패딩 생략은 사용하는 프로토콜의 규칙을 따른다.
- RFC 4648의 기본 규칙은 별도 명세가 허용하지 않는 줄바꿈을 추가하지 않고, 알파벳 밖 문자를 거부하는 것이다.
- 패딩 비트는 0이어야 한다. 디코딩 결과가 같아도 문자열 표현까지 같다고 가정하지 않는다.
- Base64를 누구나 디코딩할 수 있으므로 비밀 보호나 변조 탐지 수단으로 쓰지 않는다.

## 적용 체크포인트

- API가 기본 Base64와 Base64url 중 무엇을 받는지, 패딩과 줄바꿈 정책을 명시한다.
- 요청 크기 제한은 원본 파일 크기뿐 아니라 인코딩 후 본문 크기로도 계산한다.
- 1바이트가 왜 4문자가 되는지, 파일 업로드에서 Base64가 필수인지 설명해 본다.

## 출처

- [IETF, RFC 4648: The Base16, Base32, and Base64 Data Encodings](https://www.rfc-editor.org/rfc/rfc4648.html)
- [IETF, RFC 8259: The JavaScript Object Notation (JSON) Data Interchange Format](https://www.rfc-editor.org/rfc/rfc8259.html)
- [IETF, RFC 7578: Returning Values from Forms: multipart/form-data](https://www.rfc-editor.org/rfc/rfc7578.html)

## 관련 문서

- [[Digital-Fundamentals|디지털 기초와 문자 인코딩]]
- [[Checksum-and-Hash|체크섬과 해시]]
- [[JWT|JWT]]
