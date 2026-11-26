export interface OwnStoreUser {
  id?: string | null;
  seller_profile?: {
    id?: string | null;
    store_link?: string | null;
  } | null;
}

export interface OwnStoreSeller {
  id?: string | null;
  user_id?: string | null;
  store_link?: string | null;
}

/**
 * Returns true when the currently authenticated user is the owner of the given
 * product/store seller (matched by user_id, seller_profile.id, or store_link).
 */
export function isOwnStore(
  user: OwnStoreUser | null | undefined,
  seller: OwnStoreSeller | null | undefined,
): boolean {
  if (!user || !seller) return false;
  if (seller.user_id && user.id && String(seller.user_id) === String(user.id)) {
    return true;
  }
  if (
    seller.id &&
    user.seller_profile?.id &&
    String(seller.id) === String(user.seller_profile.id)
  ) {
    return true;
  }
  if (
    seller.store_link &&
    user.seller_profile?.store_link &&
    seller.store_link.trim().toLowerCase() === user.seller_profile.store_link.trim().toLowerCase()
  ) {
    return true;
  }
  return false;
}
