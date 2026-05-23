function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function formatPersonName(value: unknown) {
  return clean(value)
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

export function formatFullName(firstName: unknown, lastName?: unknown) {
  return [formatPersonName(firstName), formatPersonName(lastName)].filter(Boolean).join(" ");
}

export function formatInvoiceItemName(value: string) {
  const marker = " for ";
  const markerIndex = value.toLowerCase().lastIndexOf(marker);

  if (markerIndex === -1) {
    return value;
  }

  const beforeName = value.slice(0, markerIndex + marker.length);
  const name = value.slice(markerIndex + marker.length);

  return `${beforeName}${formatPersonName(name)}`;
}
