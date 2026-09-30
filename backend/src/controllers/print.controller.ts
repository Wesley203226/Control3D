import { asyncHandler } from '../lib/asyncHandler';
import { getId, getUserId } from '../lib/params';
import * as service from '../services/print.service';

export const list = asyncHandler(async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  res.json(await service.list(getUserId(res), status));
});

export const get = asyncHandler(async (req, res) => {
  res.json(await service.get(getUserId(res), getId(req)));
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await service.create(getUserId(res), req.body));
});

export const update = asyncHandler(async (req, res) => {
  res.json(await service.update(getUserId(res), getId(req), req.body));
});

export const remove = asyncHandler(async (req, res) => {
  await service.remove(getUserId(res), getId(req));
  res.status(204).send();
});
