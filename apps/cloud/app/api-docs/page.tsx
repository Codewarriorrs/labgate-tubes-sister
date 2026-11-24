'use client';

import React, { useEffect, useRef } from 'react';

export default function ApiDocsPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load Swagger UI CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui.css';
    document.head.appendChild(link);

    // Load Swagger UI Bundle
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-bundle.js';
    script.onload = () => {
      // @ts-ignore
      if (window.SwaggerUIBundle) {
        // @ts-ignore
        window.SwaggerUIBundle({
          url: '/api/openapi',
          domNode: containerRef.current,
          deepLinking: true,
          presets: [
            // @ts-ignore
            window.SwaggerUIBundle.presets.apis,
            // @ts-ignore
            window.SwaggerUIBundle.SwaggerUIStandalonePreset,
          ],
          layout: 'BaseLayout',
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[4px] overflow-hidden">
      <div className="px-6 py-4 bg-[#1A1A1A] text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-base sm:text-lg font-bold tracking-tight">Dokumentasi Interaktif API (Swagger UI)</h1>
          <p className="text-xs text-gray-300">
            OpenAPI 3.0 Spesifikasi Teknis &bull; Inter-Service REST & Endpoint Pengguna
          </p>
        </div>
        <a
          href="/api/openapi"
          target="_blank"
          download="openapi.yaml"
          className="btn-accent px-3 py-1.5 text-xs font-semibold"
        >
          Unduh openapi.yaml
        </a>
      </div>
      <div ref={containerRef} className="p-4" />
    </div>
  );
}
