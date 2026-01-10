
import { User, UserRole } from './types';

export interface UserWithPin extends User {
  pin: string;
}

export const MOCK_USERS: UserWithPin[] = [
  { id: 'u1', name: 'Rocío', role: UserRole.DISENADOR, pin: '1111' },
  { id: 'u2', name: 'Juan Carlos', role: UserRole.DISENADOR, pin: '2222' },
  { id: 'u3', name: 'Natalia', role: UserRole.EDITOR, pin: '3333' },
  { id: 'u4', name: 'Eleonora', role: UserRole.EDITOR, pin: '4444' },
  { id: 'u5', name: 'Matías', role: UserRole.MARKETING_LEAD, pin: '5555' },
];

export const STATUS_COLORS: Record<string, string> = {
  'Iniciado': 'bg-blue-100 text-blue-700 border-blue-200',
  'En edición': 'bg-amber-100 text-amber-700 border-amber-200',
  'En revisión': 'bg-purple-100 text-purple-700 border-purple-200',
  'Devuelto': 'bg-orange-100 text-orange-700 border-orange-200',
  'Rechazado': 'bg-red-100 text-red-700 border-red-200',
  'Aprobado y guardado': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Cancelado': 'bg-red-50 text-red-600 border-red-200',
};

export const GLOSSARY = [
  { status: 'Iniciado', desc: 'Contenido con prompt inicial pero sin contexto completo.' },
  { status: 'En edición', desc: 'El generador está refinando la pieza con la IA.' },
  { status: 'En revisión', desc: 'Esperando feedback de Matías.' },
  { status: 'Devuelto', desc: 'Requiere ajustes solicitados por el Responsable.' },
  { status: 'Aprobado y guardado', desc: 'Contenido listo para su uso publicitario.', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { status: 'Rechazado/Cancelado', desc: 'Piezas descartadas o abandonadas.', color: 'bg-red-100 text-red-700 border-red-200' },
];
