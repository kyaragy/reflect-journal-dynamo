import { routeRequest } from '../../routes';
import { errorResponse } from '../../libs/response';
import { createAiJournalServiceFromEnv, createJournalServiceFromEnv } from '../../repositories/factory';
import { AiJournalService } from '../../services/aiJournalService';
import { JournalService } from '../../services/journalService';
import type { ApiGatewayHttpEvent, ApiGatewayHttpResponse } from './types';

let sharedJournalService: JournalService | null = null;
let sharedAiJournalService: AiJournalService | null = null;

const getJournalService = () => {
  if (!sharedJournalService) {
    sharedJournalService = createJournalServiceFromEnv('dynamodb').journalService;
  }

  return sharedJournalService;
};

const getAiJournalService = () => {
  if (!sharedAiJournalService) {
    sharedAiJournalService = createAiJournalServiceFromEnv('dynamodb').aiJournalService;
  }

  return sharedAiJournalService;
};

export const createHandler = (journalService: JournalService, aiJournalService: AiJournalService) => {
  return async (event: ApiGatewayHttpEvent): Promise<ApiGatewayHttpResponse> => {
    try {
      return await routeRequest(event, { journalService, aiJournalService });
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
  createHandler(getJournalService(), getAiJournalService())(event);
