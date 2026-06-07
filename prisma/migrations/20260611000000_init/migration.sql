-- CreateSequence for folio (SPEC-DATA-01, RN-03)
CREATE SEQUENCE IF NOT EXISTS seq_folio_dds START 1;

-- CreateTable: formulario_dds
CREATE TABLE "formulario_dds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "folio" VARCHAR(20),
    "fecha" DATE NOT NULL DEFAULT CURRENT_DATE,
    "proposito" TEXT NOT NULL,
    "clasificacion_riesgo" VARCHAR(20),
    "estado" VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',
    "fecha_cierre" DATE,
    "fecha_expiracion" DATE,
    "oficial_id" UUID NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "actualizado_en" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "formulario_dds_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "formulario_dds_folio_key" UNIQUE ("folio")
);

-- CreateTable: cliente
CREATE TABLE "cliente" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "formulario_id" UUID NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "tipo_documento" VARCHAR(40) NOT NULL,
    "num_documento" VARCHAR(40) NOT NULL,
    "fecha_nacimiento" DATE,
    "nacionalidad" VARCHAR(60) NOT NULL,
    "tipo_cliente" VARCHAR(20) NOT NULL,
    "es_pep" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cliente_formulario_id_key" UNIQUE ("formulario_id")
);

-- CreateIndex: idx_cliente_nombre (prepara DEF004)
CREATE INDEX "cliente_nombre_idx" ON "cliente"("nombre");

-- CreateTable: datos_contacto
CREATE TABLE "datos_contacto" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "formulario_id" UUID NOT NULL,
    "direccion" TEXT NOT NULL,
    "telefono" VARCHAR(40) NOT NULL,
    "correo" VARCHAR(120) NOT NULL,
    "fecha_verif" TIMESTAMPTZ,

    CONSTRAINT "datos_contacto_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "datos_contacto_formulario_id_key" UNIQUE ("formulario_id")
);

-- CreateTable: perfil_economico
CREATE TABLE "perfil_economico" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "formulario_id" UUID NOT NULL,
    "actividad" VARCHAR(120) NOT NULL,
    "fuente_ingresos" VARCHAR(120) NOT NULL,
    "ingreso_mensual" NUMERIC(12,2) NOT NULL,
    "volumen_transacciones" NUMERIC(12,2) NOT NULL,

    CONSTRAINT "perfil_economico_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "perfil_economico_formulario_id_key" UNIQUE ("formulario_id")
);

-- CreateTable: documento
CREATE TABLE "documento" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "formulario_id" UUID NOT NULL,
    "tipo" VARCHAR(80) NOT NULL,
    "fecha_recepcion" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "base_legal" VARCHAR(80),

    CONSTRAINT "documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable: oficial
CREATE TABLE "oficial" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nombre" VARCHAR(120) NOT NULL,
    "cargo" VARCHAR(20) NOT NULL,
    "email" VARCHAR(120) NOT NULL,
    "hash_password" VARCHAR(255) NOT NULL,

    CONSTRAINT "oficial_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "oficial_email_key" UNIQUE ("email")
);

-- CreateTable: log_auditoria
CREATE TABLE "log_auditoria" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "usuario_id" UUID,
    "accion" VARCHAR(40) NOT NULL,
    "entidad" VARCHAR(40) NOT NULL,
    "entidad_id" UUID,
    "detalle" JSONB,

    CONSTRAINT "log_auditoria_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: formulario_dds -> oficial
ALTER TABLE "formulario_dds" ADD CONSTRAINT "formulario_dds_oficial_id_fkey"
    FOREIGN KEY ("oficial_id") REFERENCES "oficial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: cliente -> formulario_dds
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_formulario_id_fkey"
    FOREIGN KEY ("formulario_id") REFERENCES "formulario_dds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: datos_contacto -> formulario_dds
ALTER TABLE "datos_contacto" ADD CONSTRAINT "datos_contacto_formulario_id_fkey"
    FOREIGN KEY ("formulario_id") REFERENCES "formulario_dds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: perfil_economico -> formulario_dds
ALTER TABLE "perfil_economico" ADD CONSTRAINT "perfil_economico_formulario_id_fkey"
    FOREIGN KEY ("formulario_id") REFERENCES "formulario_dds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: documento -> formulario_dds
ALTER TABLE "documento" ADD CONSTRAINT "documento_formulario_id_fkey"
    FOREIGN KEY ("formulario_id") REFERENCES "formulario_dds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: log_auditoria -> oficial
ALTER TABLE "log_auditoria" ADD CONSTRAINT "log_auditoria_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "oficial"("id") ON DELETE SET NULL ON UPDATE CASCADE;
