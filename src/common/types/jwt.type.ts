import { Roles } from "@prisma/client"

export interface JWTPayload {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userName: string
  role?: Roles;
}

export interface UserDataSummary {
  sub: string;
  email: string;
  firstName: string;
  lastName: string;
  userName: string
  role?: Roles;
}
