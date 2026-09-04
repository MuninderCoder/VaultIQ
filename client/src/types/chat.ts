export interface IMessageSource {
  documentId: string;
  documentName: string;
  chunkId: string;
  chunkIndex: number;
  similarityScore: number;
}

export type MessageRole = 'user' | 'assistant';

export interface IMessageItem {
  _id: string;
  conversation: string;
  owner: string;
  role: MessageRole;
  content: string;
  sources: IMessageSource[];
  createdAt: string;
}

export interface IConversationItem {
  _id: string;
  owner: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationDetailResponse {
  conversation: IConversationItem;
  messages: IMessageItem[];
}

export interface ConversationListResponse {
  conversations: IConversationItem[];
  total: number;
}

export interface SendMessageResponse {
  userMessage: IMessageItem;
  assistantMessage: IMessageItem;
  sources: IMessageSource[];
  isGrounded: boolean;
}
