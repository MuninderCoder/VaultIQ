import { Types } from 'mongoose';
import { ConversationModel, IConversation } from '../models/Conversation';
import { MessageModel, IMessage } from '../models/Message';
import { RagService } from '../rag/rag.service';
import { IRagService, IRagResult } from '../rag/rag.interface';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AuditService } from './audit.service';

export interface SendMessageResult {
  userMessage: IMessage;
  assistantMessage: IMessage;
  sources: any[];
  isGrounded: boolean;
}

export class ChatService {
  private static ragService: IRagService = new RagService();

  public static setRagService(service: IRagService): void {
    this.ragService = service;
  }

  public static getRagService(): IRagService {
    return this.ragService;
  }

  /**
   * Creates a new conversation for the authenticated user.
   */
  public static async createConversation(
    userId: string,
    title?: string,
    organizationId?: string
  ): Promise<IConversation> {
    const ownerId = new Types.ObjectId(userId);
    const initialTitle = title?.trim() || 'New Conversation';
    const orgObjectId = organizationId && Types.ObjectId.isValid(organizationId)
      ? new Types.ObjectId(organizationId)
      : null;

    const conversation = await ConversationModel.create({
      owner: ownerId,
      organizationId: orgObjectId,
      title: initialTitle
    });

    if (orgObjectId) {
      await AuditService.log({
        organizationId: orgObjectId,
        actorId: ownerId,
        action: 'CONVERSATION_CREATED',
        resourceType: 'CONVERSATION',
        resourceId: conversation._id.toString(),
        metadata: { title: conversation.title }
      });
    }

    logger.info(`Created conversation ${conversation._id} for user ${userId}`);
    return conversation;
  }

  /**
   * Lists conversations belonging strictly to the authenticated user.
   */
  public static async listConversations(
    userId: string,
    limit: number = 50,
    page: number = 1,
    organizationId?: string
  ): Promise<{ conversations: IConversation[]; total: number }> {
    const ownerId = new Types.ObjectId(userId);
    const skip = (Math.max(1, page) - 1) * limit;

    const filter: any = { owner: ownerId };
    if (organizationId && Types.ObjectId.isValid(organizationId)) {
      filter.organizationId = new Types.ObjectId(organizationId);
    } else {
      filter.organizationId = null;
    }

    const [conversations, total] = await Promise.all([
      ConversationModel.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ConversationModel.countDocuments(filter)
    ]);

    return { conversations: conversations as unknown as IConversation[], total };
  }

  /**
   * Retrieves a conversation and its messages with strict ownership verification.
   */
  public static async getConversationById(
    userId: string,
    conversationId: string,
    organizationId?: string
  ): Promise<{ conversation: IConversation; messages: IMessage[] }> {
    const ownerId = new Types.ObjectId(userId);
    const convId = new Types.ObjectId(conversationId);

    const filter: any = { _id: convId, owner: ownerId };
    if (organizationId) {
      filter.organizationId = new Types.ObjectId(organizationId);
    }

    const conversation = await ConversationModel.findOne(filter);

    if (!conversation) {
      const error = new Error('Conversation not found');
      (error as any).statusCode = 404;
      throw error;
    }

    const messages = await MessageModel.find({
      conversation: convId,
      owner: ownerId
    })
      .sort({ createdAt: 1 })
      .lean();

    return {
      conversation,
      messages: messages as unknown as IMessage[]
    };
  }

  /**
   * Deletes a conversation and cascade-deletes its messages with strict ownership verification.
   */
  public static async deleteConversation(
    userId: string,
    conversationId: string,
    organizationId?: string
  ): Promise<void> {
    const ownerId = new Types.ObjectId(userId);
    const convId = new Types.ObjectId(conversationId);

    const filter: any = { _id: convId, owner: ownerId };
    if (organizationId) {
      filter.organizationId = new Types.ObjectId(organizationId);
    }

    const conversation = await ConversationModel.findOneAndDelete(filter);

    if (!conversation) {
      const error = new Error('Conversation not found');
      (error as any).statusCode = 404;
      throw error;
    }

    // Cascade delete all messages belonging to this conversation
    const deleteResult = await MessageModel.deleteMany({
      conversation: convId,
      owner: ownerId
    });

    logger.info(
      `Deleted conversation ${conversationId} and ${deleteResult.deletedCount} messages for user ${userId}`
    );
  }

  /**
   * Sends a message into a conversation:
   * 1. Verifies conversation ownership.
   * 2. Saves the user message.
   * 3. Retrieves recent bounded conversation history (CHAT_HISTORY_LIMIT).
   * 4. Executes the RAG pipeline using SearchService.searchSemantic(userId, ...).
   * 5. Saves the assistant message with source citations.
   * 6. Updates conversation title (if still default) and updatedAt timestamp.
   */
  public static async sendMessage(
    userId: string,
    conversationId: string,
    text: string,
    organizationId?: string
  ): Promise<SendMessageResult> {
    const ownerId = new Types.ObjectId(userId);
    const convId = new Types.ObjectId(conversationId);

    // 1. Strict ownership and organization isolation verification
    const filter: any = { _id: convId, owner: ownerId };
    if (organizationId) {
      filter.organizationId = new Types.ObjectId(organizationId);
    }

    const conversation = await ConversationModel.findOne(filter);

    if (!conversation) {
      const error = new Error('Conversation not found');
      (error as any).statusCode = 404;
      throw error;
    }

    // 2. Persist user message
    const userMessage = await MessageModel.create({
      conversation: convId,
      owner: ownerId,
      role: 'user',
      content: text.trim(),
      sources: []
    });

    // 3. Load bounded conversation history (prior to this question)
    const recentMessages = await MessageModel.find({
      conversation: convId,
      owner: ownerId,
      _id: { $ne: userMessage._id }
    })
      .sort({ createdAt: -1 })
      .limit(env.CHAT_HISTORY_LIMIT)
      .lean();

    const formattedHistory = recentMessages
      .reverse()
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));

    const resolvedOrgId = conversation.organizationId?.toString() || organizationId;

    // 4. Run RAG pipeline (consumes SearchService with organization tenant isolation)
    const ragResult: IRagResult = await this.ragService.generateAnswer(
      userId,
      text.trim(),
      formattedHistory,
      resolvedOrgId
    );

    // 5. Map and persist assistant message with sources
    const mappedSources = ragResult.sources.map((s) => ({
      documentId: new Types.ObjectId(s.documentId),
      documentName: s.documentName,
      chunkId: new Types.ObjectId(s.chunkId),
      chunkIndex: s.chunkIndex,
      similarityScore: s.similarityScore
    }));

    const assistantMessage = await MessageModel.create({
      conversation: convId,
      owner: ownerId,
      role: 'assistant',
      content: ragResult.answer,
      sources: mappedSources
    });

    // 6. Update conversation title if default or first interaction
    if (conversation.title === 'New Conversation') {
      const autoTitle =
        text.length > 40 ? text.substring(0, 37).trim() + '...' : text.trim();
      conversation.title = autoTitle;
    }
    conversation.updatedAt = new Date();
    await conversation.save();

    return {
      userMessage,
      assistantMessage,
      sources: ragResult.sources,
      isGrounded: ragResult.isGrounded
    };
  }
}
