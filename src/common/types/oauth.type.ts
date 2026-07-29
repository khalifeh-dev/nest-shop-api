import { AuthProvider } from "@prisma/client";

export interface OAuthUser {
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  googleId?: string;
  githubId?: string;
  appleId?: string;
  authProvider: AuthProvider;
  isVerified: boolean;
}