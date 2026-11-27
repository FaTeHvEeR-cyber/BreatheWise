import {
  handleQuestionsStreamRequest,
  type ApiRequestLike,
  type ApiResponseLike,
} from '../../../src/services/aiController';

export default async function handler(req: ApiRequestLike, res: ApiResponseLike): Promise<void> {
  await handleQuestionsStreamRequest(req, res);
}
