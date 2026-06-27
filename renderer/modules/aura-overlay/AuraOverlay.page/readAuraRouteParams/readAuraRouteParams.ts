function readAuraRouteParams(hash = window.location.hash): URLSearchParams {
  return new URLSearchParams(hash.split("?")[1] ?? "");
}

export { readAuraRouteParams };
