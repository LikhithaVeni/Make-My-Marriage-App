/**
 * The product's name as its mark: "Make My Marriage" in Fraunces maroon.
 * Weddings inside the product have their own names (their title, such as
 * "KaLi's era") and monograms (docs/decisions.md, decision 48).
 */
export function Wordmark() {
  return (
    <span className="font-display text-body font-medium whitespace-nowrap text-accent">
      Make My Marriage
    </span>
  );
}
