---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-11-12
category: "AI엔지니어링(AIEngineering)"
---

# FTP, SFTP, SMB, HDFS, NFS와 Directory 파일 전송

파일 source는 원본 파일을 보존하며 자동으로 테이블 schema를 적용하지 않는다. agent 수준 filesystem source는 symbolic link와 그 아래 디렉터리를 모두 제외하고, NFS connector는 옵션을 켜면 export 안의 link를 따른다. 파일 크기 자체의 별도 상한이 없다는 설명과 2일 넘는 cloud sync의 중단을 구별해 작업을 나눈다.

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

## NFS

2026-11-12 공식 문서 기준 NFS connector는 beta이며 enrollment에 따라 없을 수 있다. NFS 3과 4.1을 지원하고 exploration, bulk import, incremental은 beta, file export는 지원하지 않는다. 파일 형식을 보존하고 schema를 적용하지 않으며 media set sync도 지원하지 않는다. on-premises server는 agent proxy 연결을 권장한다.

버전 선택이 보안 경계를 정한다. NFSv4.1은 한 port(기본 2049)에서 RPC over TLS(RFC 9289)와 Kerberos를 써 연결 전체를 보호할 수 있어 server가 지원하면 권장된다. NFSv3은 NFS, MOUNT, NLM(lock), NSM(status) 네 RPC service가 각자 port와 TLS 설정을 가져 하나에 TLS를 켜도 나머지는 평문이다. portmapper(기본 111) 트래픽은 암호화되지 않는다. portmapper로 port를 찾는 service는 egress policy를 미리 정할 수 없으므로 server와 source에 고정 port를 지정한다.

| 인증 | 조건 | 보호 범위 |
|---|---|---|
| `AUTH_SYS` | NFSv3은 항상, NFSv4.1은 선택 | server가 UID/GID를 검증하지 않아 export 권한만이 접근을 정한다. 기본 0/0은 root squash가 없는 export에서만 root 권한이 된다 |
| Kerberos `krb5` | NFSv4.1, password 인증 | 연결 인증만, 요청과 파일은 무결성 보호와 암호화 없음 |
| Kerberos `krb5i` | 같음 | 요청 무결성 보호, 파일 내용은 평문 |
| Kerberos `krb5p` | 같음, TLS를 켜면 이 수준만 허용 | RPC payload 암호화 |

TLS도 `krb5p`도 켜지 않으면 파일 내용이 평문으로 전송되므로 전체 네트워크 경로를 신뢰할 때만 쓴다. TLS를 켰는데 server가 RPC over TLS를 지원하지 않으면 연결이 실패한다. connector는 server certificate와 SAN의 `Host` 일치를 검증하며, 사설 CA나 self-signed certificate는 source에 추가하고 mTLS면 client certificate를 넣는다. Kerberos는 KDC(기본 88)도 egress에 허용한다.

sync는 선택한 subfolder 아래를 재귀로 걷는다. include/exclude glob은 export root 기준 상대 경로에 맞추고 exclude가 우선한다. symbolic link는 기본으로 건너뛰며 따라가도 export 밖 대상은 제외한다. 크기, 수정 시각, 깊이 필터 뒤 `Order by`와 `Maximum files per run`으로 가장 오래된 100개 같은 조건을 만든다.

incremental은 마지막으로 sync한 파일 중 가장 새 수정 시각을 기록하고 다음 run은 그 이후만 가져온다. 시각은 NFS server가 보고한 값이라 connector와 server의 시계 차이에 의존하지 않는다. 파일 수 제한을 함께 쓰면 오래된 순으로 이어 받고 같은 수정 시각에서 끊겨도 건너뛰지 않는다고 문서는 밝힌다. 이때 `Order by`는 비우거나 `Last modified` 오름차순이어야 하며 다른 순서는 sync를 실패시킨다. transaction은 `APPEND`나 `UPDATE`를 쓴다. 기본 `SNAPSHOT`은 매 run이 그 run에서 찾은 파일만으로 dataset을 대체한다. `Modified after` 필터는 incremental과 별개로 매 run 적용된다.

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
- [Palantir, nfs](https://www.palantir.com/docs/foundry/available-connectors/nfs)
- [RFC 9289, Towards Remote Procedure Call Encryption by Default](https://www.rfc-editor.org/rfc/rfc9289)

## 관련 문서

- [[Palantir-Connector-Contracts]]
