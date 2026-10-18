---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# FTP, SFTP, SMB, HDFS와 Directory 파일 전송

파일 source는 원본 파일을 보존하며 자동으로 테이블 schema를 적용하지 않는다. filesystem 공통 계약은 symbolic link와 그 아래 디렉터리를 제외한다. 파일 크기 자체의 별도 상한이 없다는 설명과 2일 넘는 cloud sync의 중단을 구별해 작업을 나눈다.

## FTP/FTPS

control port 21 외에 data port 범위와 DNS가 해석하는 IP를 허용해야 한다. Foundry worker에는 passive 방식을 검토한다. active는 legacy agent에서 server가 client로 연결하는 방식이며 HTTP proxy와 맞지 않는다.

explicit FTPS는 기본 21, implicit은 990이며 certificate chain을 신뢰시킨다. stateful proxy/load balancer로 연결 IP가 바뀌는 문제를 확인한다. timestamp에 timezone이 없으면 server timezone과 pattern을 맞추고, 한국어/일본어 파일명은 control encoding을 확인한다. 일부 server는 keepalive NOOP를 지원하지 않는다.

## SFTP

port 22와 사용자/password 또는 private key를 설정한다. administrator가 확인한 server host key를 검증하는 방식과 모든 key 허용을 구별한다. timeout 0은 전체 전송을 무한정 허용하는 옵션이 아니라 각 response/command의 대기 조건이며 server가 계속 응답하면 전체 작업 시간 제한이 되지 않는다.

concurrency는 runtime 한도를 넘길 수 없다. 알고리즘 호환 때문에 확장을 끌 때 필요한 항목만 조정한다. export path에서 Spark prefix를 바꿔 mkdir 권한 요구를 피하는 경우 실제 디렉터리 권한을 확인한다.

legacy source migration은 자동이 아니다. password를 회수할 수 없으며 key file path 대신 key contents를 쓰고 knownHosts file 대신 base64 host key로 옮기는 필드 변경을 확인한다.

## SMB와 HDFS

SMB 2/3는 TCP 445와 원본 allowlist, 필요한 AD domain을 맞춘다. 일반 파일 dataset sync이며 media sync로 간주하지 않는다. Pipeline Builder media 작업에는 실제 MediaSet으로 변환해야 한다.

HDFS는 RPC 기반 hdfs와 webhdfs/swebhdfs의 port가 다르다. 문서의 일반 port 예시는 NameNode 8020/9000, DataNode 1019/50010/50020, WebHDFS 9820이며 실제 cluster 설정을 우선한다. Kerberos 사용 시 명시적인 User가 전역 Kerberos 설정을 덮어쓸 수 있으므로 비워 두는 조건을 확인한다.

HDFS `fileChangeTimeout`보다 `lastModifiedBefore` processor가 효율적인 경우가 있다. legacy export의 retriesPerFile=1은 최초 한 번과 재시도 한 번을 합쳐 두 번 시도한다. incremental은 이전 transaction이 남아 있는지 확인한다.

## Directory와 코드 예제의 복구

Directory connector는 sunset legacy agent 전용이다. Foundry worker의 같은 기능을 가정하지 않고 SFTP/SMB/FTP나 external transform을 검토한다. agent proxy와 private IP host override가 필요한 코드 연결도 있다.

처리 후 삭제는 best effort다. 성공한 정확한 경로를 별도로 기록하고 삭제 결과를 확인해야 삭제 보장이 필요한 흐름을 만들 수 있다. 이 문장은 운영 설계 판단이며 connector 자체의 stronger guarantee가 아니다.

공개 예제의 모든 host key 허용, binary 파일의 text write, basename 충돌, 디렉터리 오류를 잡고 partial list를 반환하는 패턴을 그대로 운영 보장으로 쓰지 않는다. 경로 유일성, bounded memory와 실패 전파를 검증한다.

## 출처

- [Palantir, ftps](https://www.palantir.com/docs/foundry/available-connectors/ftps)
- [Palantir, sftp](https://www.palantir.com/docs/foundry/available-connectors/sftp)
- [Palantir, smb](https://www.palantir.com/docs/foundry/available-connectors/smb)
- [Palantir, hdfs](https://www.palantir.com/docs/foundry/available-connectors/hdfs)
- [Palantir, directory](https://www.palantir.com/docs/foundry/available-connectors/directory)
- [Palantir, filesystem](https://www.palantir.com/docs/foundry/available-connectors/filesystem)

## 관련 문서

- [[Palantir-Connector-Contracts]]
