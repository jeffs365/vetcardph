export function normalizePhilippineMobile(value: string) {
  const digits = value.trim().replace(/\D/g, "")

  if (!digits) {
    throw new Error("Owner phone number is required.")
  }

  if (digits.startsWith("63") && digits.length === 12) {
    return digits
  }

  if (digits.startsWith("09") && digits.length === 11) {
    return `63${digits.slice(1)}`
  }

  if (digits.startsWith("9") && digits.length === 10) {
    return `63${digits}`
  }

  throw new Error("Use a valid Philippine mobile number.")
}

export function normalizePhilippineMobileSearch(value: string) {
  const trimmed = value.trim()
  const digits = trimmed.replace(/\D/g, "")

  if (!digits) {
    return trimmed
  }

  try {
    return normalizePhilippineMobile(trimmed)
  } catch {
    return digits
  }
}
