import { createFileRoute } from '@tanstack/react-router'
import { ExternalLink } from '#/components/ui/ExternalLink'

export const Route = createFileRoute('/encryption')({
  staticData: { navLabel: 'Encryption', navOrder: 5 },
  component: EncryptionPage,
})

function EncryptionPage() {
  return (
    <>
      <h1>App Encryption Documentation</h1>
      <p>
        This document describes the encryption used by the PocketDev iOS app, provided for Apple
        App Store compliance review and US export classification purposes.
      </p>

      <h2>Encryption Algorithms Used</h2>

      <h3>1. Ed25519 Digital Signatures (RFC 8032)</h3>
      <p>
        PocketDev uses Ed25519 asymmetric key signing, implemented via the{' '}
        <code>@noble/ed25519</code> JavaScript library (a publicly available, open-source
        implementation). This is a standard algorithm accepted by IETF (RFC 8032).
      </p>
      <p>
        <strong>Purpose:</strong> Device authentication only. When a mobile device pairs with a
        PocketDev server, an Ed25519 keypair is generated on the device. The private key signs
        outgoing API requests; the server verifies the signature against the registered public key
        to confirm the request is from an authorized device.
      </p>
      <p>
        <strong>What is not encrypted:</strong> No user content, files, prompts, or task output is
        encrypted using this algorithm. It is used exclusively to authenticate requests, equivalent
        in purpose to HMAC-based request signing.
      </p>
      <p>
        <strong>Implementation note:</strong> This library runs in the JavaScript runtime and does
        not use Apple's CryptoKit or CommonCrypto APIs. It is publicly available at{' '}
        <ExternalLink href="https://github.com/paulmillr/noble-ed25519">
          github.com/paulmillr/noble-ed25519
        </ExternalLink>
        .
      </p>

      <h3>2. TLS 1.2 / 1.3 (HTTPS and WSS)</h3>
      <p>
        All network communication between the mobile app and the paired server is conducted over
        HTTPS and secure WebSocket (WSS) connections. TLS is handled entirely by Apple's standard
        networking stack (the iOS URL loading system / <code>NSURLSession</code>) and is not
        implemented by the app.
      </p>

      <h2>Export Classification</h2>
      <p>
        Per the <ExternalLink href="https://www.bis.doc.gov">US Bureau of Industry and Security (BIS)</ExternalLink> Export Administration Regulations (EAR),
        Note 4 to Category 5, Part 2 (Information Security), the Ed25519 usage described above
        qualifies as an exemption: it is a publicly available, standard algorithm used solely for
        authentication (digital signature verification), not for encrypting or decrypting data.
      </p>
      <p>
        No proprietary encryption algorithms are used. No encryption algorithms not accepted by
        international standard bodies (IEEE, IETF, ITU) are used.
      </p>

      <h2>Summary</h2>
      <table>
        <thead>
          <tr>
            <th>Algorithm</th>
            <th>Standard</th>
            <th>Purpose</th>
            <th>Implemented by</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Ed25519</td>
            <td>IETF RFC 8032</td>
            <td>Request authentication (signing only)</td>
            <td>@noble/ed25519 (JS library)</td>
          </tr>
          <tr>
            <td>TLS 1.2/1.3</td>
            <td>IETF RFC 8446</td>
            <td>Transport security</td>
            <td>Apple iOS networking stack</td>
          </tr>
        </tbody>
      </table>
    </>
  )
}
