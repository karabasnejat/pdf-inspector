import { createWriteStream } from 'node:fs';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import https from 'node:https';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const manifestPath = join(root, 'benchmarks/anydoc/manifest.json');
const corpusDir = join(root, 'benchmarks/anydoc/corpus');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

function download(url, destination) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'pdf-inspector-anydoc-benchmark' } }, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        download(response.headers.location, destination).then(resolve, reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode} while downloading ${url}`));
        response.resume();
        return;
      }

      pipeline(response, createWriteStream(destination)).then(resolve, reject);
    }).on('error', reject);
  });
}

await mkdir(corpusDir, { recursive: true });

for (const item of manifest.files) {
  const fileName = `${item.id}.${item.format}`;
  const destination = join(corpusDir, fileName);

  try {
    const existing = await stat(destination);
    if (existing.size > 0) {
      console.log(`skip ${fileName} (${existing.size} bytes)`);
      continue;
    }
  } catch {
    await mkdir(dirname(destination), { recursive: true });
  }

  console.log(`download ${fileName} <- ${basename(item.url)}`);
  await download(item.url, destination);
}
