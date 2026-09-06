# Portable case files

The optional file flow is a free manual way to carry one preparation case between private devices. It needs no cloud account, server key or messaging service. It complements optional Google/D1 account saving; it does not sync edits or helper access.

## User flow

1. Open a working case and expand **Move this case with an encrypted file**.
2. Review the exact complete case contents. This includes its facts, source metadata, draft, reference, progress, dates and timeline. Original documents, the separate reusable profile, source-follow-up notes, connected-plan links and document-reminder records are excluded. Importing a case does not recreate those organisers or link the new case into an existing plan.
3. Choose a passphrase of 12–128 characters, preferably several unrelated random words, enter it again, explicitly review the download and save the encrypted file.
4. On another private device, expand **Open an encrypted case file**. Select the file, enter its passphrase and decrypt it locally.
5. Review the full contents. Choose to open a separate unsaved draft; no existing case is overwritten or saved automatically. The imported case retains its original dates until the citizen explicitly makes and saves a change.

The file and passphrase are never uploaded by this feature. Password inputs and decrypted review state clear when the review closes or the case changes; in-flight results are invalidated so closing cannot trigger a late download. A browser password manager or device backup is outside the app's storage controls. Downloaded files remain until their holder deletes them, and the app cannot recover a lost passphrase.

## Implementation

`lib/mobility/portable-case.ts` uses the browser's native Web Crypto API, with no cryptography dependency:

- AES-GCM, 256-bit key and 128-bit authentication tag.
- A fresh random 16-byte salt and 12-byte nonce for every export.
- PBKDF2-HMAC-SHA256, fixed at 600,000 iterations; an imported file cannot choose a costly or weaker iteration count.
- Fixed version and algorithm metadata; authenticated additional data binds this file format and algorithm combination.
- A maximum 240,000-byte plaintext and 350,000-byte file, checked before key derivation. Strict keys, canonical base64 and exact nonce/salt lengths.
- The same serializer produces the visible preview and the encrypted plaintext. The case snapshot is taken before asynchronous key derivation.
- Native decryption must authenticate successfully, then normal case validation, timestamp checks and the original 90-day retention are applied. Copying creates a fresh random case ID and drops local revision markers.

Authenticated encryption detects changes by someone who does not know the passphrase. It **does not prove who authored the file, whether its facts are true, whether an official action happened, or whether another copy was altered by a passphrase holder**. Expiry is an application rule; it cannot erase a downloaded file or prevent its owner decrypting it with other software. Saving an opened case to this browser uses the existing unencrypted, explicitly opted-in storage.

The authenticated-encryption choice follows [MDN Web Crypto guidance](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt). The PBKDF2 work factor uses the [OWASP PBKDF2-HMAC-SHA256 recommendation](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), with the native browser API as the compatibility constraint. This is a bounded implementation, not an independent cryptographic security audit.

## Validation

Unit tests exercise exact round-trip previews, Unicode secrets, unique salts/nonces, wrong passphrases, modified ciphertext/salt/nonce, oversized or malformed envelopes, fixed work factors, expiry, independent copy IDs and edits made after encryption begins. Browser checks exercise actual downloads and local imports, explicit review, dirty-editor protection, cancellation, private state clearing and narrow Hindi layouts.
