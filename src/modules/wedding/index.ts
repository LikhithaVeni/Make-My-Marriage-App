// Public entry point of the wedding module: exports its service and types.
export {
  checkSlug,
  createWedding,
  membershipOf,
  type WeddingView,
} from "./service";
export { createWeddingSchema, slugSchema } from "./schemas";
export type { CreateWeddingInput } from "./schemas";
