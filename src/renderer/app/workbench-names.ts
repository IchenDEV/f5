export function initialsFromName(value: string, fallback: string): string {
  const name = value.trim();
  if (!name) return fallback;
  const parts = name.split(/\s+/);
  if (parts.length > 1) return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  return Array.from(name).slice(0, 2).join('').toUpperCase();
}

export function userInitials(displayName: string): string {
  return initialsFromName(displayName, 'U');
}

export function agentInitials(agentName: string): string {
  return initialsFromName(agentName, 'AI');
}
