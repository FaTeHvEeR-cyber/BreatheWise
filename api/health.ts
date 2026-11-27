import {
  handleHealthRequest,
  type ApiRequestLike,
  type ApiResponseLike,
} from '../src/services/aiController.js';

export default function handler(req: ApiRequestLike, res: ApiResponseLike): void {
  handleHealthRequest(req, res);
}
