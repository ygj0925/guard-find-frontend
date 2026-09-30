import { JSEncrypt } from 'jsencrypt';

/**
 * 密码 RSA 公钥。
 *
 * 与后端 `continew-starter.encrypt.public-key` 配对（dev/prod 目前同一把）。
 * 优先取构建期注入的 `process.env.rsaPublicKey`（见 `config/config.*.ts` 的
 * `define`），便于密钥轮换时不改代码；缺省值保证任何构建方式都能登录。
 */
const DEFAULT_RSA_PUBLIC_KEY =
  'MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAM51dgYtMyF+tTQt80sfFOpSV27a7t9u' +
  'aUVeFrdGiVxscuizE7H8SMntYqfn9lp8a5GH5P1/GGehVjUD2gF/4kcCAwEAAQ==';

const rsaPublicKey =
  (process.env.rsaPublicKey as string | undefined) || DEFAULT_RSA_PUBLIC_KEY;

/** 用后端公钥加密密码，失败返回空串（调用方应校验） */
export function encryptByRsa(value: string): string {
  const encryptor = new JSEncrypt();
  encryptor.setPublicKey(rsaPublicKey);
  return encryptor.encrypt(value) || '';
}
