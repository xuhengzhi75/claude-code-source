// services/oauth/crypto.ts — OAuth PKCE 加密工具
// 职责：为 OAuth 2.0 PKCE 流程提供加密原语，
// 生成 code_verifier 和 code_challenge。
//
// PKCE 流程：
//   1. generateCodeVerifier()：生成 32 字节随机数，base64url 编码
//      → 发送给授权服务器（code_challenge 的原始值）
//   2. generateCodeChallenge(verifier)：SHA-256(verifier)，base64url 编码
//      → 附在授权请求 URL 中（公开传输，安全）
//
// base64url 编码规则（RFC 4648）：
//   - '+' → '-'，'/' → '_'，去掉末尾 '='
//   - 与标准 base64 的区别：URL 安全，无需 percent-encoding
import { createHash, randomBytes } from 'crypto'

function base64URLEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export function generateCodeVerifier(): string {
  return base64URLEncode(randomBytes(32))
}

export function generateCodeChallenge(verifier: string): string {
  const hash = createHash('sha256')
  hash.update(verifier)
  return base64URLEncode(hash.digest())
}

export function generateState(): string {
  return base64URLEncode(randomBytes(32))
}
