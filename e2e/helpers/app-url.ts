const defaultE2EAppPort = 5173;

function getE2EAppPort(): number {
  const parsedPort = Number.parseInt(
    process.env.E2E_APP_PORT ?? String(defaultE2EAppPort),
    10,
  );

  return Number.isFinite(parsedPort) ? parsedPort : defaultE2EAppPort;
}

function getE2EAppBaseUrl(): string {
  return process.env.E2E_APP_BASE_URL ?? `http://127.0.0.1:${getE2EAppPort()}`;
}

function resolveE2EAppUrl(path: string): string {
  return new URL(path, getE2EAppBaseUrl()).toString();
}

export { getE2EAppBaseUrl, getE2EAppPort, resolveE2EAppUrl };
