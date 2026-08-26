import {
  appendFile,
  access,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

async function main() {
  const filename = fileURLToPath(import.meta.url);
  const moduleDirectory = dirname(filename);
  let workDirectory;

  try {
    // ESM 환경에서 현재 모듈의 URL(import.meta.url)을 실제 파일 시스템 경로로 변환한다.
    console.log(filename);
    // 현재 파일 경로에서 디렉터리 경로를 추출해 __dirname과 동일한 역할을 만든다.
    console.log(moduleDirectory);

    // 예제 파일은 OS 임시 디렉터리에만 만든다. 저장소와 현재 작업 디렉터리는 건드리지 않는다.
    workDirectory = await mkdtemp(join(tmpdir(), 'node-fs-example-'));
    const sourceDirectory = join(workDirectory, 'file');
    const renamedDirectory = join(workDirectory, 'files');
    const helloPath = join(workDirectory, 'hello.txt');
    const backupPath = join(workDirectory, 'backup.txt');

    // 지정한 경로의 디렉터리를 생성한다. recursive 옵션으로 상위 디렉터리까지 함께 만든다.
    await mkdir(sourceDirectory, { recursive: true });

    // 파일/디렉터리 이름을 변경한다(경로를 바꾸면 이동과 동일한 효과).
    await rename(sourceDirectory, renamedDirectory);

    // 디렉터리 안의 파일/폴더 목록을 읽어 배열로 반환한다.
    console.log(await readdir(workDirectory));

    // 파일 메타데이터(크기, 권한, 수정 시간 등)를 가져온다.
    const info = await stat(filename);
    console.log('File info:', info);

    // 파일을 새로 만들거나(없으면 생성) 기존 내용을 덮어쓴다.
    await writeFile(helloPath, 'i am os-runtime\n');

    // 파일을 지정한 경로로 복사한다.
    await copyFile(helloPath, backupPath);

    // 디렉터리를 삭제한다. recursive 옵션으로 내부 항목까지 함께 삭제한다.
    await rm(renamedDirectory, { recursive: true });

    // 파일 또는 디렉터리를 삭제한다. recursive 옵션 사용 시 하위 항목까지 삭제한다.
    await rm(backupPath);

    // 파일 접근 가능 여부를 확인한다(없거나 권한 문제면 에러 발생).
    await access(helloPath);
    console.log('File exists');

    // 파일 내용을 UTF-8 문자열로 읽어온다.
    const data = await readFile(helloPath, 'utf8');
    if (data !== 'i am os-runtime\n') {
      throw new Error('Unexpected file contents');
    }
    console.log('File contents:', data);

    // 기존 파일의 끝에 내용을 추가한다.
    await appendFile(helloPath, 'hello from Node.js');

    // 파일을 삭제한다.
    await unlink(helloPath);
    console.log('File deleted successfully');

    // 경로 조각들을 OS 규칙에 맞게 안전하게 결합한다.
    console.log(join(workDirectory, 'files', 'hello.txt'));
    // 기준 디렉터리와 파일 경로를 결합해 정규화된 절대 경로를 만든다.
    console.log(resolve(moduleDirectory, 'file.js'));
  } catch (error) {
    console.error('Error:', error);
    process.exitCode = 1;
  } finally {
    if (workDirectory) {
      try {
        await rm(workDirectory, { recursive: true, force: true });
      } catch (error) {
        console.error('Cleanup error:', error);
        process.exitCode = 1;
      }
    }
  }
}

await main();
