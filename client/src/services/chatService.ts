import { api } from './api';
import { ApiResponse } from '../types';
import {
  IConversationItem,
  ConversationListResponse,
  ConversationDetailResponse,
  SendMessageResponse
} from '../types/chat';

export const chatService = {
  /**
   * Retrieves user's conversations
   */
  async listConversations(): Promise<ApiResponse<ConversationListResponse>> {
    const response = await api.get<ApiResponse<ConversationListResponse>>('/chat/conversations');
    return response.data;
  },

  /**
   * Creates a new conversation thread
   */
  async createConversation(title?: string): Promise<ApiResponse<{ conversation: IConversationItem }>> {
    const response = await api.post<ApiResponse<{ conversation: IConversationItem }>>('/chat/conversations', {
      title
    });
    return response.data;
  },

  /**
   * Retrieves conversation details and message history
   */
  async getConversation(id: string): Promise<ApiResponse<ConversationDetailResponse>> {
    const response = await api.get<ApiResponse<ConversationDetailResponse>>(`/chat/conversations/${id}`);
    return response.data;
  },

  /**
   * Deletes a conversation and its messages
   */
  async deleteConversation(id: string): Promise<ApiResponse<{ id: string }>> {
    const response = await api.delete<ApiResponse<{ id: string }>>(`/chat/conversations/${id}`);
    return response.data;
  },

  /**
   * Sends a message and receives grounded AI answer + sources
   */
  async sendMessage(
    conversationId: string,
    message: string
  ): Promise<ApiResponse<SendMessageResponse>> {
    const response = await api.post<ApiResponse<SendMessageResponse>>(
      `/chat/conversations/${conversationId}/messages`,
      { message }
    );
    return response.data;
  }
};
