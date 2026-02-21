export interface ChatReaction {
	emoji: string;
	count: number;
	userNames: string[];
	reacted: boolean;
}

export interface ChatMessage {
	id: string;
	content: string;
	senderId: string;
	senderName: string;
	groupId: string;
	meetingId: string | null;
	reactions: ChatReaction[];
	createdAt: string;
}

export interface CreateChatMessageParams {
	content: string;
	meetingId: string;
}

export interface ToggleReactionParams {
	messageId: string;
	emoji: string;
}
