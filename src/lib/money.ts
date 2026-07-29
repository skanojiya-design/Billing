// All money is stored as integer paise (1 INR = 100 paise) to avoid floating
// point rounding errors. These helpers convert to/from rupees for display & input.

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

/** Format paise as e.g. "₹1,23,456.00" */
export function formatPaise(paise: number): string {
  return INR.format(paise / 100);
}

/** Format paise without decimals when whole, e.g. "₹1,23,456" */
export function formatPaiseCompact(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: rupees % 1 === 0 ? 0 : 2,
  }).format(rupees);
}
