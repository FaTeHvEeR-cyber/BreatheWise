import {
  handleHealthRequest,
  type ApiRequestLike,
  type ApiResponseLike,
} from '../src/services/aiController.js';

/** Vercel GET /api/health endpoint returning service and Gemini configuration status. */
export default function handler(req: ApiRequestLike, res: ApiResponseLike): void {
  handleHealthRequest(req, res);
}
