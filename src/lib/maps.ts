// Google Maps search links, built without any Google API (PRD "Find nearby
// (free)": no API key or billing in v1).

const SEARCH = "https://www.google.com/maps/search/?api=1&query=";

/** PRD "Map link — auto-generated from address if left empty". */
export function googleMapsSearch(venue: { name: string; address: string }) {
  return SEARCH + encodeURIComponent(`${venue.name}, ${venue.address}`);
}

/** PRD "Find nearby": "<service type> near <event venue>". */
export function findNearbyUrl(
  serviceType: string,
  venue: { name: string; address: string },
): string {
  return (
    SEARCH +
    encodeURIComponent(`${serviceType} near ${venue.name}, ${venue.address}`)
  );
}
