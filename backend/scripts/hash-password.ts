import bcrypt from "bcryptjs";
const pw = process.argv[2];
if (!pw) {
  console.error("Usage: npm run hash-password -- '<your password>'");
  process.exit(1);
}
console.log(await bcrypt.hash(pw, 12));
