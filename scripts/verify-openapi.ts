import fs from 'fs';
import path from 'path';

console.log('=== PEMERIKSAAN KESESUAIAN KODE DENGAN OPENAPI SPEC (scripts/verify-openapi.ts) ===\n');

const apiRootDir = path.resolve(__dirname, '../apps/cloud/app/api');
const openApiPath = path.resolve(__dirname, '../docs/openapi.yaml');

if (!fs.existsSync(apiRootDir)) {
  console.error(`Direktori API tidak ditemukan: ${apiRootDir}`);
  process.exit(1);
}

if (!fs.existsSync(openApiPath)) {
  console.error(`File openapi.yaml tidak ditemukan: ${openApiPath}`);
  process.exit(1);
}

// 1. Scan semua route di kode Next.js
interface CodeEndpoint {
  path: string;
  methods: string[];
}

const codeEndpoints: CodeEndpoint[] = [];

function scanDirectory(dir: string, baseRoute: string = '/api') {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      let routeSegment = item;
      if (routeSegment.startsWith('[') && routeSegment.endsWith(']')) {
        routeSegment = `{${routeSegment.slice(1, -1)}}`;
      }
      scanDirectory(fullPath, `${baseRoute}/${routeSegment}`);
    } else if (item === 'route.ts' || item === 'route.js') {
      const content = fs.readFileSync(fullPath, 'utf8');
      const methods: string[] = [];
      if (/export\s+async\s+function\s+GET\b/i.test(content)) methods.push('get');
      if (/export\s+async\s+function\s+POST\b/i.test(content)) methods.push('post');
      if (/export\s+async\s+function\s+PUT\b/i.test(content)) methods.push('put');
      if (/export\s+async\s+function\s+DELETE\b/i.test(content)) methods.push('delete');

      // Kecualikan /api/openapi internal spec reader dari penilaian antarmuka publik
      if (baseRoute !== '/api/openapi') {
        codeEndpoints.push({ path: baseRoute, methods });
      }
    }
  }
}

scanDirectory(apiRootDir);

// 2. Parse paths dari openapi.yaml
const openApiContent = fs.readFileSync(openApiPath, 'utf8');
const openApiEndpoints: { path: string; method: string }[] = [];

const lines = openApiContent.split('\n');
let currentPath: string | null = null;
let inPaths = false;

for (const line of lines) {
  if (/^paths:/.test(line)) {
    inPaths = true;
    continue;
  }
  if (inPaths) {
    if (/^[a-zA-Z0-9_-]+:/.test(line) && !line.startsWith('  ')) {
      // Keluar dari blok paths
      inPaths = false;
      break;
    }

    const pathMatch = line.match(/^\s{2}(\/api\/[a-zA-Z0-9_\-\/{}\.]+):/);
    if (pathMatch) {
      currentPath = pathMatch[1];
      continue;
    }

    const methodMatch = line.match(/^\s{4}(get|post|put|delete):/);
    if (methodMatch && currentPath) {
      openApiEndpoints.push({ path: currentPath, method: methodMatch[1].toLowerCase() });
    }
  }
}

// 3. Bandingkan
const codePairs: string[] = [];
for (const ep of codeEndpoints) {
  for (const m of ep.methods) {
    codePairs.push(`${m.toUpperCase()} ${ep.path}`);
  }
}

const openApiPairs: string[] = openApiEndpoints.map((ep) => `${ep.method.toUpperCase()} ${ep.path}`);

const missingInOpenApi = codePairs.filter((p) => !openApiPairs.includes(p));
const extraInOpenApi = openApiPairs.filter((p) => !codePairs.includes(p));

console.log(`Ditemukan ${codePairs.length} endpoint pada kode aplikasi Cloud:`);
codePairs.sort().forEach((p) => console.log(`  ✓ ${p}`));

console.log(`\nDitemukan ${openApiPairs.length} endpoint pada docs/openapi.yaml:`);
openApiPairs.sort().forEach((p) => console.log(`  ✓ ${p}`));

let hasError = false;

if (missingInOpenApi.length > 0) {
  hasError = true;
  console.error('\n[ERROR] Endpoint ada di kode tetapi BELUM ADA di openapi.yaml:');
  missingInOpenApi.forEach((p) => console.error(`  ✗ ${p}`));
}

if (extraInOpenApi.length > 0) {
  hasError = true;
  console.error('\n[ERROR] Endpoint tercatat di openapi.yaml tetapi TIDAK DITEMUKAN di kode:');
  extraInOpenApi.forEach((p) => console.error(`  ✗ ${p}`));
}

if (!hasError) {
  console.log('\n[BERHASIL] Semua endpoint di kode selaras 100% dengan docs/openapi.yaml!');
  process.exit(0);
} else {
  console.error('\n[GAGAL] Verifikasi OpenAPI tidak lulus.');
  process.exit(1);
}
