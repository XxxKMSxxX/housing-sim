#!/usr/bin/env node
/**
 * content.html を暗号化して index.html に埋め込むスクリプト
 *
 * 使い方:
 *   node encrypt.js <パスワード>
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// CryptoJS互換のAES暗号化（OpenSSL形式）
function encryptCryptoJSCompat(plaintext, password) {
  const salt = crypto.randomBytes(8);
  const { key, iv } = evpBytesToKey(password, salt, 32, 16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  // OpenSSL形式: "Salted__" + salt + ciphertext
  const result = Buffer.concat([
    Buffer.from('Salted__', 'ascii'),
    salt,
    encrypted,
  ]);
  return result.toString('base64');
}

function evpBytesToKey(password, salt, keyLen, ivLen) {
  const passBuffer = Buffer.from(password, 'utf8');
  let totalLen = keyLen + ivLen;
  let derived = Buffer.alloc(0);
  let block = Buffer.alloc(0);
  while (derived.length < totalLen) {
    block = crypto
      .createHash('md5')
      .update(Buffer.concat([block, passBuffer, salt]))
      .digest();
    derived = Buffer.concat([derived, block]);
  }
  return {
    key: derived.subarray(0, keyLen),
    iv: derived.subarray(keyLen, keyLen + ivLen),
  };
}

// メイン処理
const password = process.argv[2];
if (!password) {
  console.error('使い方: node encrypt.js <パスワード>');
  process.exit(1);
}

const contentPath = path.join(__dirname, 'content.html');
const indexPath = path.join(__dirname, 'index.html');

const content = fs.readFileSync(contentPath, 'utf8');
const encrypted = encryptCryptoJSCompat(content, password);

let indexHtml = fs.readFileSync(indexPath, 'utf8');
indexHtml = indexHtml.replace(
  /const ENCRYPTED_CONTENT = ".*?";/,
  `const ENCRYPTED_CONTENT = "${encrypted}";`
);
fs.writeFileSync(indexPath, indexHtml, 'utf8');

console.log('✓ コンテンツを暗号化して index.html に埋め込みました');
console.log(`  パスワード: ${password}`);
console.log(`  コンテンツサイズ: ${content.length} → ${encrypted.length} bytes`);
