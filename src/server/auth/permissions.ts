export type AuthContext = {
  userId: string;
  isActive: boolean;
};

export function requireActiveUser(context: AuthContext) {
  if (!context.isActive) {
    throw new Error("Your account is inactive. Contact the company administrator.");
  }
}

export function canSeeInternalPricing(context: AuthContext) {
  requireActiveUser(context);
  return true;
}
