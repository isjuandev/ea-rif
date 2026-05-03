import { parsePhoneNumberFromString } from "libphonenumber-js";

export function normalizeInternationalPhone(value: string) {
  const phone = parsePhoneNumberFromString(value.trim());
  if (!phone?.isValid()) return "";
  return phone.number;
}

export function isValidInternationalPhone(value: string) {
  return Boolean(normalizeInternationalPhone(value));
}

export function getColombianNationalPhoneDigits(value: string) {
  const phone = parsePhoneNumberFromString(value.trim());
  if (!phone?.isValid() || phone.country !== "CO") return "";
  return phone.nationalNumber;
}

export function normalizeColombianCellphone(value: string) {
  const nationalNumber = getColombianNationalPhoneDigits(value);
  if (!/^3\d{9}$/.test(nationalNumber)) return "";
  return `+57${nationalNumber}`;
}

export function isValidColombianCellphone(value: string) {
  return Boolean(normalizeColombianCellphone(value));
}
