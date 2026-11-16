// Public entry point of the wedding module: exports its service and types.
export {
  acceptInvite,
  cancelInvite,
  checkSlug,
  createInvite,
  createWedding,
  getWedding,
  listMembers,
  membershipOf,
  previewInvite,
  removeMember,
  resendInvite,
  updateMember,
  updateWedding,
  type InvitePreview,
  type InviteView,
  type MemberView,
  type WeddingView,
} from "./service";
export { createWeddingIndexes } from "./model";
export { weddingPolicy } from "./policy";
export {
  createWeddingSchema,
  inviteSchema,
  slugSchema,
  updateMemberSchema,
  updateWeddingSchema,
} from "./schemas";
export type {
  CreateWeddingInput,
  InviteInput,
  UpdateWeddingInput,
} from "./schemas";
