import {
  aiJournalApiPaths,
  assertAiJournalNoteId,
  type DeleteAiJournalNoteResponse,
  type GetAiJournalSnapshotResponse,
  type PostAiJournalNoteResponse,
  type PostAttachRunToNotesRequest,
  type PostAttachRunToNotesResponse,
  type PostImportOneOnOneSummaryRequest,
  type PostImportOneOnOneSummaryResponse,
  type PutAiJournalNoteRequest,
  type PutAiJournalNoteResponse,
  type PutBookPropertiesRequest,
  type PutBookPropertiesResponse,
} from '../../contracts/aiJournalApi';
import { normalizeAiJournalSnapshot } from '../../domain/aiJournal';
import { normalizeBookProperties, type BookProperties } from '../../domain/book';
import type { ImportOneOnOneSummaryInput } from '../../domain/oneOnOne';
import { apiClient } from '../../lib/apiClient';
import type { AiJournalRepository } from '../aiJournalRepository';

export const apiAiJournalRepository: AiJournalRepository = {
  async getSnapshot() {
    const response = await apiClient.get<GetAiJournalSnapshotResponse>(aiJournalApiPaths.notes());
    return normalizeAiJournalSnapshot(response.data);
  },

  async replaceSnapshot() {
    throw new Error('API driver does not support replaceSnapshot.');
  },

  async createNote(input) {
    const response = await apiClient.post<PostAiJournalNoteResponse>(aiJournalApiPaths.notes(), input);
    return response.data;
  },

  async updateNote(noteId, input) {
    assertAiJournalNoteId(noteId);
    const payload: PutAiJournalNoteRequest = input;
    const response = await apiClient.put<PutAiJournalNoteResponse>(aiJournalApiPaths.note(noteId), payload);
    return response.data;
  },

  async deleteNote(noteId) {
    assertAiJournalNoteId(noteId);
    const response = await apiClient.delete<DeleteAiJournalNoteResponse>(aiJournalApiPaths.note(noteId));
    return response.data;
  },

  async attachRunToNotes(noteIds, runId) {
    const payload: PostAttachRunToNotesRequest = {
      noteIds,
      runId,
    };
    await apiClient.post<PostAttachRunToNotesResponse>(aiJournalApiPaths.attachRunToNotes(), payload);
  },

  async importOneOnOneSummary(input) {
    const payload: PostImportOneOnOneSummaryRequest = input as ImportOneOnOneSummaryInput;
    const response = await apiClient.post<PostImportOneOnOneSummaryResponse>(aiJournalApiPaths.importOneOnOneSummary(), payload);
    return response.data;
  },

  async importBookProperties(noteId, book) {
    assertAiJournalNoteId(noteId);
    const payload: PutBookPropertiesRequest = {
      book: normalizeBookProperties(book as BookProperties),
    };
    const response = await apiClient.put<PutBookPropertiesResponse>(aiJournalApiPaths.noteBookProperties(noteId), payload);
    return response.data;
  },
};
