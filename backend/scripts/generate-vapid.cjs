// Generate locally; copy only the public key to clients through the authenticated API.
const webpush = require('web-push')
const keys = webpush.generateVAPIDKeys()
process.stdout.write('VAPID_PUBLIC_KEY='+keys.publicKey+'\nVAPID_PRIVATE_KEY='+keys.privateKey+'\n')
