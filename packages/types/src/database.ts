export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      business_audit_log: {
        Row: {
          accion: string
          actor_id: string | null
          creado_en: string
          detalle: Json | null
          entidad: string
          entidad_id: string
          id: number
        }
        Insert: {
          accion: string
          actor_id?: string | null
          creado_en?: string
          detalle?: Json | null
          entidad: string
          entidad_id: string
          id?: never
        }
        Update: {
          accion?: string
          actor_id?: string | null
          creado_en?: string
          detalle?: Json | null
          entidad?: string
          entidad_id?: string
          id?: never
        }
        Relationships: []
      }
      cargo_pagos: {
        Row: {
          cargo_id: string
          monto_aplicado: number
          pago_id: string
        }
        Insert: {
          cargo_id: string
          monto_aplicado: number
          pago_id: string
        }
        Update: {
          cargo_id?: string
          monto_aplicado?: number
          pago_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cargo_pagos_cargo_id_fkey'
            columns: ['cargo_id']
            isOneToOne: false
            referencedRelation: 'cargos_cobranza'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cargo_pagos_pago_id_fkey'
            columns: ['pago_id']
            isOneToOne: false
            referencedRelation: 'pagos'
            referencedColumns: ['id']
          },
        ]
      }
      cargos_cobranza: {
        Row: {
          cliente_id: string
          concepto: string
          created_at: string
          created_by: string | null
          estado: Database['public']['Enums']['cargo_estado']
          fecha_vencimiento: string
          id: string
          monto: number
          periodo_anio: number
          periodo_mes: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cliente_id: string
          concepto: string
          created_at?: string
          created_by?: string | null
          estado?: Database['public']['Enums']['cargo_estado']
          fecha_vencimiento: string
          id?: string
          monto: number
          periodo_anio: number
          periodo_mes: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cliente_id?: string
          concepto?: string
          created_at?: string
          created_by?: string | null
          estado?: Database['public']['Enums']['cargo_estado']
          fecha_vencimiento?: string
          id?: string
          monto?: number
          periodo_anio?: number
          periodo_mes?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'cargos_cobranza_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
        ]
      }
      categorias_documento: {
        Row: {
          activa: boolean
          created_at: string
          created_by: string | null
          descripcion: string | null
          id: string
          nombre: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activa?: boolean
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activa?: boolean
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      clientes: {
        Row: {
          correo: string
          created_at: string
          created_by: string | null
          direccion_fiscal: string | null
          estado: Database['public']['Enums']['cliente_estado']
          fecha_alta: string
          fecha_baja: string | null
          id: string
          nombre: string
          regimen_fiscal_codigo: string
          responsable_id: string | null
          rfc: string
          telefono: string | null
          tipo_persona: Database['public']['Enums']['tipo_persona']
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          correo: string
          created_at?: string
          created_by?: string | null
          direccion_fiscal?: string | null
          estado?: Database['public']['Enums']['cliente_estado']
          fecha_alta?: string
          fecha_baja?: string | null
          id?: string
          nombre: string
          regimen_fiscal_codigo: string
          responsable_id?: string | null
          rfc: string
          telefono?: string | null
          tipo_persona: Database['public']['Enums']['tipo_persona']
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          correo?: string
          created_at?: string
          created_by?: string | null
          direccion_fiscal?: string | null
          estado?: Database['public']['Enums']['cliente_estado']
          fecha_alta?: string
          fecha_baja?: string | null
          id?: string
          nombre?: string
          regimen_fiscal_codigo?: string
          responsable_id?: string | null
          rfc?: string
          telefono?: string | null
          tipo_persona?: Database['public']['Enums']['tipo_persona']
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'clientes_regimen_fiscal_codigo_fkey'
            columns: ['regimen_fiscal_codigo']
            isOneToOne: false
            referencedRelation: 'regimenes_fiscales'
            referencedColumns: ['codigo']
          },
        ]
      }
      contactos: {
        Row: {
          cliente_id: string
          created_at: string
          created_by: string | null
          email: string | null
          es_principal: boolean
          estado: Database['public']['Enums']['contacto_estado']
          id: string
          nombre: string
          telefono: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          es_principal?: boolean
          estado?: Database['public']['Enums']['contacto_estado']
          id?: string
          nombre: string
          telefono: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          es_principal?: boolean
          estado?: Database['public']['Enums']['contacto_estado']
          id?: string
          nombre?: string
          telefono?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'contactos_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
        ]
      }
      documentos: {
        Row: {
          cargado_por: string
          categoria_id: string
          cliente_id: string
          created_at: string
          created_by: string | null
          documento_anterior_id: string | null
          estado: Database['public']['Enums']['documento_estado']
          fecha_carga: string
          formato: string
          id: string
          nombre_original: string
          ruta_almacenamiento: string
          tamano_bytes: number
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          cargado_por: string
          categoria_id: string
          cliente_id: string
          created_at?: string
          created_by?: string | null
          documento_anterior_id?: string | null
          estado?: Database['public']['Enums']['documento_estado']
          fecha_carga?: string
          formato: string
          id?: string
          nombre_original: string
          ruta_almacenamiento: string
          tamano_bytes: number
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          cargado_por?: string
          categoria_id?: string
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          documento_anterior_id?: string | null
          estado?: Database['public']['Enums']['documento_estado']
          fecha_carga?: string
          formato?: string
          id?: string
          nombre_original?: string
          ruta_almacenamiento?: string
          tamano_bytes?: number
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'documentos_categoria_id_fkey'
            columns: ['categoria_id']
            isOneToOne: false
            referencedRelation: 'categorias_documento'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'documentos_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'documentos_documento_anterior_id_fkey'
            columns: ['documento_anterior_id']
            isOneToOne: false
            referencedRelation: 'documentos'
            referencedColumns: ['id']
          },
        ]
      }
      metodos_pago: {
        Row: {
          activo: boolean
          created_at: string
          created_by: string | null
          id: string
          nombre: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          nombre: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          nombre?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      pagos: {
        Row: {
          cliente_id: string
          created_at: string
          created_by: string | null
          fecha_pago: string
          id: string
          metodo_pago_id: string
          monto: number
          referencia: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          created_by?: string | null
          fecha_pago?: string
          id?: string
          metodo_pago_id: string
          monto: number
          referencia?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          fecha_pago?: string
          id?: string
          metodo_pago_id?: string
          monto?: number
          referencia?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'pagos_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pagos_metodo_pago_id_fkey'
            columns: ['metodo_pago_id']
            isOneToOne: false
            referencedRelation: 'metodos_pago'
            referencedColumns: ['id']
          },
        ]
      }
      permission_overrides: {
        Row: {
          capability: string
          granted: boolean
          profile_id: string
          set_at: string
          set_by: string | null
        }
        Insert: {
          capability: string
          granted: boolean
          profile_id: string
          set_at?: string
          set_by?: string | null
        }
        Update: {
          capability?: string
          granted?: boolean
          profile_id?: string
          set_at?: string
          set_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'permission_overrides_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      profile_change_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: number
          new_is_active: boolean
          new_role: Database['public']['Enums']['app_role']
          old_is_active: boolean | null
          old_role: Database['public']['Enums']['app_role'] | null
          profile_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: never
          new_is_active: boolean
          new_role: Database['public']['Enums']['app_role']
          old_is_active?: boolean | null
          old_role?: Database['public']['Enums']['app_role'] | null
          profile_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: never
          new_is_active?: boolean
          new_role?: Database['public']['Enums']['app_role']
          old_is_active?: boolean | null
          old_role?: Database['public']['Enums']['app_role'] | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profile_change_history_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          created_by: string | null
          full_name: string | null
          id: string
          is_active: boolean
          must_change_password: boolean
          role: Database['public']['Enums']['app_role']
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          must_change_password?: boolean
          role: Database['public']['Enums']['app_role']
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          must_change_password?: boolean
          role?: Database['public']['Enums']['app_role']
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      recibos: {
        Row: {
          cliente_id: string
          concepto: string
          created_at: string
          created_by: string | null
          fecha_emision: string
          folio: string
          id: string
          monto: number
          pago_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cliente_id: string
          concepto: string
          created_at?: string
          created_by?: string | null
          fecha_emision?: string
          folio: string
          id?: string
          monto: number
          pago_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cliente_id?: string
          concepto?: string
          created_at?: string
          created_by?: string | null
          fecha_emision?: string
          folio?: string
          id?: string
          monto?: number
          pago_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'recibos_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recibos_pago_id_fkey'
            columns: ['pago_id']
            isOneToOne: true
            referencedRelation: 'pagos'
            referencedColumns: ['id']
          },
        ]
      }
      regimenes_fiscales: {
        Row: {
          aplica_persona_fisica: boolean
          aplica_persona_moral: boolean
          codigo: string
          descripcion: string
          fecha_fin_vigencia: string | null
          fecha_inicio_vigencia: string
        }
        Insert: {
          aplica_persona_fisica: boolean
          aplica_persona_moral: boolean
          codigo: string
          descripcion: string
          fecha_fin_vigencia?: string | null
          fecha_inicio_vigencia: string
        }
        Update: {
          aplica_persona_fisica?: boolean
          aplica_persona_moral?: boolean
          codigo?: string
          descripcion?: string
          fecha_fin_vigencia?: string | null
          fecha_inicio_vigencia?: string
        }
        Relationships: []
      }
      servicios: {
        Row: {
          categoria: string
          created_at: string
          created_by: string | null
          descripcion: string | null
          estado: Database['public']['Enums']['servicio_estado']
          id: string
          nombre: string
          observaciones: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          categoria: string
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          estado?: Database['public']['Enums']['servicio_estado']
          id?: string
          nombre: string
          observaciones?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          categoria?: string
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          estado?: Database['public']['Enums']['servicio_estado']
          id?: string
          nombre?: string
          observaciones?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      servicios_contratados: {
        Row: {
          cliente_id: string
          created_at: string
          created_by: string | null
          estado: Database['public']['Enums']['servicio_contratado_estado']
          fecha_fin: string | null
          fecha_inicio: string
          id: string
          observaciones: string | null
          precio_acordado: number
          servicio_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          created_by?: string | null
          estado?: Database['public']['Enums']['servicio_contratado_estado']
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          observaciones?: string | null
          precio_acordado: number
          servicio_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          estado?: Database['public']['Enums']['servicio_contratado_estado']
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          observaciones?: string | null
          precio_acordado?: number
          servicio_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'servicios_contratados_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'servicios_contratados_servicio_id_fkey'
            columns: ['servicio_id']
            isOneToOne: false
            referencedRelation: 'servicios'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clear_must_change_password: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_auth_audit_log: {
        Args: { limit_rows?: number }
        Returns: Json[]
      }
      has_capability: {
        Args: { cap: string }
        Returns: boolean
      }
      is_administrador: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_business_audit: {
        Args: {
          p_accion: string
          p_detalle?: Json
          p_entidad: string
          p_entidad_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: 'administrador' | 'contador' | 'auxiliar'
      cargo_estado: 'pendiente' | 'pagado' | 'vencido' | 'cancelado'
      cliente_estado: 'activo' | 'inactivo'
      contacto_estado: 'activo' | 'obsoleto'
      documento_estado: 'activo' | 'reemplazado'
      servicio_contratado_estado: 'activo' | 'suspendido' | 'finalizado'
      servicio_estado: 'activo' | 'inactivo'
      tipo_persona: 'fisica' | 'moral'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database['storage']['Enums']['buckettype']
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database['storage']['Enums']['buckettype']
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database['storage']['Enums']['buckettype']
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          format: string
          id: string
          type: Database['storage']['Enums']['buckettype']
          updated_at: string
        }
        Insert: {
          created_at?: string
          format?: string
          id: string
          type?: Database['storage']['Enums']['buckettype']
          updated_at?: string
        }
        Update: {
          created_at?: string
          format?: string
          id?: string
          type?: Database['storage']['Enums']['buckettype']
          updated_at?: string
        }
        Relationships: []
      }
      iceberg_namespaces: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'iceberg_namespaces_bucket_id_fkey'
            columns: ['bucket_id']
            isOneToOne: false
            referencedRelation: 'buckets_analytics'
            referencedColumns: ['id']
          },
        ]
      }
      iceberg_tables: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          location: string
          name: string
          namespace_id: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id?: string
          location: string
          name: string
          namespace_id: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          namespace_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'iceberg_tables_bucket_id_fkey'
            columns: ['bucket_id']
            isOneToOne: false
            referencedRelation: 'buckets_analytics'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'iceberg_tables_namespace_id_fkey'
            columns: ['namespace_id']
            isOneToOne: false
            referencedRelation: 'iceberg_namespaces'
            referencedColumns: ['id']
          },
        ]
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          level: number | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'objects_bucketId_fkey'
            columns: ['bucket_id']
            isOneToOne: false
            referencedRelation: 'buckets'
            referencedColumns: ['id']
          },
        ]
      }
      prefixes: {
        Row: {
          bucket_id: string
          created_at: string | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'prefixes_bucketId_fkey'
            columns: ['bucket_id']
            isOneToOne: false
            referencedRelation: 'buckets'
            referencedColumns: ['id']
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: 's3_multipart_uploads_bucket_id_fkey'
            columns: ['bucket_id']
            isOneToOne: false
            referencedRelation: 'buckets'
            referencedColumns: ['id']
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: 's3_multipart_uploads_parts_bucket_id_fkey'
            columns: ['bucket_id']
            isOneToOne: false
            referencedRelation: 'buckets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 's3_multipart_uploads_parts_upload_id_fkey'
            columns: ['upload_id']
            isOneToOne: false
            referencedRelation: 's3_multipart_uploads'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_prefixes: {
        Args: { _bucket_id: string; _name: string }
        Returns: undefined
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      delete_prefix: {
        Args: { _bucket_id: string; _name: string }
        Returns: boolean
      }
      extension: {
        Args: { name: string }
        Returns: string
      }
      filename: {
        Args: { name: string }
        Returns: string
      }
      foldername: {
        Args: { name: string }
        Returns: string[]
      }
      get_level: {
        Args: { name: string }
        Returns: number
      }
      get_prefix: {
        Args: { name: string }
        Returns: string
      }
      get_prefixes: {
        Args: { name: string }
        Returns: string[]
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          start_after?: string
        }
        Returns: {
          id: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_legacy_v1: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v1_optimised: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: 'STANDARD' | 'ANALYTICS'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ['administrador', 'contador', 'auxiliar'],
      cargo_estado: ['pendiente', 'pagado', 'vencido', 'cancelado'],
      cliente_estado: ['activo', 'inactivo'],
      contacto_estado: ['activo', 'obsoleto'],
      documento_estado: ['activo', 'reemplazado'],
      servicio_contratado_estado: ['activo', 'suspendido', 'finalizado'],
      servicio_estado: ['activo', 'inactivo'],
      tipo_persona: ['fisica', 'moral'],
    },
  },
  storage: {
    Enums: {
      buckettype: ['STANDARD', 'ANALYTICS'],
    },
  },
} as const
