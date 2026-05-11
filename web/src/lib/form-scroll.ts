import type { FieldErrors, FieldValues } from "react-hook-form";

function escapeAttributeValue(value: string) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }

  return value.replace(/["\\]/g, "\\$&");
}

function getFirstErrorName(errors: FieldErrors<FieldValues>, prefix = ""): string | null {
  for (const [key, value] of Object.entries(errors)) {
    if (!value) {
      continue;
    }

    const name = prefix ? `${prefix}.${key}` : key;

    if ("message" in value || "type" in value) {
      return name;
    }

    const childName = getFirstErrorName(value as FieldErrors<FieldValues>, name);
    if (childName) {
      return childName;
    }
  }

  return null;
}

export function scrollFirstFormError<T extends FieldValues>(errors: FieldErrors<T>) {
  const firstErrorName = getFirstErrorName(errors);
  if (!firstErrorName) {
    return;
  }

  requestAnimationFrame(() => {
    const field = document.querySelector(`[name="${escapeAttributeValue(firstErrorName)}"]`);
    (field?.closest("label") ?? field)?.scrollIntoView({ behavior: "smooth", block: "center" });

    if (field instanceof HTMLElement) {
      field.focus({ preventScroll: true });
    }
  });
}
