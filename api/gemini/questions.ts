import {
  handleAiPostRequest,
  type ApiRequestLike,
  type ApiResponseLike,
} from '../../src/services/aiController.js';

/** Vercel POST /api/gemini/questions endpoint returning clarifying intake questions. */
export default async function handler(req: ApiRequestLike, res: ApiResponseLike): Promise<void> {
  await handleAiPostRequest(req, res, 'clarifyingQuestions');
}
