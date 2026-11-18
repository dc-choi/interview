---
tags: [cs, fundamentals, data-representation, encoding, base64, jsonl, checksum, hash]
status: index
category: "CS - 기초"
aliases: ["CS Data Representation", "데이터 표현", "비트 표현과 무결성 검사"]
---

# 데이터 표현: 비트, 인코딩, 무결성 검사

같은 비트열도 비트 폭, 부호 여부, 인코딩과 바이트 순서에 따라 다른 값이 된다. 숫자, 문자와 미디어를 비트로 나타내는 규칙에서 출발해 바이너리를 문자만 받는 필드로 옮기는 Base64, 여러 값을 줄 단위로 이어 적는 JSON Lines, 임의 길이의 데이터를 짧은 고정 길이 값으로 요약해 다시 계산하고 비교하는 체크섬, CRC와 해시, 중복을 더해 받는 쪽이 손상된 비트를 고치게 하는 오류 정정 부호로 이어진다.

## 목차

- [x] [[Digital-Fundamentals|디지털 기초 (비트, 진법, 정수 표현, 엔디언, 문자, 이미지, 소리, 영상의 비트 표현)]]
- [x] [[Unicode-Combining-Marks|결합 문자와 무한히 쌓이는 텍스트 (결합 부호 개수 제한 없음, grapheme 크기, Zalgo 텍스트 방어)]]
- [x] [[Base64-Encoding|Base64 (바이너리의 텍스트 표현, 패딩과 크기, Base64url, HTTP 파일 전송)]]
- [x] [[JSON-Lines|JSON Lines (한 줄에 한 레코드, NDJSON과 JSON Text Sequences, 덧붙이기의 보장 범위, 깨진 줄 처리, 덧붙이기 전용 기록)]]
- [x] [[Checksum-and-Hash|체크섬과 해시 (모듈러 합, 인터넷 체크섬, CRC, 일반 해시와 암호학적 해시, HMAC과 서명, 웹훅 서명 검증)]]
- [x] [[Error-Correcting-Codes|오류 정정 부호 (반복 부호와 다수결, 해밍 거리의 검출과 정정 한계, 블록 부호와 버스트, 재전송과 FEC의 선택, 메모리 EDAC와 스크러빙)]]

## 관련 문서

- [[기초(Fundamentals)|컴퓨터기초(Fundamentals)]]
- [[CS-Computer-Architecture|컴퓨터 구조: 논리회로, 메모리, CPU]]
