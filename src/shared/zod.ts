import { z } from "zod";

// Type errors also cross IPC and reach forms, so defaults must be Spanish.
z.config(z.locales.es());
export { z };
