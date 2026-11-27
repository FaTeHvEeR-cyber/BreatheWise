import {
  handleAiPostRequest,
  type ApiRequestLike,
  type ApiResponseLike,
} from '../../src/services/aiController.js';

/** Vercel POST /api/gemini/indoor endpoint returning room-by-room mitigation steps. */
export default async function handler(req: ApiRequestLike, res: ApiResponseLike): Promise<void> {
  await handleAiPostRequest(req, res, 'indoorProtocol');
}
