import { createDynamoDbClientFromEnv } from '../db/dynamoDbClient';
import { JournalService } from '../services/journalService';
import { DynamoDbJournalRepository } from './dynamoDbJournalRepository';
import { MemoryJournalRepository } from './memoryJournalRepository';

export type BackendRepositoryDriver = 'dynamodb' | 'memory';

const resolveDriver = (fallback: BackendRepositoryDriver): BackendRepositoryDriver => {
  const configured = process.env.BACKEND_REPOSITORY_DRIVER;
  if (configured === 'memory' || configured === 'dynamodb') {
    return configured;
  }

  return fallback;
};

export const createJournalServiceFromEnv = (fallback: BackendRepositoryDriver = 'dynamodb') => {
  const driver = resolveDriver(fallback);
  const repository =
    driver === 'memory'
      ? new MemoryJournalRepository()
      : new DynamoDbJournalRepository(createDynamoDbClientFromEnv());

  return {
    driver,
    journalService: new JournalService(repository),
  };
};
