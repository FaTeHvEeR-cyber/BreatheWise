import {
  handleQuestionsStreamRequest,
  type ApiRequestLike,
  type ApiResponseLike,
} from '../../../src/services/aiController.js';

/** Vercel POST /api/gemini/questions/stream SSE endpoint for clarifying questions. */
export default async function handler(req: ApiRequestLike, res: ApiResponseLike): Promise<void> {
  await handleQuestionsStreamRequest(req, res);
}
