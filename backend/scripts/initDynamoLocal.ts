import { DynamoDBClient, CreateTableCommand, DescribeTableCommand, waitUntilTableExists } from '@aws-sdk/client-dynamodb';

const tableName = process.env.JOURNAL_TABLE_NAME ?? 'reflect-journal-dynamo-local-main';
const region = process.env.AWS_REGION ?? 'ap-northeast-1';
const endpoint = (process.env.DYNAMODB_ENDPOINT ?? 'http://127.0.0.1:8000').replace(
  'http://localhost:',
  'http://127.0.0.1:'
);

const client = new DynamoDBClient({
  region,
  endpoint,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'dummy',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'dummy',
  },
});

const ensureTable = async () => {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    console.log(`DynamoDB table already exists: ${tableName}`);
    return;
  } catch (error) {
    const code =
      typeof error === 'object' && error && 'name' in error && typeof error.name === 'string'
        ? error.name
        : undefined;
    const message = error instanceof Error ? error.message : String(error);
    const isMissingTable =
      code === 'ResourceNotFoundException' ||
      message.includes('Requested resource not found') ||
      message.includes('non-existent table');

    if (!isMissingTable) {
      throw error;
    }
  }

  await client.send(
    new CreateTableCommand({
      TableName: tableName,
      BillingMode: 'PAY_PER_REQUEST',
      AttributeDefinitions: [
        { AttributeName: 'PK', AttributeType: 'S' },
        { AttributeName: 'SK', AttributeType: 'S' },
      ],
      KeySchema: [
        { AttributeName: 'PK', KeyType: 'HASH' },
        { AttributeName: 'SK', KeyType: 'RANGE' },
      ],
    })
  );

  await waitUntilTableExists(
    {
      client,
      maxWaitTime: 30,
    },
    {
      TableName: tableName,
    }
  );

  console.log(`Created DynamoDB table: ${tableName}`);
};

await ensureTable();
