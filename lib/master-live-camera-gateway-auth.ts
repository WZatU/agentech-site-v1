import { createHash, timingSafeEqual } from "node:crypto";

export function isAuthorizedMasterGateway(
  authorization: string | null,
  secret: string,
  acceptedTokenHashes: string[] = [],
) {
  if (!authorization?.startsWith("Bearer ")) return false;
  const supplied = authorization.slice("Bearer ".length);
  const suppliedBytes = Buffer.from(supplied);
  const secretBytes = Buffer.from(secret);
  if (secret && suppliedBytes.length === secretBytes.length && timingSafeEqual(suppliedBytes, secretBytes)) {
    return true;
  }

  const suppliedHash = Buffer.from(createHash("sha256").update(supplied).digest("hex"));
  return acceptedTokenHashes.some((hash) => {
    const acceptedHash = Buffer.from(hash.toLowerCase());
    return suppliedHash.length === acceptedHash.length && timingSafeEqual(suppliedHash, acceptedHash);
  });
}
