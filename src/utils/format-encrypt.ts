import CryptoJS from 'crypto-js';

// ----------------------------------------------------------------------

export function fEncrypt(data: object, encryptKey: string): string {
  const jsonString = JSON.stringify(data);
  const encryptedValue = CryptoJS.AES.encrypt(jsonString, encryptKey).toString();
  return encryptedValue;
}

export function fDecrypt(encryptedValue: string, encryptKey: string): any {
  const decryptedString = CryptoJS.AES.decrypt(encryptedValue, encryptKey).toString(CryptoJS.enc.Utf8);

  if (decryptedString) {
    const decryptedObj = JSON.parse(decryptedString);
    return decryptedObj;
  }

  return {};
}
