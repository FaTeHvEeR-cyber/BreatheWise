import {
  handleAiPostRequest,
  type ApiRequestLike,
  type ApiResponseLike,
} from '../../src/services/aiController.js';

/** Vercel POST /api/gemini/routine endpoint returning a 4-block low-emission daily routine. */
export default async function handler(req: ApiRequestLike, res: ApiResponseLike): Promise<void> {
  await handleAiPostRequest(req, res, 'dailyRoutine');
}
