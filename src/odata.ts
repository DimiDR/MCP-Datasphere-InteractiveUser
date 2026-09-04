/** Build OData path segment for parameterized analytical entity sets. */
export function buildParameterizedEntityPath(
  entitySetName: string,
  parameters: Record<string, string | number | boolean>,
): string {
  const parts = Object.entries(parameters).map(([key, value]) => {
    if (typeof value === "string") {
      return `${key}='${value.replace(/'/g, "''")}'`;
    }
    return `${key}=${value}`;
  });
  return `${entitySetName}(${parts.join(",")})/Set`;
}

export function requireSpaceAsset(
  spaceId?: string,
  assetId?: string,
  defaults?: { spaceId?: string; assetId?: string },
): { spaceId: string; assetId: string } {
  const space = spaceId?.trim() || defaults?.spaceId?.trim();
  const asset = assetId?.trim() || defaults?.assetId?.trim();
  if (!space || !asset) {
    throw new Error(
      "space_id and asset_id are required (or set DSP_SPACE_ID and DSP_ASSET_ID in .env).",
    );
  }
  return { spaceId: space, assetId: asset };
}
