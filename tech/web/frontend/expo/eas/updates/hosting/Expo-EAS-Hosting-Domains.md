---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Hosting custom domain과 DNS"]
---

# EAS Hosting custom domain과 DNS

Paid plan의 project는 production deployment에 custom domain 하나를 연결할 수 있다. 먼저 production 배포가 있어야 하며 apex와 subdomain을 모두 지원한다. Hosting settings에서 소유한 domain을 입력하고 Dashboard가 제시하는 실제 DNS 값으로 검증한다.

## 소유권, SSL과 traffic 전환

Verification TXT는 domain 소유권을, SSL CNAME은 certificate authority의 Domain Control Validation과 자동 renewal을 증명한다. example.com의 검증 이름은 _cf-custom-hostname.example.com/_acme-challenge.example.com이며 subdomain이면 그 아래에 생성한다.

원문의 routing 예시는 apex A=172.66.0.241, subdomain CNAME=origin.expo.app이다. 실제 적용 시 Dashboard의 값이 우선이며 일부 DNS provider는 apex CNAME을 허용하지 않는다. 중단 없이 전환하려면 TXT 추가→Refresh 확인→SSL CNAME 추가→확인→routing record 순서를 지킨다. 모두 한 번에 추가하면 검증/SSL 완료 전 traffic이 전환될 수 있다.

## Alias와 wildcard

custom domain 하나를 유지하면서 staging.example.com→origin.expo.app의 CNAME으로 staging alias를 연결할 수 있다. custom domain이 anything.example.com이면 staging.anything.example.com을 사용한다. *.example.com 또는 *.anything.example.com wildcard는 subdomain 이름과 같은 alias를 찾는다. wildcard DNS 자체가 없는 alias의 배포를 생성하지는 않는다.

www alias가 없고 www subdomain을 설정하면 custom domain으로 HTTP308 redirect하여 production을 사용한다. www alias가 있으면 해당 alias가 우선한다. 2025-03-19 이전 설정은 Hosting settings의 Refresh 후 wildcard 절차를 따른다. DNS 전파와 certificate 검증은 별도로 확인한다.

## 출처

- [Expo Documentation, Custom domain](https://docs.expo.dev/eas/hosting/custom-domain)

## 관련 문서

- [[Expo-EAS-Hosting-Aliases]]
