import { routeRequest } from '../../routes';
import { errorResponse } from '../../libs/response';
import { createJournalServiceFromEnv } from '../../repositories/factory';
import { JournalService } from '../../services/journalService';
import type { ApiGatewayHttpEvent, ApiGatewayHttpResponse } from './types';

let sharedJournalService: JournalService | null = null;

const getJournalService = () => {
  if (!sharedJournalService) {
    sharedJournalService = createJournalServiceFromEnv('dynamodb').journalService;
  }

  return sharedJournalService;
};

export const createHandler = (journalService: JournalService) => {
  return async (event: ApiGatewayHttpEvent): Promise<ApiGatewayHttpResponse> => {
    try {
      return await routeRequest(event, { journalService });
    } catch (error) {
      console.error('API handler failed', {
        requestId: event.requestContext.requestId,
        method: event.requestContext.http.method,
        path: event.rawPath,
        error,
      });
      return errorResponse(error, event.requestContext.requestId);
    }
  };
};

export const handler = async (event: ApiGatewayHttpEvent): Promise<ApiGatewayHttpResponse> =>
  createHandler(getJournalService())(event);
