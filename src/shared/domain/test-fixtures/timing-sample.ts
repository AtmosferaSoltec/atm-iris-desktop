import type { BlockRecord, ServiceRecord } from "../models";
import { createId } from "../../id";
const CULTO_BLOCKS = [
  { name: "Bienvenida", minutes: 10, leader: "Carlos Pérez" },
  { name: "Alabanzas", minutes: 15, leader: "Ana Torres" },
  { name: "Prédica", minutes: 40, leader: "Daniel Ruiz" },
  { name: "Anuncios", minutes: 5, leader: "Lucía Gómez" },
];

type Sample = [leader: string, minutes: number, seconds: number, status?: "adjusted"] | null;

/**
 * The iPad's sample records (MockChurchData.swift), block by block, so the
 * summaries can be compared figure by figure. `null` is a skipped block.
 */
const RECORD_SAMPLES: Sample[][] = [
  [
    ["Carlos Pérez", 9, 40],
    ["Ana Torres", 19, 5],
    ["Daniel Ruiz", 51, 30],
    ["Lucía Gómez", 5, 55],
  ],
  [
    ["Marta Rivas", 11, 12],
    ["Ana Torres", 14, 30],
    ["Daniel Ruiz", 44, 10],
    ["Lucía Gómez", 4, 40],
  ],
  [
    ["Carlos Pérez", 8, 50],
    ["José Herrera", 16, 20],
    ["Pablo Castro", 38, 45],
    ["Lucía Gómez", 6, 15],
  ],
  [
    ["Carlos Pérez", 10, 5],
    ["Ana Torres", 16, 40],
    ["Daniel Ruiz", 47, 20],
    ["Lucía Gómez", 5, 10],
  ],
  [["Marta Rivas", 9, 30], ["José Herrera", 15, 0], ["Daniel Ruiz", 42, 15], null],
  [
    ["Carlos Pérez", 11, 45],
    ["Ana Torres", 18, 20],
    ["Pablo Castro", 39, 50, "adjusted"],
    ["Sofía Méndez", 4, 50],
  ],
  [
    ["José Herrera", 9, 55],
    ["Ana Torres", 14, 10],
    ["Daniel Ruiz", 53, 5],
    ["Lucía Gómez", 7, 20],
  ],
  [
    ["Carlos Pérez", 8, 40],
    ["José Herrera", 17, 30],
    ["Daniel Ruiz", 40, 0],
    ["Marta Rivas", 5, 0],
  ],
  [
    ["Marta Rivas", 12, 10],
    ["Ana Torres", 15, 45],
    ["Pablo Castro", 44, 30],
    ["Lucía Gómez", 6, 5],
  ],
  [
    ["Carlos Pérez", 9, 50],
    ["Ana Torres", 20, 15],
    ["Daniel Ruiz", 49, 40],
    ["Lucía Gómez", 5, 30],
  ],
];

export function sampleContent(now: Date): { records: ServiceRecord[] } {
  const records = RECORD_SAMPLES.map((samples, index): ServiceRecord => {
    const iso = new Date(now.getTime() - 7 * (index + 1) * 86400000).toISOString();
    const blocks = CULTO_BLOCKS.map((template, position): BlockRecord => {
      const sample = samples[position];
      return {
        id: createId(),
        name: template.name,
        plannedSeconds: template.minutes * 60,
        actualSeconds: sample ? sample[1] * 60 + sample[2] : 0,
        personId: sample ? sample[0] : null,
        personName: sample ? sample[0] : null,
        status: !sample ? "skipped" : (sample[3] ?? "completed"),
        startedAt: null,
        endedAt: null,
      };
    });
    return {
      id: createId(),
      date: iso,
      serviceTypeId: "culto",
      serviceTypeName: "Culto general",
      status: "finished",
      blocks,
      createdAt: iso,
      updatedAt: iso,
    };
  });
  return { records };
}
