const publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmCGKxrlsfGHOwTOL51Xk
pP9SNaBv2gpMNpxX3+W47uatEGCKBCkQ/skqgvn4cNxrPiW+qoV1QQzhZbxJztz7
Te8qgIp59Z+tbHaOP6L/p+jnKJxrDxyWHstJ7kT/MwDy97xrN3C1ktDcTZML2sM2
iBW+nh3WM/Ks+FIKW9KkvYNZFsJ3Eu3zzdR9oZHq/a87blhnQZPUQzLy4cc32fIn
3Gwx3ymOA4xGNjcLz5XAQEnnlnsnIok2dhE6SjNIDjMZ2CsgFYTc8fqkCo4E09rR
DrG87bmknK5QIiyNEmcsMjiXJcUrquhBDmOQ8HcDE3IQMG7F9vK8Z2rUAZl4N5Qy
hQIDAQAB
-----END PUBLIC KEY-----`;

document.getElementById('encrypt-btn').addEventListener('click', function() {
    const plaintext = document.getElementById('plaintext').value;
    const encrypt = new JSEncrypt();
    encrypt.setPublicKey(publicKey);
    const encrypted = encrypt.encrypt(plaintext);
    document.getElementById('encrypted-content').value = encrypted;
});

document.getElementById('decrypt-btn').addEventListener('click', function() {
    const encryptedContent = document.getElementById('encrypted-content').value;
    const privateKey = document.getElementById('private-key').value;
    const resultElement = document.getElementById('result');

    if (!encryptedContent || !privateKey) {
        resultElement.textContent = '请输入加密内容和私钥';
        return;
    }

    try {
        const decrypt = new JSEncrypt();
        decrypt.setPrivateKey(privateKey);
        const decrypted = decrypt.decrypt(encryptedContent);

        if (decrypted === null) {
            resultElement.textContent = '解密失败，请检查私钥是否正确';
        } else {
            resultElement.textContent = '解密成功，结果：' + decrypted;
        }
    } catch (error) {
        resultElement.textContent = '解密过程出错：' + error.message;
    }
});