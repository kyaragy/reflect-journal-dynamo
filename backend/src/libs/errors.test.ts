import assert from 'node:assert/strict';
import test from 'node:test';
import { AppError, toAppError, validationError } from './errors';

test('toAppError preserves explicit AppError instances', () => {
  const error = validationError('INVALID_REQUEST_BODY', 'summary must be a string');

  const appError = toAppError(error);

  assert.equal(appError, error);
  assert.equal(appError.message, 'summary must be a string');
});

test('toAppError hides unexpected internal error messages', () => {
  const appError = toAppError(new Error('dynamodb table arn should not leak'));

  assert(appError instanceof AppError);
  assert.equal(appError.code, 'INTERNAL_SERVER_ERROR');
  assert.equal(appError.statusCode, 500);
  assert.equal(appError.message, 'Internal server error');
});
