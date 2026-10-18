---
tags: [palantir, foundry, pipeline-builder, ipv4, ipv6]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Pipeline Builder IP 주소 검증과 정규화"]
---

# Pipeline Builder IP 주소 검증과 정규화

IP 주소 문자열의 형식 검증과 IPv6 표준 표기 변환은 다른 연산이다. 유효한 주소라는 결과는 접근 가능한 호스트, 공인 주소나 안전한 접속 대상이라는 뜻이 아니다. 아래는 2026-10-16 공식 expression 계약이며 네트워크 접속은 시험하지 않았다.

## 주소 한 개와 네트워크 대역을 구분한다

Is valid IPv4와 Is valid IPv6는 String을 받아 Boolean을 반환한다. 두 함수 모두 공개 지원 표는 Batch다.

| 입력 유형 | 문서 예시의 결과 |
|---|---|
| IPv4의 범위 내 네 octet | IPv4 검사 true |
| Octet이 256이거나 구간 수가 다름 | IPv4 검사 false |
| IPv6 압축 표기, 대문자 hex | IPv6 검사 true |
| IPv4를 포함하는 IPv6 형식 | 유효한 예시는 IPv6 검사 true |
| IPv4 `/24`, IPv6 `/64` 등 CIDR | 해당 주소 검사 false |
| 빈 문자열, 공백, null | 두 검사 모두 false |
| 반대 IP 버전 | 해당 버전 검사 false |

IPv4 validator 예시는 사설 주소, loopback, all-zero와 all-ones 주소에도 true를 반환한다. 형식 검사를 보안상 허용 목록이나 라우팅 가능성 검사로 대체하지 않는다. CIDR 지원이 필요하면 주소 한 개의 validator와 별도로 처리한다.

## IPv6 정규화는 타입 변환 뒤 수행한다

IPv6 to canonical format은 String이 아닌 IPv6 logical type을 받아 IPv6를 반환한다. 공개 지원 표도 Batch다. RFC 5952 방식으로 선행 0, 대소문자와 0 구간 압축을 정리하며 null은 null이다.

동일 주소의 여러 표기를 비교하거나 중복 제거하기 전에 이 변환을 사용할 수 있다. 하지만 invalid String의 입력 처리나 logical type cast의 실패 정책은 이 함수 문서에 없으므로, validator의 결과와 typed 입력 생성 조건을 먼저 확인한다. Canonical IPv6를 만든 사실만으로 IPv4 주소와의 동일성까지 판정하지 않는다.

## 출처

- [Palantir, Is valid IPv4](https://www.palantir.com/docs/foundry/pb-functions-expression/isValidIpV4V1)
- [Palantir, Is valid IPv6](https://www.palantir.com/docs/foundry/pb-functions-expression/isValidIpV6V1)
- [Palantir, IPv6 to canonical format](https://www.palantir.com/docs/foundry/pb-functions-expression/ipV6ToCanonicalIpV6V1)

## 관련 문서

- [[Palantir-Pipeline-Expressions|입력 타입과 오류 계약]]
