import { createReadStream, createWriteStream } from 'node:fs';
import { access, mkdtemp, rm } from 'node:fs/promises';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function main() {
  let workDirectory;

  try {
    workDirectory = await mkdtemp(join(tmpdir(), 'node-fs-stream-'));
    const file = join(workDirectory, 'text.txt');

    // Create a writable stream to write data to an isolated temporary file.
    const writeStream = createWriteStream(file);
    const writeFinished = once(writeStream, 'finish');
    const writeClosed = once(writeStream, 'close');
    writeStream.write('Hello, World!\n');
    writeStream.write('Welcome to Node.js file system module.\n');
    writeStream.end('This is a test file.');
    await Promise.all([writeFinished, writeClosed]);

    await access(file);
    console.log('File exists');

    // Create a readable stream only after the write stream has finished.
    const readStream = createReadStream(file, { encoding: 'utf8' });
    const readEnded = once(readStream, 'end');
    const readClosed = once(readStream, 'close');
    let contents = '';
    readStream.on('data', (chunk) => {
      contents += chunk;
    });
    await Promise.all([readEnded, readClosed]);

    if (!contents.includes('Hello, World!')) {
      throw new Error('Unexpected file contents');
    }
    console.log('Read contents:', contents);
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
