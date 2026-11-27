import {
  handleAiPostRequest,
  type ApiRequestLike,
  type ApiResponseLike,
} from '../../src/services/aiController.js';

export default async function handler(req: ApiRequestLike, res: ApiResponseLike): Promise<void> {
  await handleAiPostRequest(req, res, 'communityBriefing');
}
