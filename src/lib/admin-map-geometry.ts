export type MapPosition = [number, number];
export type MapGeometry =
  | { type: "Polygon"; coordinates: MapPosition[][] }
  | { type: "MultiPolygon"; coordinates: MapPosition[][][] };

export type MapLabelPlacement = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function geometryRings(geometry: MapGeometry): MapPosition[][] {
  return geometry.type === "Polygon"
    ? geometry.coordinates
    : geometry.coordinates.flat();
}

export function projectMapFeatures<T extends { geometry: MapGeometry }>(
  features: T[],
  getKey: (feature: T) => string,
) {
  const points = features.flatMap((feature) =>
    geometryRings(feature.geometry).flat(),
  );
  if (!points.length) {
    return {
      paths: new Map<string, string>(),
      labels: new Map<string, MapLabelPlacement>(),
    };
  }

  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const padding = 28;
  const drawableSize = 500 - padding * 2;
  const scale = Math.min(
    drawableSize / Math.max(maxX - minX, Number.EPSILON),
    drawableSize / Math.max(maxY - minY, Number.EPSILON),
  );
  const offsetX = (500 - (maxX - minX) * scale) / 2;
  const offsetY = (500 - (maxY - minY) * scale) / 2;

  const paths = new Map<string, string>();
  const labels = new Map<string, MapLabelPlacement>();

  for (const feature of features) {
    const key = getKey(feature);
    const rings = geometryRings(feature.geometry);
    paths.set(
      key,
      rings
        .map(
          (ring) =>
            ring
              .map(
                ([x, y], index) =>
                  `${index ? "L" : "M"}${offsetX + (x - minX) * scale} ${500 - offsetY - (y - minY) * scale}`,
              )
              .join(" ") + " Z",
        )
        .join(" "),
    );

    const featurePoints = rings.flat();
    const featureXs = featurePoints.map(([x]) => x);
    const featureYs = featurePoints.map(([, y]) => y);
    const featureMinX = Math.min(...featureXs);
    const featureMaxX = Math.max(...featureXs);
    const featureMinY = Math.min(...featureYs);
    const featureMaxY = Math.max(...featureYs);
    labels.set(key, {
      x: offsetX + ((featureMinX + featureMaxX) / 2 - minX) * scale,
      y: 500 - offsetY - ((featureMinY + featureMaxY) / 2 - minY) * scale,
      width: (featureMaxX - featureMinX) * scale,
      height: (featureMaxY - featureMinY) * scale,
    });
  }

  return { paths, labels };
}
