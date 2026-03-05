import { customAlphabet } from 'nanoid';

const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
const generate = customAlphabet(alphabet, 10);

export function generateMeetingCode(): string {
  const raw = generate();
  return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7)}`;
}
