# Apple Wallet passes for groups

A group leader can tap **Add to Apple Wallet** on the leader page to get a card with the group's name, its join code, and a
QR code that opens the invite link. Anyone can then show it, or AirDrop it, to people joining.

Apple only accepts passes that are **signed with your own Apple Developer certificate**, so this needs a one-time setup.
Until it is done, the button says Wallet isn't set up yet, and the printed poster works as usual.

## What you need
- An **Apple Developer Program** membership (about $99 a year): <https://developer.apple.com/programs/>
- Ten minutes on a Mac (for the certificate request).

## Steps
1. **Find your Team ID.** developer.apple.com, then **Account**, then **Membership details**. Copy the 10-character Team ID.
2. **Make a Pass Type ID.** **Certificates, Identifiers & Profiles**, then **Identifiers**, then the **+**, choose
   **Pass Type IDs**. Use an identifier like `pass.com.yourname.fourrivers`. Register it.
3. **Make the signing certificate.** Open the new Pass Type ID, **Create Certificate**. Apple asks for a request file:
   on your Mac open **Keychain Access**, then **Certificate Assistant**, **Request a Certificate From a Certificate
   Authority**, save it to disk, and upload it. Download the `.cer` Apple gives you and double-click it so it goes into
   Keychain.
4. **Export it.** In Keychain Access find the certificate (it starts with "Pass Type ID"), right-click, **Export**, save
   as `pass.p12`, and choose a password.
5. **Turn it into the text files Vercel needs.** In Terminal, in the folder with `pass.p12`:

   ```bash
   openssl pkcs12 -in pass.p12 -clcerts -nokeys -out pass-cert.pem -legacy
   openssl pkcs12 -in pass.p12 -nocerts -out pass-key.pem -legacy
   ```

   (Enter the export password. For the second file you choose a passphrase for the key; remember it.)
6. **Get Apple's WWDR certificate.** Download "Worldwide Developer Relations - G4" from
   <https://www.apple.com/certificateauthority/> and convert it:

   ```bash
   openssl x509 -inform der -in AppleWWDRCAG4.cer -out wwdr.pem
   ```

7. **Add these to Vercel** (Settings, Environment Variables). For the three `.pem` files, paste the whole text; line breaks
   are fine.

   | Name | Value |
   | --- | --- |
   | `APPLE_TEAM_ID` | the 10-character Team ID |
   | `APPLE_PASS_TYPE_ID` | for example `pass.com.yourname.fourrivers` |
   | `APPLE_PASS_CERT` | the text of `pass-cert.pem` |
   | `APPLE_PASS_KEY` | the text of `pass-key.pem` |
   | `APPLE_PASS_KEY_PASSPHRASE` | the passphrase you chose in step 5 |
   | `APPLE_WWDR_CERT` | the text of `wwdr.pem` |

   The pass link also needs `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY`, which the email features already use.
8. Redeploy, open a group's leader page on an iPhone, and tap **Add to Apple Wallet**.

## Good to know
- A pass shows the group's code as it was when the pass was made. If a leader makes a new code, make a new pass.
- Passes certificates expire after a year; Apple emails you before then. Repeat steps 3 to 5 and update the variables.
- Android phones have Google Wallet instead; that is a possible later addition (see the Reminders in UPDATES.md).
