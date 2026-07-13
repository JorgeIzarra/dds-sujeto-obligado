// SPEC-API-08 — Exportar a PDF (RF-11, resuelve DEF007)
import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { prisma } from '../../infrastructure/prisma-client';
import { decrypt } from '../../security/crypto.service';
import { AuditoriaRepository } from '../../infrastructure/repositories/auditoria.repository';

const auditoriaRepo = new AuditoriaRepository(prisma);

export interface PDFJob {
  status: 'generating' | 'completed' | 'failed';
  data?: Buffer;
  error?: string;
}

export const pdfJobs = new Map<string, PDFJob>();

export async function postExportarPDF(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const formulario = await prisma.formularioDDS.findUnique({
    where: { id },
    include: {
      clientes: true,
      datosContacto: true,
      perfilesEconomicos: true,
      documentos: true,
    },
  });

  if (!formulario) {
    res.status(404).json({
      error: { codigo: 'FORMULARIO_NO_ENCONTRADO', mensaje: 'Formulario no encontrado' },
    });
    return;
  }

  const jobId = randomUUID();
  pdfJobs.set(jobId, { status: 'generating' });

  // Iniciar generación asíncrona de PDF en segundo plano (DEF007)
  setTimeout(async () => {
    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      let page = pdfDoc.addPage([595.276, 841.890]); // A4
      const { height } = page.getSize();
      let y = height - 50;

      const drawText = (text: string, size = 10, isBold = false) => {
        if (y < 50) {
          page = pdfDoc.addPage([595.276, 841.890]);
          y = height - 50;
        }
        page.drawText(text, {
          x: 50,
          y,
          size,
          font: isBold ? boldFont : font,
          color: rgb(0, 0, 0),
        });
        y -= size + 8;
      };

      drawText('SISTEMA DE DEBIDA DILIGENCIA SIMPLIFICADA (DDS)', 16, true);
      drawText('FORMULARIO DE DEBIDA DILIGENCIA DEL CLIENTE', 12, true);
      y -= 10;

      drawText(`Folio: ${formulario.folio || 'N/A'}`, 10, true);
      drawText(`Estado: ${formulario.estado}`, 10, true);
      drawText(`Fecha Creación: ${formulario.fecha.toISOString().split('T')[0]}`, 10);
      drawText(`Propósito de la Relación: ${formulario.proposito}`, 10);
      y -= 15;

      // Sección 1: Identificación
      drawText('1. DATOS DE IDENTIFICACIÓN', 12, true);
      const cliente = formulario.clientes[0];
      if (cliente) {
        const decryptedNombre = decrypt(cliente.nombre);
        const decryptedDoc = decrypt(cliente.numDocumento);
        drawText(`Nombre Completo: ${decryptedNombre}`, 10);
        drawText(`Tipo Documento: ${cliente.tipoDocumento}`, 10);
        drawText(`Número Documento: ${decryptedDoc}`, 10);
        drawText(`Nacionalidad: ${cliente.nacionalidad}`, 10);
        drawText(`Tipo Cliente: ${cliente.tipoCliente}`, 10);
        drawText(`Es Persona Expuesta Políticamente (PEP): ${cliente.esPep ? 'SÍ' : 'NO'}`, 10);
      } else {
        drawText('No se han registrado datos de identificación.', 10);
      }
      y -= 15;

      // Sección 2: Datos de Contacto
      drawText('2. DATOS DE CONTACTO', 12, true);
      const contacto = formulario.datosContacto[0];
      if (contacto) {
        drawText(`Dirección Habitual: ${contacto.direccion}`, 10);
        drawText(`Teléfono: ${contacto.telefono}`, 10);
        drawText(`Correo Electrónico: ${contacto.correo}`, 10);
      } else {
        drawText('No se han registrado datos de contacto.', 10);
      }
      y -= 15;

      // Sección 3: Perfil Económico
      drawText('3. PERFIL ECONÓMICO Y CLASIFICACIÓN', 12, true);
      const perfil = formulario.perfilesEconomicos[0];
      if (perfil) {
        drawText(`Actividad Profesional/Comercial: ${perfil.actividad}`, 10);
        drawText(`Fuente de Ingresos: ${perfil.fuenteIngresos}`, 10);
        drawText(`Ingreso Mensual: $${perfil.ingresoMensual.toString()}`, 10);
        drawText(`Volumen Estimado de Transacciones: $${perfil.volumenTransacciones.toString()}`, 10);
        drawText(`Clasificación de Riesgo: ${formulario.clasificacionRiesgo || 'PTE'}`, 10, true);
      } else {
        drawText('No se han registrado datos de perfil económico.', 10);
      }
      y -= 15;

      // Sección 4: Checklist Documental
      drawText('4. CHECKLIST DOCUMENTAL', 12, true);
      if (formulario.documentos.length > 0) {
        for (const doc of formulario.documentos) {
          drawText(
            `- Tipo: ${doc.tipo} | Verificado: ${doc.verificado ? 'SÍ' : 'NO'} | Base Legal: ${doc.baseLegal || 'N/A'}`,
            10,
          );
        }
      } else {
        drawText('No se han adjuntado ni verificado documentos.', 10);
      }

      const pdfBytes = await pdfDoc.save();
      pdfJobs.set(jobId, {
        status: 'completed',
        data: Buffer.from(pdfBytes),
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido generando PDF';
      pdfJobs.set(jobId, {
        status: 'failed',
        error: errorMsg,
      });
    }
  }, 0);

  res.status(202).json({ jobId });
}

export async function getPDFJob(req: Request, res: Response): Promise<void> {
  const { id, jobId } = req.params;

  const job = pdfJobs.get(jobId);
  if (!job) {
    res.status(404).json({
      error: { codigo: 'JOB_NO_ENCONTRADO', mensaje: 'Trabajo de exportación no encontrado' },
    });
    return;
  }

  if (job.status === 'generating') {
    res.status(202).json({ status: 'generating' });
    return;
  }

  if (job.status === 'failed') {
    res.status(500).json({
      error: { codigo: 'GENERACION_FALLIDA', mensaje: job.error || 'Error al generar el archivo PDF' },
    });
    return;
  }

  if (job.status === 'completed' && job.data) {
    // Registrar evento de exportación en la auditoría
    await auditoriaRepo.registrarEvento({
      accion: 'EXPORTAR',
      entidad: 'formulario_dds',
      entidadId: id,
      usuarioId: req.usuario?.id || null,
      detalle: { jobId, timestamp: new Date().toISOString() },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="DDS-${id}.pdf"`);
    res.status(200).send(job.data);
    return;
  }

  res.status(500).json({
    error: { codigo: 'ESTADO_INVALIDO', mensaje: 'El trabajo se encuentra en un estado inválido' },
  });
}
