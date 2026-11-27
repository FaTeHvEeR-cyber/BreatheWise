import {
  handleAiPostRequest,
  type ApiRequestLike,
  type ApiResponseLike,
} from '../../src/services/aiController.js';

/** Vercel POST /api/gemini/community endpoint generating shareable family/RWA briefings. */
export default async function handler(req: ApiRequestLike, res: ApiResponseLike): Promise<void> {
  await handleAiPostRequest(req, res, 'communityBriefing');
}
