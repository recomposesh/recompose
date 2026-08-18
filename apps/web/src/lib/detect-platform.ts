export type Platform = 'mac' | 'windows' | 'linux';

export function detectPlatform(userAgent: string): Platform {
  if (userAgent.includes('Windows')) return 'windows';
  if (/Mac|iPhone|iPad|iPod/.test(userAgent)) return 'mac';
  if (/Linux|X11/.test(userAgent)) return 'linux';

  return 'mac';
}
