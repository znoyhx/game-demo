export interface CameraCenterTarget {
  centerOn: (x: number, y: number) => void;
}

export const centerPixelSceneCameraSafely = (
  camera: CameraCenterTarget | null | undefined,
  x: number,
  y: number,
) => {
  if (!camera) {
    return false;
  }

  camera.centerOn(x, y);
  return true;
};
