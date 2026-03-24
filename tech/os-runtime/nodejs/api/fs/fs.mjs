import {mkdir, access, constants, createReadStream, createWriteStream} from 'node:fs';
import {fileURLToPath} from "node:url";
import path from "node:path";

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

// make directory 'test' if it doesn't exist
mkdir(`${__dirname}/test`, { recursive: true }, (err) => {
  if (err) throw err;
});

const file = `${__dirname}/test/text.txt`;

// Create a writable stream to write data to the file
const writeStream = createWriteStream(file);

// Write some data to the file
writeStream.write('Hello, World!\n');
writeStream.write('Welcome to Node.js file system module.\n');
writeStream.write('This is a test file.');
writeStream.end();

// Create a readable stream to read data from the file
writeStream.on('finish', () => {
  const readStream = createReadStream(file, { encoding: 'utf8' });

  readStream.on('data', (chunk) => {
    console.log('Read chunk:', chunk);
  });

  readStream.on('end', () => {
    console.log('Finished reading the file.');
  });
});

access(file, constants.F_OK, (err) => {
  console.log(err ? 'File does not exist' : 'File exists');
});