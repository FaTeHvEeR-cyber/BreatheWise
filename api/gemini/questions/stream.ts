import {
  handleQuestionsStreamRequest,
  type ApiRequestLike,
  type ApiResponseLike,
} from '../../../src/services/aiController.js';

export default async function handler(req: ApiRequestLike, res: ApiResponseLike): Promise<void> {
  await handleQuestionsStreamRequest(req, res);
}
