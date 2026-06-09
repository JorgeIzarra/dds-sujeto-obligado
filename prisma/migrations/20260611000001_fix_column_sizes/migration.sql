-- Cambiar VARCHAR a TEXT para columnas que almacenan datos cifrados con AES-256-GCM
-- El cifrado hex produce cadenas mucho más largas que el texto original.
ALTER TABLE "cliente" ALTER COLUMN "nombre" TYPE TEXT;
ALTER TABLE "cliente" ALTER COLUMN "num_documento" TYPE TEXT;
