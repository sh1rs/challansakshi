import type { NextConfig } from 'next';

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
];

// Speech has no upload endpoint. Only the isolated recognizer may fetch the
// pinned public model; the document page keeps connect-src 'self'.
const recognitionWorkerPolicy = [
  "default-src 'none'", "script-src 'self' 'wasm-unsafe-eval'",
  "connect-src 'self' https://huggingface.co https://cdn-lfs.huggingface.co https://cdn-lfs-us-1.huggingface.co https://cas-bridge.xethub.hf.co https://us.aws.cdn.hf.co",
].join('; ');
const compactWorkerPolicy = "default-src 'none'; script-src 'self' 'unsafe-eval'; connect-src 'self'";

const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      // Vinext keeps the first matched value for a response header. Route and
      // worker exceptions must precede the common defaults below.
      { source: '/review', headers: [{ key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(), payment=(), usb=()' }] },
      { source: '/voice/voice-recognition.worker.js', headers: [{ key: 'Content-Security-Policy', value: recognitionWorkerPolicy }] },
      // This unmodified GPL runtime uses eval internally. It is confined to its
      // own worker; page scripts do not receive unsafe-eval or remote access.
      { source: '/voice-assets/espeak-ng-1.49.1/espeakng.worker.js', headers: [{ key: 'Content-Security-Policy', value: compactWorkerPolicy }] },
      { source: '/(.*)', headers: securityHeaders },
    ];
  },
} satisfies NextConfig;

export default nextConfig;
