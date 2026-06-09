export interface Group {
  id: string;
  name: string;
  isDefault?: boolean;
  createdAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: "teacher" | "student";
  createdAt: string;
}

export interface GroupWithMembers extends Group {
  members: (GroupMember & { userName: string; userEmail: string })[];
}
