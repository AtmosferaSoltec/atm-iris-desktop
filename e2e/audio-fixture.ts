/** MPEG-1 Layer III silent frames; synthetic audio avoids copying any song into tests. */
export function silentMp3(): Buffer {
  return Buffer.concat(
    Array.from({ length: 80 }, () => {
      const frame = Buffer.alloc(417);
      frame.set([0xff, 0xfb, 0x90, 0x00]);
      return frame;
    }),
  );
}
