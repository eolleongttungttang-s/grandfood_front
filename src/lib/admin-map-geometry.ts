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

function ringArea(ring: MapPosition[]) {
  let twiceArea = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const [x1, y1] = ring[index];
    const [x2, y2] = ring[(index + 1) % ring.length];
    twiceArea += x1 * y2 - x2 * y1;
  }
  return twiceArea / 2;
}

function largestOuterRing(geometry: MapGeometry): MapPosition[] {
  const outerRings = geometry.type === "Polygon"
    ? geometry.coordinates.slice(0, 1)
    : geometry.coordinates.map((polygon) => polygon[0]).filter(Boolean);
  return outerRings.reduce<MapPosition[]>(
    (largest, ring) => Math.abs(ringArea(ring)) > Math.abs(ringArea(largest)) ? ring : largest,
    outerRings[0] ?? [],
  );
}

function ringCentroid(ring: MapPosition[]): MapPosition {
  const area = ringArea(ring);
  if (!ring.length) return [0, 0];
  if (Math.abs(area) < Number.EPSILON) {
    return [
      ring.reduce((sum, [x]) => sum + x, 0) / ring.length,
      ring.reduce((sum, [, y]) => sum + y, 0) / ring.length,
    ];
  }
  let x = 0;
  let y = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const [x1, y1] = ring[index];
    const [x2, y2] = ring[(index + 1) % ring.length];
    const cross = x1 * y2 - x2 * y1;
    x += (x1 + x2) * cross;
    y += (y1 + y2) * cross;
  }
  return [x / (6 * area), y / (6 * area)];
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

    // 섬이 많은 시·도는 모든 조각의 bounding box 중앙을 쓰면 라벨이 인접 지역 위에
    // 놓일 수 있다. 가장 큰 본토 외곽선의 실제 도형 중심을 라벨 기준으로 사용한다.
    const labelRing = largestOuterRing(feature.geometry);
    const featurePoints = labelRing.length ? labelRing : rings.flat();
    const featureXs = featurePoints.map(([x]) => x);
    const featureYs = featurePoints.map(([, y]) => y);
    const featureMinX = Math.min(...featureXs);
    const featureMaxX = Math.max(...featureXs);
    const featureMinY = Math.min(...featureYs);
    const featureMaxY = Math.max(...featureYs);
    const [centroidX, centroidY] = ringCentroid(featurePoints);
    labels.set(key, {
      x: offsetX + (centroidX - minX) * scale,
      y: 500 - offsetY - (centroidY - minY) * scale,
      width: (featureMaxX - featureMinX) * scale,
      height: (featureMaxY - featureMinY) * scale,
    });
  }

  return { paths, labels };
}
