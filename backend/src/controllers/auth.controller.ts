import { asyncHandler } from '../lib/asyncHandler';
import { getUserId } from '../lib/params';
import * as service from '../services/auth.service';

export const register = asyncHandler(async (req, res) => {
  const user = await service.register(req.body);
  res.status(201).json({ message: 'Usuário cadastrado com sucesso', user });
});

export const login = asyncHandler(async (req, res) => {
  const { token, user } = await service.login(req.body.email, req.body.password);
  res.json({ message: 'Login realizado com sucesso', token, user });
});

export const me = asyncHandler(async (_req, res) => {
  res.json(await service.getMe(getUserId(res)));
});
