export type JwtAuthorizer = {
  claims?: Record<string, string>;
};

export type ApiGatewayHttpEvent = {
  version: '2.0';
  rawPath: string;
  rawQueryString?: string;
  body?: string | null;
  isBase64Encoded?: boolean;
  headers?: Record<string, string | undefined>;
  pathParameters?: Record<string, string | undefined>;
  requestContext: {
    requestId?: string;
    http: {
      method: string;
      path: string;
    };
    authorizer?: {
      jwt?: JwtAuthorizer;
    };
  };
};

export type ApiGatewayHttpResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};
