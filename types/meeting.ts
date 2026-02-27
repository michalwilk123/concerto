export interface Meeting {
  id: string;
  name: string;
  groupId: string;
  isPublic: boolean;
  requiresApproval: boolean;
  createdAt: string;
}
