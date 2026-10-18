---
tags: [palantir, foundry, connectors, ibm]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# IBM Cloud Data Engine의 region endpoint 매핑

같은 endpoint를 쓰는 region 별칭을 묶었다. 이 값은 직접 연결에 허용할 전체 hostname이 아니라 source의 Region을 object-storage endpoint 식별자로 바꾸는 매핑이다. IBM source의 CRN과 driver 버전에 따른 조건을 함께 확인한다.

| endpoint 식별자 | 해당 Region 값 |
|---|---|
| s3.us | us, us-standard, us-cold, us-flex, us-smart, us-vault, us-geo, us-geo-cold, us-geo-flex, us-geo-smart, us-geo-vault, us-geo-standard |
| s3.dal.us | us-dallas, us-dallas-cold, us-dallas-flex, us-dallas-smart, us-dallas-vault, us-dallas-standard, dal-us-geo, dal-us-geo-cold, dal-us-geo-flex, dal-us-geo-smart, dal-us-geo-vault, dal-us-geo-standard |
| s3.sjc.us | us-sanjose, us-sanjose-cold, us-sanjose-flex, us-sanjose-smart, us-sanjose-vault, us-sanjose-standard, sjc-us-geo, sjc-us-geo-cold, sjc-us-geo-flex, sjc-us-geo-smart, sjc-us-geo-vault, sjc-us-geo-standard |
| s3.wdc.us | us-washington, us-washington-cold, us-washington-flex, us-washington-smart, us-washington-vault, us-washington-standard, wdc-us-geo, wdc-us-geo-cold, wdc-us-geo-flex, wdc-us-geo-smart, wdc-us-geo-vault, wdc-us-geo-standard |
| s3.us-south | us-south, us-south-cold, us-south-flex, us-south-smart, us-south-vault, us-south-standard |
| s3.us-east | us-east, us-east-standard, us-east-cold, us-east-flex, us-east-smart, us-east-vault |
| s3.eu | eu, eu-cold, eu-flex, eu-smart, eu-vault, eu-standard, eu-geo, eu-geo-cold, eu-geo-flex, eu-geo-smart, eu-geo-vault, eu-geo-standard |
| s3.ams.eu | eu-amsterdam, eu-amsterdam-cold, eu-amsterdam-flex, eu-amsterdam-smart, eu-amsterdam-vault, eu-amsterdam-standard, ams-eu-geo, ams-eu-geo-cold, ams-eu-geo-flex, ams-eu-geo-smart, ams-eu-geo-vault, ams-eu-geo-standard |
| s3.fra.eu | eu-frankfurt, eu-frankfurt-cold, eu-frankfurt-flex, eu-frankfurt-smart, eu-frankfurt-vault, eu-frankfurt-standard, fra-eu-geo, fra-eu-geo-cold, fra-eu-geo-flex, fra-eu-geo-smart, fra-eu-geo-vault, fra-eu-geo-standard |
| s3.mil.eu | eu-milan, eu-milan-cold, eu-milan-flex, eu-milan-smart, eu-milan-vault, eu-milan-standard, mil-eu-geo, mil-eu-geo-cold, mil-eu-geo-flex, mil-eu-geo-smart, mil-eu-geo-vault, mil-eu-geo-standard |
| s3.eu-gb | eu-gb, eu-gb-cold, eu-gb-flex, eu-gb-smart, eu-gb-vault, eu-gb-standard |
| s3.eu-de | eu-germany, eu-germany-cold, eu-germany-flex, eu-germany-smart, eu-germany-vault, eu-germany-standard, eu-de, eu-de-cold, eu-de-flex, eu-de-smart, eu-de-vault, eu-de-standard |
| s3.ap | ap, ap-cold, ap-flex, ap-smart, ap-vault, ap-standard, ap-geo, ap-geo-cold, ap-geo-flex, ap-geo-smart, ap-geo-vault, ap-geo-standard |
| s3.tok.ap | ap-tokyo, ap-tokyo-cold, ap-tokyo-flex, ap-tokyo-smart, ap-tokyo-vault, ap-tokyo-standard, tok-ap-geo, tok-ap-geo-cold, tok-ap-geo-flex, tok-ap-geo-smart, tok-ap-geo-vault, tok-ap-geo-standard |
| s3.seo.ap | ap-seoul, ap-seoul-cold, ap-seoul-flex, ap-seoul-smart, ap-seoul-vault, ap-seoul-standard, seo-ap-geo, seo-ap-geo-cold, seo-ap-geo-flex, seo-ap-geo-smart, seo-ap-geo-vault, seo-ap-geo-standard |
| s3.hkg.ap | ap-hongkong, ap-hongkong-cold, ap-hongkong-flex, ap-hongkong-smart, ap-hongkong-vault, ap-hongkong-standard, hkg-ap-geo, hkg-ap-geo-cold, hkg-ap-geo-flex, hkg-ap-geo-smart, hkg-ap-geo-vault, hkg-ap-geo-standard |
| s3.jp-tok | ap-japan, ap-japan-cold, ap-japan-flex, ap-japan-smart, ap-japan-vault, ap-japan-standard, jp-tok, jp-tok-cold, jp-tok-flex, jp-tok-smart, jp-tok-vault, jp-tok-standard |
| s3.jp-osa | jp-osa, jp-osa-cold, jp-osa-flex, jp-osa-smart, jp-osa-vault, jp-osa-standard |
| s3.au-syd | ap-sydney, ap-sydney-cold, ap-sydney-flex, ap-sydney-smart, ap-sydney-vault, ap-sydney-standard, au-syd, au-syd-cold, au-syd-flex, au-syd-smart, au-syd-vault, au-syd-standard |
| s3.ams03 | ams03, ams03-cold, ams03-flex, ams03-smart, ams03-vault, ams03-standard |
| s3.che01 | che01, che01-cold, che01-flex, che01-smart, che01-vault, che01-standard |
| s3.hkg02 | hkg02, hkg02-cold, hkg02-flex, hkg02-smart, hkg02-vault, hkg02-standard |
| s3.mel01 | mel01, mel01-cold, mel01-flex, mel01-smart, mel01-vault, mel01-standard |
| s3.osl01 | osl01, osl01-cold, osl01-flex, osl01-smart, osl01-vault, osl01-standard |
| s3.sao01 | sao01, sao01-cold, sao01-flex, sao01-smart, sao01-vault, sao01-standard |
| s3.tor01 | tor01, tor01-cold, tor01-flex, tor01-smart, tor01-vault, tor01-standard |
| s3.seo01 | seo01, seo01-cold, seo01-flex, seo01-smart, seo01-vault, seo01-standard |
| s3.sng01 | sng01, sng01-cold, sng01-flex, sng01-smart, sng01-vault, sng01-standard |
| s3.mon01 | mon01, mon01-cold, mon01-flex, mon01-smart, mon01-vault, mon01-standard |
| s3.mex01 | mex01, mex01-cold, mex01-flex, mex01-smart, mex01-vault, mex01-standard |
| s3.mil01 | mil01, mil01-cold, mil01-flex, mil01-smart, mil01-vault, mil01-standard |
| s3.par01 | par01, par01-cold, par01-flex, par01-smart, par01-vault, par01-standard |
| s3.sjc04 | sjc04, sjc04-cold, sjc04-flex, sjc04-smart, sjc04-vault, sjc04-standard |
| s3.ca-tor | ca-tor, ca-tor-cold, ca-tor-flex, ca-tor-smart, ca-tor-vault, ca-tor-standard |
| s3.br-sao | br-sao, br-sao-cold, br-sao-flex, br-sao-smart, br-sao-vault, br-sao-standard |

## 출처

- [Palantir, IBM Cloud Data Engine](https://www.palantir.com/docs/foundry/available-connectors/ibm-cloud-data-engine)

## 관련 문서

- [[Palantir-Driver-Contracts-12]]
- [[Palantir-Driver-Reference]]
