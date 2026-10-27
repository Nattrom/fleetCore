import { UserRole } from '../../common/enums/index.js';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  mechanicId: string | null;
}
