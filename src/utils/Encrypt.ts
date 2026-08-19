// eslint-disable-next-line max-classes-per-file
import CryptoJS from 'crypto-js';
import { JSEncrypt } from 'jsencrypt';

class Aes {
  /**
   * @word 要加密的内容
   * @keyWord String  服务器随机返回的关键字
   */
  encrypt(word: string, keyWord = 'XwKsGlMcdPMEhR1B') {
    const key = CryptoJS.enc.Utf8.parse(keyWord);
    const plain = CryptoJS.enc.Utf8.parse(word);
    const encrypted = CryptoJS.AES.encrypt(plain, key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    });
    return encrypted.toString();
  }
}

/**
 * 密码加解密
 */
class Pwd {
  securityKey: string = '==BallCat-Auth==';

  /**
   * @pass 密码
   */
  encrypt(pass: string) {
    // 密码加密
    const key = CryptoJS.enc.Utf8.parse(this.securityKey);
    return CryptoJS.AES.encrypt(pass, key, {
      iv: key,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }).toString();
  }
}

export const aes = new Aes();
export const pwd = new Pwd();

const rsaPublicKey =
  'MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAM51dgYtMyF+tTQt80sfFOpSV27a7t9u' +
  'aUVeFrdGiVxscuizE7H8SMntYqfn9lp8a5GH5P1/GGehVjUD2gF/4kcCAwEAAQ==';

export function encryptByRsa(value: string) {
  const encryptor = new JSEncrypt();
  encryptor.setPublicKey(rsaPublicKey);
  return encryptor.encrypt(value) || '';
}
