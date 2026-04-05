/**
 * cryptoHarden.js
 * 
 * Provides PBKDF2 key derivation and AES-GCM encryption/decryption routines.
 * Leverages native Web Crypto API to avoid bloated dependencies.
 */
export class CryptoHarden {
    constructor(iterations = 100000) {
        this.iterations = iterations;
        this.encoder = new TextEncoder();
        this.decoder = new TextDecoder();
    }

    async _deriveKey(password, salt) {
        const baseKey = await window.crypto.subtle.importKey(
            'raw',
            this.encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );
        return window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: this.iterations,
                hash: 'SHA-256'
            },
            baseKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    async encryptData(plainText, password) {
        if (!plainText) return null;
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const key = await this._deriveKey(password, salt);

        const encryptedContent = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            this.encoder.encode(plainText)
        );

        return {
            cipher: Array.from(new Uint8Array(encryptedContent)),
            iv: Array.from(iv),
            salt: Array.from(salt)
        };
    }

    async decryptData(encryptedPackage, password) {
        if (!encryptedPackage) return null;
        try {
            const { cipher, iv, salt } = encryptedPackage;
            const key = await this._deriveKey(password, new Uint8Array(salt));

            const decryptedContent = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: new Uint8Array(iv) },
                key,
                new Uint8Array(cipher)
            );
            return this.decoder.decode(decryptedContent);
        } catch (error) {
            throw new Error("CRYPTOGRAPHIC_FAILURE");
        }
    }
}
