import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const tableName = process.env.JOURNAL_TABLE_NAME ?? 'reflect-journal-dynamo-local-main';
const region = process.env.AWS_REGION ?? 'ap-northeast-1';
const endpoint = (process.env.DYNAMODB_ENDPOINT ?? 'http://127.0.0.1:8000').replace(
  'http://localhost:',
  'http://127.0.0.1:'
);

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region,
    endpoint,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'dummy',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'dummy',
    },
  }),
  {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  }
);

const item = {
  PK: 'USER#local-dev-user',
  SK: 'DAY#2026-03-18',
  entityType: 'DAY',
  date: '2026-03-18',
  dailySummary: '',
  createdAt: '2026-03-21T04:50:25.346Z',
  updatedAt: '2026-03-21T04:52:33.205Z',
  cards: [
    {
      id: '634108c6-1d0a-4740-bc7d-8dd9ee23de89',
      fact: '',
      thought: '自分の作ったアプリケーションがどこからでも使えるって感動的なことだし、生成AIでハードルが下がったからできることで最高',
      emotion: 'すごい嬉しい',
      bodySensation: '',
      createdAt: '2026-03-21T04:50:25.346Z',
      updatedAt: '2026-03-21T04:50:25.346Z',
    },
    {
      id: 'c812cac7-3c20-4eca-97c0-ac67bf3de45e',
      fact: 'フロントのUI改修とデプロイをした',
      thought: 'すぐにAmplifyへビルド／デプロイが走るのが、世の中のITは便利になっていると感じた',
      emotion: '超楽しい\n\n',
      bodySensation: '',
      createdAt: '2026-03-21T04:50:42.259Z',
      updatedAt: '2026-03-21T04:50:42.259Z',
    },
    {
      id: '6a69e133-8c3e-47d2-b264-f273c2e67fcf',
      fact: 'ひとまず完成した',
      thought: 'これから、毎日つかっていく',
      emotion: '',
      bodySensation: '',
      createdAt: '2026-03-21T04:50:54.135Z',
      updatedAt: '2026-03-21T04:50:54.135Z',
    },
    {
      id: 'f5ed6af6-8705-409e-bf8e-f2b39b734a9e',
      fact: 'プロパー・PMO定例に参加して、望月が返事がない',
      thought: '',
      emotion: 'ゴミすぎる',
      bodySensation: '',
      createdAt: '2026-03-21T04:51:05.705Z',
      updatedAt: '2026-03-21T04:51:05.705Z',
    },
    {
      id: 'b13fb1db-48c7-4e79-96e3-5b26f81a42ae',
      fact: '',
      thought: 'アプリは完成したので、ふりかえり用のプロンプトを作らないと。\nプロンプト案も考えてもらえれば良いかな。',
      emotion: '',
      bodySensation: '',
      createdAt: '2026-03-21T04:51:12.191Z',
      updatedAt: '2026-03-21T04:51:12.191Z',
    },
    {
      id: '9e478b6a-cd6c-46aa-a03d-005700c091f6',
      fact: 'プロパー・PMO定例で、プロパー間で話せばよいタスクの話をダラダラ聞かされた',
      thought: '別場でさっさと話しとけやと思った',
      emotion: '',
      bodySensation: '眠くなってきた',
      createdAt: '2026-03-21T04:51:28.759Z',
      updatedAt: '2026-03-21T04:51:28.759Z',
    },
    {
      id: '6d9c01ea-81e9-4e44-a8d6-5b1750e59fdf',
      fact: 'PMタスクの棚卸し／横並び整理をした',
      thought:
        'タスク整理してて感じたけど、チーム／プロセスの改善とかの活動が一切なくて呆れた。\nルーティン的なタスクしか無いことに気付いた。\n開発のレビューはあるけど、これもほぼルーティンやんけ。\nあと、要件整理／検討みたいなタスクも無くて、こいつら何してるんやってことが気づけた',
      emotion: 'だるい\nおもんない\nカス',
      bodySensation: '',
      createdAt: '2026-03-21T04:51:45.553Z',
      updatedAt: '2026-03-21T04:51:45.553Z',
    },
    {
      id: '7fdf87f9-49c4-41a8-9e67-9904251c1c9f',
      fact: 'バリューブックスから購入した本が届いた',
      thought: 'スマホいじる時間を減らして、本を読むのだと思った',
      emotion: '',
      bodySensation: '',
      createdAt: '2026-03-21T04:51:56.056Z',
      updatedAt: '2026-03-21T04:51:56.056Z',
    },
    {
      id: '48e61eed-893f-485c-9e89-e517ba80f488',
      fact:
        '決済PFのタスク割当についての話し合いがあった\n片山が、ゴールとか何を決めるとかが無いままダラダラと話していた。疑問とかが途中で出てくるのはしょうがないけど、それを都度話してたらキリが無い。',
      thought:
        '黙って聞いてたけど、途中で割って入った方が良かったのかもしれないな。\n成長のためとか適当なことを思ったけど、単純に指摘するっていうのを避けただけの気もする\n途中で疑問になった部分は本筋・目的と合致することなのか、合致しないなら一旦メモに残して終わってから議論するとかの進め方をした方が良いとアドバイスをすべきだった',
      emotion: '長いな。だるいな',
      bodySensation: '',
      createdAt: '2026-03-21T04:52:23.679Z',
      updatedAt: '2026-03-21T04:52:23.679Z',
    },
    {
      id: 'daedab10-5c8d-4293-9d57-c87220482f12',
      fact: '現構成だとコストが高くて、毎月7000円ぐらいかかることが分かった',
      thought:
        'なんでコスト試算をしなかったんだろう？\nしたはずだけど具体的にはいくらになるって試算だったんだろうか？\n7000円だとこの方式は採用しなかったな',
      emotion: '',
      bodySensation: '',
      createdAt: '2026-03-21T04:52:33.205Z',
      updatedAt: '2026-03-21T04:52:33.205Z',
    },
  ],
};

await client.send(
  new PutCommand({
    TableName: tableName,
    Item: item,
  })
);

console.log(`Seeded legacy day item for local-dev-user into ${tableName}`);
