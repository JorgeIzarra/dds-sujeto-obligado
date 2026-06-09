-- Migration: s02_modelos_y_secuencia
-- Sesión 2 — SPEC-DATA-01..03, SPEC-SEC-01
-- Divergencias documentadas en docs/sesiones/sesion-02.md §4:
--   VOL-S2-01: nombre y num_documento son TEXT (no VARCHAR(200))
--   VOL-S2-02: idx_cliente_nombre sobre campo cifrado; búsqueda diferida a Sesión 7
--   VOL-S2-03: folio nullable — conflicto SPEC-DATA-01 vs SPEC-API-02 (borrador sin folio)

-- CreateSequence (SPEC-DATA-01, RN-03) — usada por FolioService en Sesión 5
CREATE SEQUENCE "seq_folio_dds" START 1;

-- CreateTable
CREATE TABLE "oficial" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nombre" VARCHAR(120) NOT NULL,
    "cargo" VARCHAR(20) NOT NULL,
    "email" VARCHAR(120) NOT NULL,
    "hash_password" VARCHAR(255) NOT NULL,

    CONSTRAINT "oficial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "formulario_dds_pkey" PRIMARY KEY ("id")
);

-- CreateTable (VOL-S2-01: nombre y num_documento TEXT por ciphertext AES-256-GCM)
CREATE TABLE "cliente" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "formulario_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo_documento" VARCHAR(40) NOT NULL,
    "num_documento" TEXT NOT NULL,
    "fecha_nacimiento" DATE,
    "nacionalidad" VARCHAR(60) NOT NULL,
    "tipo_cliente" VARCHAR(20) NOT NULL,
    "es_pep" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "datos_contacto" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "formulario_id" UUID NOT NULL,
    "direccion" TEXT NOT NULL,
    "telefono" VARCHAR(40) NOT NULL,
    "correo" VARCHAR(120) NOT NULL,
    "fecha_verif" TIMESTAMPTZ,

    CONSTRAINT "datos_contacto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfil_economico" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "formulario_id" UUID NOT NULL,
    "actividad" VARCHAR(120) NOT NULL,
    "fuente_ingresos" VARCHAR(120) NOT NULL,
    "ingreso_mensual" DECIMAL(12,2) NOT NULL,
    "volumen_transacciones" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "perfil_economico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documento" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "formulario_id" UUID NOT NULL,
    "tipo" VARCHAR(80) NOT NULL,
    "fecha_recepcion" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "base_legal" VARCHAR(80),

    CONSTRAINT "documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable (RNF-05, Art. 55)
CREATE TABLE "log_auditoria" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_id" UUID,
    "accion" VARCHAR(40) NOT NULL,
    "entidad" VARCHAR(40) NOT NULL,
    "entidad_id" UUID,
    "detalle" JSONB,

    CONSTRAINT "log_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "oficial_email_key" ON "oficial"("email");

-- CreateIndex
CREATE UNIQUE INDEX "formulario_dds_folio_key" ON "formulario_dds"("folio");

-- CreateIndex (VOL-S2-02: sobre campo cifrado; rediseñar en Sesión 7)
CREATE INDEX "idx_cliente_nombre" ON "cliente"("nombre");

-- AddForeignKey
ALTER TABLE "formulario_dds" ADD CONSTRAINT "formulario_dds_oficial_id_fkey" FOREIGN KEY ("oficial_id") REFERENCES "oficial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_formulario_id_fkey" FOREIGN KEY ("formulario_id") REFERENCES "formulario_dds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datos_contacto" ADD CONSTRAINT "datos_contacto_formulario_id_fkey" FOREIGN KEY ("formulario_id") REFERENCES "formulario_dds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfil_economico" ADD CONSTRAINT "perfil_economico_formulario_id_fkey" FOREIGN KEY ("formulario_id") REFERENCES "formulario_dds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento" ADD CONSTRAINT "documento_formulario_id_fkey" FOREIGN KEY ("formulario_id") REFERENCES "formulario_dds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_auditoria" ADD CONSTRAINT "log_auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "oficial"("id") ON DELETE SET NULL ON UPDATE CASCADE;
