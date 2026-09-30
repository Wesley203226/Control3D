import { asyncHandler } from '../lib/asyncHandler';
import { getId, getUserId } from '../lib/params';
import * as filamentService from '../services/filament.service';

export const list = asyncHandler(async (req, res) => {
  const modelId = Number(req.params.modelId);
  res.json(await filamentService.list(getUserId(res), modelId));
});

export const get = asyncHandler(async (req, res) => {
  res.json(await filamentService.get(getUserId(res), getId(req)));
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await filamentService.create(getUserId(res), req.body));
});

export const update = asyncHandler(async (req, res) => {
  res.json(await filamentService.update(getUserId(res), getId(req), req.body));
});

export const remove = asyncHandler(async (req, res) => {
  await filamentService.remove(getUserId(res), getId(req));
  res.status(204).send();
});
