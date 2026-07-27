import forge from 'node-forge';

export interface GeneratedKeystore {
  readonly pkcs12: Buffer;
  readonly sha256Fingerprint: string;
}

// Matches the industry-standard `keytool -genkeypair -validity 10000`
// convention for Android release signing keys — long enough that key
// rotation is never forced by certificate expiry.
const VALIDITY_YEARS = 30;
const RSA_KEY_BITS = 2048;

/**
 * Generates a real, Gradle/`jarsigner`-compatible PKCS12 keystore containing
 * a single self-signed RSA key pair — entirely in pure JS (node-forge), so
 * the API container never needs a JDK just to provision a signing identity.
 * PKCS12 requires the store password and the per-entry key password to be
 * identical (the JVM enforces this; `SigningKey` keeps them as separate
 * columns for forward-compatibility with a future non-PKCS12 format).
 */
export function generateKeystore(options: {
  alias: string;
  password: string;
  commonName: string;
}): GeneratedKeystore {
  const keyPair = forge.pki.rsa.generateKeyPair(RSA_KEY_BITS);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keyPair.publicKey;
  cert.serialNumber = forge.util.bytesToHex(forge.random.getBytesSync(16));
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + VALIDITY_YEARS);

  const subjectAttrs = [{ name: 'commonName', value: options.commonName }];
  cert.setSubject(subjectAttrs);
  cert.setIssuer(subjectAttrs);
  cert.sign(keyPair.privateKey, forge.md.sha256.create());

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keyPair.privateKey, [cert], options.password, {
    algorithm: 'aes256',
    friendlyName: options.alias,
  });
  const pkcs12 = Buffer.from(forge.asn1.toDer(p12Asn1).getBytes(), 'binary');

  const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
  const digest = forge.md.sha256.create().update(certDer).digest().toHex();
  const sha256Fingerprint = digest.toUpperCase().replace(/(.{2})(?=.)/g, '$1:');

  return { pkcs12, sha256Fingerprint };
}
