---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Hosting API route 진단"]
---

# EAS Hosting API route 진단

API route 구현은 [[Expo-Router-API-Routes]], 여기서는 Hosting Dashboard의 관찰 범위를 정리한다. 처리 중 uncaught error로 response를 반환하지 못하면 crash다. 비슷한 crash는 묶이며 첫/마지막 발생의 stack trace와 metadata를 표시한다.

## Logs, requests와 request ID

console.log/info/error 등의 로그는 Hosting deployments→배포→Logs에 기록된다. Requests는 project와 배포 단위로 조회하며 API를 포함한 모든 service request의 status/browser/region/duration 등을 제공한다.

response의 Cf-Ray 예시 8ffb63895cf6779b-LHR에서 앞 부분이 request ID다. Hosting→Requests filter에서 ID를 찾아 client 오류, server logs와 배포를 연결한다. service-level error page에도 ID가 표시된다.

## Sampling과 한계

traffic이 많아지면 요청, 로그와 crash 기록이 downsample된다. 개별 요청이 보이지 않아도 처리되지 않았다는 뜻은 아니다. 통계 counts는 전체를 비례 추정하므로 추정치와 개별 사건의 직접 증거를 구분한다. cache hit도 request metrics와 quota에 포함된다. logs에 secret/token/PII를 출력하지 않는다.

## 출처

- [Expo Documentation, API Routes](https://docs.expo.dev/eas/hosting/api-routes)

## 관련 문서

- [[Expo-EAS-Hosting-Headers]]
- [[Expo-EAS-Hosting-Cache]]
