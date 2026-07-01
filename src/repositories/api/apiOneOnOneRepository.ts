import {
  aiJournalApiPaths,
  assertOneOnOneRunId,
  type GetOneOnOneSnapshotResponse,
  type PostOneOnOneRunRequest,
  type PostOneOnOneRunResponse,
  type PutOneOnOneRunSummaryRequest,
  type PutOneOnOneRunSummaryResponse,
} from '../../contracts/aiJournalApi';
import { normalizeOneOnOneSnapshot } from '../../domain/oneOnOne';
import { apiClient } from '../../lib/apiClient';
import type { CreateOneOnOneRunInput, OneOnOneRepository } from '../oneOnOneRepository';

export const apiOneOnOneRepository: OneOnOneRepository = {
  async getSnapshot() {
    const response = await apiClient.get<GetOneOnOneSnapshotResponse>(aiJournalApiPaths.oneOnOneRuns());
    return normalizeOneOnOneSnapshot(response.data);
  },

  async replaceSnapshot() {
    throw new Error('API driver does not support replaceSnapshot.');
  },

  async createRun(input) {
    const payload: PostOneOnOneRunRequest = input as CreateOneOnOneRunInput;
    const response = await apiClient.post<PostOneOnOneRunResponse>(aiJournalApiPaths.oneOnOneRuns(), payload);
    return response.data;
  },

  async markRunSummarized(runId, summaryNoteId) {
    assertOneOnOneRunId(runId);
    const payload: PutOneOnOneRunSummaryRequest = {
      summaryNoteId,
    };
    const response = await apiClient.put<PutOneOnOneRunSummaryResponse>(aiJournalApiPaths.oneOnOneRunSummary(runId), payload);
    return response.data;
  },
};
