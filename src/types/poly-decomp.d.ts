declare module "poly-decomp" {
  export function decomp(polygon: number[][]): number[][][];
  export function quickDecomp(polygon: number[][]): number[][][];
  export function isSimple(polygon: number[][]): boolean;
  export function removeCollinearPoints(
    polygon: number[][],
    precision: number,
  ): void;
  export function removeDuplicatePoints(
    polygon: number[][],
    precision: number,
  ): void;
  export function makeCCW(polygon: number[][]): void;
}
