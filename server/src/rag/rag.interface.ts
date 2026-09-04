export interface IRagSource {
  documentId: string;
  documentName: string;
  chunkId: string;
  chunkIndex: number;
  similarityScore: number;
}

export interface IRagResult {
  answer: string;
  sources: IRagSource[];
  isGrounded: boolean;
  latencyMs: number;
}

export interface IRagService {
  generateAnswer(
    userId: string,
    question: string,
    history?: Array<{ role: 'user' | 'assistant'; content: string }>,
    organizationId?: string
  ): Promise<IRagResult>;
}
