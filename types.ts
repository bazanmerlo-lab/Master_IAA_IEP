
export enum ContentStatus {
  INICIADO = 'Iniciado',
  EN_EDICION = 'En edición',
  EN_REVISION = 'En revisión',
  DEVUELTO = 'Devuelto',
  RECHAZADO = 'Rechazado',
  APROBADO = 'Aprobado y guardado',
  CANCELADO = 'Cancelado'
}

export enum ContentType {
  IMAGEN = 'Imagen',
  TEXTO = 'Texto'
}

export enum UserRole {
  DISENADOR = 'Diseñador de Imágenes',
  EDITOR = 'Editor de Texto',
  MARKETING_LEAD = 'Responsable de Marketing'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
}

export interface ProjectLog {
  timestamp: number;
  userId: string;
  userName: string;
  action: string;
  details?: string;
}

export interface ContentProject {
  id: string;
  type: ContentType;
  status: ContentStatus;
  creatorId: string;
  title: string;
  prompt: string;
  iterations?: number;
  context?: {
    objective: string;
    audience: string;
    tone: string;
    style: string;
    restrictions: string;
  };
  output?: string;
  creatorComments?: string;
  reviewerComments?: string;
  updatedAt: number;
  logs: ProjectLog[];
}
