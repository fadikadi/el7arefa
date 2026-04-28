export interface LocalRegistration {
  gameId: string;
  token: string;
}

export interface LocalPlayer {
  id: string;
  name: string;
  phone: string;
}

const STORAGE_KEY = 'mf_registrations';
const PLAYER_KEY = 'mf_player';

export const getLocalRegistrations = (): LocalRegistration[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Failed to parse local registrations', err);
    return [];
  }
};

export const addLocalRegistration = (gameId: string, token: string) => {
  const current = getLocalRegistrations();
  const updated = [...current.filter(r => r.gameId !== gameId), { gameId, token }];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const getLocalRegistrationForGame = (gameId: string): LocalRegistration | undefined => {
  return getLocalRegistrations().find(r => r.gameId === gameId);
};

export const removeLocalRegistration = (gameId: string) => {
  const updated = getLocalRegistrations().filter(r => r.gameId !== gameId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const getLocalPlayer = (): LocalPlayer | null => {
  try {
    const data = localStorage.getItem(PLAYER_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const setLocalPlayer = (player: LocalPlayer) => {
  localStorage.setItem(PLAYER_KEY, JSON.stringify(player));
};

export const clearLocalPlayer = () => {
  localStorage.removeItem(PLAYER_KEY);
};
