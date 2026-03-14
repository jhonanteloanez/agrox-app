import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Dropping functions to ensure clean recreation...');
    await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS public.fn_create_crop(uuid,integer,date,numeric,date,uuid,uuid,text);`);
    await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS public.fn_crop_set_status_stage(bigint,uuid,uuid,text,text,text);`);

    console.log('Creating fn_create_crop with enum mapping...');
    await prisma.$executeRawUnsafe(`
CREATE OR REPLACE FUNCTION public.fn_create_crop(
    p_plot_id uuid,
    p_product_id integer,
    p_planting_date date,
    p_area_planted numeric,
    p_estimated_harvest_date date DEFAULT NULL,
    p_organization_id uuid DEFAULT NULL,
    p_user_id uuid DEFAULT NULL,
    p_notes text DEFAULT NULL
)
 RETURNS bigint
 LANGUAGE plpgsql
 AS $function$
DECLARE
    v_crop_id                  bigint;
    v_first_stage_raw          text;
    v_first_stage              phenological_stages;
    v_first_stage_order        int;
    v_status_initial           text;
    v_estimated_harvest_date   date;
    v_harvest_time_days        int;
BEGIN
    -- 1) Determinar primera etapa fenológica del producto
    SELECT pps.stage::text, pps.stage_order
      INTO v_first_stage_raw, v_first_stage_order
    FROM product_phenology_stage pps
    WHERE pps.product_id = p_product_id
    ORDER BY pps.stage_order
    LIMIT 1;

    IF v_first_stage_raw IS NULL THEN
        RAISE EXCEPTION 'El producto (%) no tiene etapas fenológicas configuradas.', p_product_id;
    END IF;

    -- Mapeo de minúsculas (phenological_stage) a MAYÚSCULAS PLURAL (phenological_stages)
    v_first_stage := 
        CASE lower(v_first_stage_raw)
            WHEN 'siembra' THEN 'GERMINACION'::phenological_stages
            WHEN 'germinacion' THEN 'GERMINACION'::phenological_stages
            WHEN 'emergencia' THEN 'EMERGENCIA'::phenological_stages
            WHEN 'crecimiento_vegetativo' THEN 'DESARROLLO_VEGETATIVO'::phenological_stages
            WHEN 'desarrollo_vegetativo' THEN 'DESARROLLO_VEGETATIVO'::phenological_stages
            WHEN 'floracion' THEN 'FLORACION'::phenological_stages
            WHEN 'fructificacion' THEN 'FRUCTIFICACION'::phenological_stages
            WHEN 'maduracion' THEN 'MADURACION'::phenological_stages
            WHEN 'cosecha' THEN 'COSECHA'::phenological_stages
            ELSE 'GERMINACION'::phenological_stages
        END;

    -- 2) Estimar fecha de cosecha
    SELECT harvest_time INTO v_harvest_time_days
    FROM product
    WHERE product_id = p_product_id;

    IF p_estimated_harvest_date IS NULL THEN
        IF v_harvest_time_days IS NULL OR v_harvest_time_days <= 0 THEN
            v_harvest_time_days := 90;
        END IF;
        v_estimated_harvest_date := p_planting_date + (v_harvest_time_days || ' days')::interval;
    ELSE
        v_estimated_harvest_date := p_estimated_harvest_date;
    END IF;

    -- 3) Status inicial
    v_status_initial :=
        CASE v_first_stage
            WHEN 'GERMINACION' THEN 'Activo'
            WHEN 'EMERGENCIA' THEN 'Activo'
            WHEN 'DESARROLLO_VEGETATIVO' THEN 'Activo'
            WHEN 'FLORACION' THEN 'En crecimiento'
            WHEN 'COSECHA' THEN 'Cosechado/Finalizado'
            ELSE 'Activo'
        END;

    -- 4) Insert en crop
    INSERT INTO crop (
        plot_id, product_id, planting_date, estimated_harvest_date, status, growth_stage, area_planted, organization_id, created_by
    )
    VALUES (
        p_plot_id, p_product_id, p_planting_date, v_estimated_harvest_date, v_status_initial, v_first_stage, p_area_planted, p_organization_id, p_user_id
    )
    RETURNING crop_id INTO v_crop_id;

    -- 5) Registrar primer hito
    INSERT INTO phenological_stage_progress (
        crop_id, stage, start_date, created_by, observations
    )
    VALUES (
        v_crop_id, v_first_stage_raw::phenological_stage, p_planting_date, p_user_id, COALESCE(p_notes, 'Inicio del ciclo')
    );

    RETURN v_crop_id;
END;
$function$;
    `);

    console.log('Creating fn_crop_set_status_stage with enum mapping...');
    await prisma.$executeRawUnsafe(`
CREATE OR REPLACE FUNCTION public.fn_crop_set_status_stage(
    p_crop_id bigint,
    p_organization_id uuid,
    p_user_id uuid,
    p_new_status text,
    p_new_stage text,
    p_notes text
)
 RETURNS void
 LANGUAGE plpgsql
 AS $function$
DECLARE
  v_mapped_stage phenological_stages;
BEGIN
  IF p_new_stage IS NOT NULL AND p_new_stage <> '' THEN
    v_mapped_stage := 
        CASE lower(p_new_stage)
            WHEN 'germinacion' THEN 'GERMINACION'::phenological_stages
            WHEN 'emergencia' THEN 'EMERGENCIA'::phenological_stages
            WHEN 'crecimiento_vegetativo' THEN 'DESARROLLO_VEGETATIVO'::phenological_stages
            WHEN 'desarrollo_vegetativo' THEN 'DESARROLLO_VEGETATIVO'::phenological_stages
            WHEN 'floracion' THEN 'FLORACION'::phenological_stages
            WHEN 'fructificacion' THEN 'FRUCTIFICACION'::phenological_stages
            WHEN 'llenado_fruto' THEN 'LLENADO_FRUTO'::phenological_stages
            WHEN 'maduracion' THEN 'MADURACION'::phenological_stages
            WHEN 'cosecha' THEN 'COSECHA'::phenological_stages
            WHEN 'poscosecha' THEN 'POSCOSECHA'::phenological_stages
            WHEN 'latencia' THEN 'LATENCIA'::phenological_stages
            ELSE NULL
        END;
  END IF;

  UPDATE public.crop
  SET status       = COALESCE(p_new_status, status),
      growth_stage = COALESCE(v_mapped_stage, growth_stage),
      notes        = COALESCE(p_notes, notes),
      updated_at   = now(),
      updated_by   = p_user_id
  WHERE crop_id = p_crop_id
    AND organization_id = p_organization_id
    AND deleted_at IS NULL;
END;
$function$;
    `);

    console.log('✅ Functions updated successfully.');
  } catch (e) {
    console.error('❌ Error updating functions:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
