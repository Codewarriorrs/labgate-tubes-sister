import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const yamlPath = path.resolve(process.cwd(), '../../docs/openapi.yaml');
    let content = '';
    if (fs.existsSync(yamlPath)) {
      content = fs.readFileSync(yamlPath, 'utf8');
    } else {
      // Fallback path dalam deployment Vercel
      const localYamlPath = path.resolve(process.cwd(), 'docs/openapi.yaml');
      if (fs.existsSync(localYamlPath)) {
        content = fs.readFileSync(localYamlPath, 'utf8');
      }
    }

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/yaml; charset=utf-8',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: 'Gagal memuat OpenAPI spec', error: err.message }, { status: 500 });
  }
}
