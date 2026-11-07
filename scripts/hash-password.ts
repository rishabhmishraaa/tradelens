// F3.7: prints a hash for OWNER_PASSWORD_HASH.
// Usage: npm run hash-password -- "your long random password"
import { hashPassword } from "../src/server/auth/password.ts";

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error('Usage: npm run hash-password -- "a password of at least 12 characters"');
  process.exit(1);
}
console.log(await hashPassword(password));
