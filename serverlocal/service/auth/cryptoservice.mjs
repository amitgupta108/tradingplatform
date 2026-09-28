import crypto from 'crypto';
import { SystemService } from '../service.mjs';

export class CryptoService extends SystemService
{
    constructor(name) 
    {
        super(name);        
        // Generate Server's long-term master identity keys (X25519 for encryption, Ed25519 for signing)
        const encKeys = crypto.generateKeyPairSync('x25519');
        const signKeys = crypto.generateKeyPairSync('ed25519');

        this.privateEncryptionKey = encKeys.privateKey;
        this.publicEncryptionKey = encKeys.publicKey;

        this.privateSigningKey = signKeys.privateKey;
        this.publicSigningKey = signKeys.publicKey;
    }

    // Export Server's Public Keys so clients can fetch them
    getServerPublicKeys() {
        return {
            encryptionKey: this.publicEncryptionKey.export({ type: 'spki', format: 'pem' }),
            signingKey: this.publicSigningKey.export({ type: 'spki', format: 'pem' })
        };
    }

    // Process incoming Hybrid Encrypted & Signed payloads
    processIncomingPayload({ encryptedData, iv, authTag, encryptedSessionKey, signature, clientPublicKeyPem }) {
        // 1. ASYMMETRIC DECRYPTION: Decrypt the AES Session Key using the Server's Private Key
        const sessionKey = crypto.privateDecrypt(
            this.privateEncryptionKey,
            Buffer.from(encryptedSessionKey, 'hex')
        );

        // 2. SYMMETRIC DECRYPTION: Decrypt the bulk payload using the extracted Session Key
        const decipher = crypto.createDecipheriv('aes-256-gcm', sessionKey, Buffer.from(iv, 'hex'));
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));

        let decryptedText = decipher.update(encryptedData, 'hex', 'utf8');
        decryptedText += decipher.final('utf8');

        // 3. AUTHENTICATION VERIFICATION: Import Client Public Key to verify the signature
        const clientPublicKey = crypto.createPublicKey({
            key: Buffer.from(clientPublicKeyPem, 'utf8'),
            format: 'pem',
            type: 'spki'
        });

        // Detect if client is Ed25519 (Server Client) or ECDSA P-256 (Browser Client)
        const isBrowserClient = clientPublicKey.asymmetricKeyDetails?.namedCurve === 'P-256';

        let isVerified = false;
        if (isBrowserClient) {
            // Browser uses ECDSA P-256 with SHA-256
            const verifier = crypto.createVerify('SHA256');
            verifier.update(decryptedText);
            isVerified = verifier.verify(clientPublicKey, Buffer.from(signature, 'hex'));
        } else {
            // Server uses pure Ed25519
            const verifier = crypto.createVerify(null);
            verifier.update(decryptedText);
            isVerified = verifier.verify(clientPublicKey, Buffer.from(signature, 'hex'));
        }

        if (!isVerified) {
            throw new Error('Security Violation: Signature verification failed. Cryptographic identity mismatch.');
        }

        return JSON.parse(decryptedText);
    }
}