import { randomInt } from "node:crypto";

export const randomDigits = (n: number) => Array.from({ length: n }, () => randomInt(10)).join("");

/** Our own tracking number for a piece of cargo, e.g. ZG26104417. */
export const newTrackingNo = () => `ZG${new Date().getFullYear() % 100}${randomDigits(6)}`;

/** A shipment number, e.g. SH26553120. */
export const newShipmentNo = () => `SH${new Date().getFullYear() % 100}${randomDigits(6)}`;

const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** An unguessable token for a public PDF link, e.g. "8fK2qAz7Rm" (about 58 bits). */
export const newLinkToken = () => Array.from({ length: 10 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
