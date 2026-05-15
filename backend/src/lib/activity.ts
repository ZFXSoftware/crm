import { getDb } from '../db/database'

export function logActivity(params: {
  type: string
  entity_type: string
  entity_id: string
  description: string
  metadata?: object
  created_by?: number
}) {
  try {
    getDb().prepare(`
      INSERT INTO activities (type, entity_type, entity_id, description, metadata, created_by)
      VALUES (@type, @entity_type, @entity_id, @description, @metadata, @created_by)
    `).run({
      ...params,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      created_by: params.created_by ?? null,
    })
  } catch {
    // Log silencioso — nunca quebra a requisição principal
  }
}
