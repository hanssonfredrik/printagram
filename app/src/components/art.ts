/** Decorative palette for illustrations (landing mockups, waiting screen). Not photo data. */
export const ART_HUES: [number, number, number][] = [
  [201, 183, 164],
  [168, 181, 201],
  [185, 196, 168],
  [208, 169, 154],
  [214, 190, 150],
];

export function artGradient(i: number): string {
  const c = ART_HUES[i % ART_HUES.length]!;
  const c2 = c.map((v) => Math.min(255, v + 18));
  return `repeating-linear-gradient(135deg, rgb(${c.join(',')}) 0 6px, rgb(${c2.join(',')}) 6px 12px)`;
}
