export enum User_Role {
  Owner = 'OWNER',
  Admin = 'ADMIN',
  Moderator = 'MODERATOR',
  Seller = 'SELLER',
  User = 'USER',
}

export interface JWTPayload {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: User_Role;
}

export interface UserDataSummary {
  sub: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: User_Role;
}
