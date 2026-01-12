import { writeFile, readFile, appendFile, access, unlink, readdir, stat, mkdir, rename, copyFile, rmdir, rm } from 'node:fs/promises';
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from 'node:url';

try {
    // ESM 환경에서 현재 모듈의 URL(import.meta.url)을 실제 파일 시스템 경로로 변환한다.
    const __filename = fileURLToPath(import.meta.url);
    console.log(__filename);
    // 현재 파일 경로에서 디렉터리 경로를 추출해 __dirname과 동일한 역할을 만든다.
    const __dirname = dirname(__filename);
    console.log(__dirname);

    // 지정한 경로의 디렉터리를 생성한다. recursive 옵션으로 상위 디렉터리까지 함께 만든다.
    await mkdir(join(__dirname, 'file'), { recursive: true });

    // 파일/디렉터리 이름을 변경한다(경로를 바꾸면 이동과 동일한 효과).
    await rename('file', 'files');

    // 디렉터리 안의 파일/폴더 목록을 읽어 배열로 반환한다.
    console.log(await readdir(__dirname));

    // 파일 메타데이터(크기, 권한, 수정 시간 등)를 가져온다.
    const info = await stat(__filename);
    console.log('File info:', info);

    // 파일을 새로 만들거나(없으면 생성) 기존 내용을 덮어쓴다.
    await writeFile('hello.txt', 'i am backend\n');

    // 파일을 지정한 경로로 복사한다.
    await copyFile('hello.txt', 'backup.txt');

    // 디렉터리를 삭제한다. recursive 옵션으로 내부 항목까지 함께 삭제한다.
    await rmdir(join(__dirname, 'files'), { recursive: true });

    // 파일 또는 디렉터리를 삭제한다. recursive 옵션 사용 시 하위 항목까지 삭제한다.
    await rm('backup.txt', { recursive: true });

    // 파일 접근 가능 여부를 확인한다(없거나 권한 문제면 에러 발생).
    await access('hello.txt');
    console.log('File exists');

    // 파일 내용을 UTF-8 문자열로 읽어온다.
    const data = await readFile('hello.txt', 'utf8');
    console.log('File contents:', data);

    // 기존 파일의 끝에 내용을 추가한다.
    await appendFile('hello.txt', 'my name is choi dong chul');

    // 파일을 삭제한다.
    await unlink('hello.txt');
    console.log('File deleted successfully');

    // 경로 조각들을 OS 규칙에 맞게 안전하게 결합한다.
    console.log(join('files', 'hello.txt'));
    // 기준 디렉터리와 파일 경로를 결합해 정규화된 경로를 만든다.
    console.log(join(__dirname, __filename));

    // 입력 경로를 절대 경로로 해석해 반환한다(앞 인자를 기준으로 해석).
    console.log(resolve(__dirname, __filename));
} catch (err) {
    console.error('Error:', err);
}
