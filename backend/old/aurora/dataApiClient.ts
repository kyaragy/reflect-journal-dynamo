import {
  BeginTransactionCommand,
  CommitTransactionCommand,
  ExecuteStatementCommand,
  RDSDataClient,
  RollbackTransactionCommand,
  type SqlParameter,
} from '@aws-sdk/client-rds-data';

export type DataApiClientConfig = {
  databaseArn: string;
  secretArn: string;
  databaseName: string;
  region?: string;
};

export class DataApiClient {
  private readonly client: RDSDataClient;
  private readonly databaseArn: string;
  private readonly secretArn: string;
  private readonly databaseName: string;

  constructor(config: DataApiClientConfig) {
    this.client = new RDSDataClient({
      region: config.region ?? process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'ap-northeast-1',
    });
    this.databaseArn = config.databaseArn;
    this.secretArn = config.secretArn;
    this.databaseName = config.databaseName;
  }

  async query<T>(sql: string, parameters: SqlParameter[] = [], transactionId?: string): Promise<T[]> {
    const response = await this.client.send(
      new ExecuteStatementCommand({
        resourceArn: this.databaseArn,
        secretArn: this.secretArn,
        database: this.databaseName,
        sql,
        parameters,
        transactionId,
        includeResultMetadata: true,
        formatRecordsAs: 'JSON',
      })
    );

    if (!response.formattedRecords) {
      return [];
    }

    return JSON.parse(response.formattedRecords) as T[];
  }

  async execute(sql: string, parameters: SqlParameter[] = [], transactionId?: string) {
    await this.client.send(
      new ExecuteStatementCommand({
        resourceArn: this.databaseArn,
        secretArn: this.secretArn,
        database: this.databaseName,
        sql,
        parameters,
        transactionId,
      })
    );
  }

  async transaction<T>(work: (transactionId: string) => Promise<T>) {
    const started = await this.client.send(
      new BeginTransactionCommand({
        resourceArn: this.databaseArn,
        secretArn: this.secretArn,
        database: this.databaseName,
      })
    );

    const transactionId = started.transactionId;
    if (!transactionId) {
      throw new Error('Failed to start transaction');
    }

    try {
      const result = await work(transactionId);
      await this.client.send(
        new CommitTransactionCommand({
          resourceArn: this.databaseArn,
          secretArn: this.secretArn,
          transactionId,
        })
      );
      return result;
    } catch (error) {
      await this.client.send(
        new RollbackTransactionCommand({
          resourceArn: this.databaseArn,
          secretArn: this.secretArn,
          transactionId,
        })
      );
      throw error;
    }
  }
}

export const stringParam = (name: string, value: string): SqlParameter => ({
  name,
  value: {
    stringValue: value,
  },
});

export const numberParam = (name: string, value: number): SqlParameter => ({
  name,
  value: {
    longValue: value,
  },
});

export const nullableStringParam = (name: string, value: string | null | undefined): SqlParameter => ({
  name,
  value: value == null ? { isNull: true } : { stringValue: value },
});

export const createDataApiClientFromEnv = () => {
  const databaseArn = process.env.DATABASE_ARN;
  const secretArn = process.env.DATABASE_SECRET_ARN;
  const databaseName = process.env.DATABASE_NAME;

  if (!databaseArn || !secretArn || !databaseName) {
    throw new Error('DATABASE_ARN, DATABASE_SECRET_ARN, and DATABASE_NAME are required');
  }

  return new DataApiClient({
    databaseArn,
    secretArn,
    databaseName,
    region: process.env.AWS_REGION,
  });
};
