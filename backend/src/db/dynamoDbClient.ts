import {
  BatchGetCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

export class DynamoDbClient {
  constructor(
    private readonly tableName: string,
    private readonly client: DynamoDBDocumentClient
  ) {}

  getTableName() {
    return this.tableName;
  }

  async getItem<T>(key: Record<string, string>) {
    const response = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: key,
      })
    );

    return response.Item as T | undefined;
  }

  async putItem(item: Record<string, unknown>) {
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      })
    );
  }

  async deleteItem(key: Record<string, string>) {
    await this.client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: key,
      })
    );
  }

  async queryByPartition<T>(pk: string) {
    const items: T[] = [];
    let exclusiveStartKey: Record<string, unknown> | undefined;

    do {
      const response = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: 'PK = :pk',
          ExpressionAttributeValues: {
            ':pk': pk,
          },
          ExclusiveStartKey: exclusiveStartKey,
        })
      );

      items.push(...((response.Items ?? []) as T[]));
      exclusiveStartKey = response.LastEvaluatedKey;
    } while (exclusiveStartKey);

    return items;
  }

  async queryByPrefix<T>(pk: string, prefix: string) {
    const items: T[] = [];
    let exclusiveStartKey: Record<string, unknown> | undefined;

    do {
      const response = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: {
            ':pk': pk,
            ':prefix': prefix,
          },
          ExclusiveStartKey: exclusiveStartKey,
        })
      );

      items.push(...((response.Items ?? []) as T[]));
      exclusiveStartKey = response.LastEvaluatedKey;
    } while (exclusiveStartKey);

    return items;
  }

  async queryBetween<T>(pk: string, startSk: string, endSk: string) {
    const items: T[] = [];
    let exclusiveStartKey: Record<string, unknown> | undefined;

    do {
      const response = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: 'PK = :pk AND SK BETWEEN :startSk AND :endSk',
          ExpressionAttributeValues: {
            ':pk': pk,
            ':startSk': startSk,
            ':endSk': endSk,
          },
          ExclusiveStartKey: exclusiveStartKey,
        })
      );

      items.push(...((response.Items ?? []) as T[]));
      exclusiveStartKey = response.LastEvaluatedKey;
    } while (exclusiveStartKey);

    return items;
  }

  async batchGetItems<T>(keys: Record<string, string>[]) {
    if (keys.length === 0) {
      return [] as T[];
    }

    const response = await this.client.send(
      new BatchGetCommand({
        RequestItems: {
          [this.tableName]: {
            Keys: keys,
          },
        },
      })
    );

    return ((response.Responses?.[this.tableName] ?? []) as T[]).filter(Boolean);
  }
}

export const createDynamoDbClientFromEnv = () => {
  const tableName = process.env.JOURNAL_TABLE_NAME;
  if (!tableName) {
    throw new Error('JOURNAL_TABLE_NAME is required');
  }

  const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'ap-northeast-1';
  return new DynamoDbClient(
    tableName,
    DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    })
  );
};
