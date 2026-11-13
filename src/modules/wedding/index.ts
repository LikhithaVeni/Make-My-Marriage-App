// Public entry point of the wedding module: exports its service and types.
export {
  acceptInvite,
  cancelInvite,
  checkSlug,
  createInvite,
  createWedding,
  listMembers,
  membershipOf,
  previewInvite,
  removeMember,
  resendInvite,
  updateMember,
  type InvitePreview,
  type InviteView,
  type MemberView,
  type WeddingView,
} from "./service";
export { weddingPolicy } from "./policy";
export {
  createWeddingSchema,
  inviteSchema,
  slugSchema,
  updateMemberSchema,
} from "./schemas";
export type { CreateWeddingInput, InviteInput } from "./schemas";
