import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS public.fn_crop_list(uuid, uuid, uuid, text, text, boolean, integer, integer);`);
  
  await prisma.$executeRawUnsafe(`
CREATE OR REPLACE FUNCTION public.fn_crop_list(
  p_organization_id uuid,
  p_user_id uuid DEFAULT NULL::uuid,
  p_plot_id uuid DEFAULT NULL::uuid,
  p_status text DEFAULT NULL::text,
  p_q text DEFAULT NULL::text,
  p_include_deleted boolean DEFAULT false,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
 RETURNS TABLE(
   crop_id bigint, 
   organization_id uuid, 
   plot_id uuid, 
   plot_name text,
   property_name text,
   product_id integer, 
   product_name text, 
   status text, 
   growth_stage text, 
   planting_date date, 
   estimated_harvest_date date, 
   actual_harvest_date date, 
   area_ha numeric, 
   notes text, 
   created_at timestamp with time zone, 
   created_by uuid, 
   updated_at timestamp with time zone, 
   updated_by uuid
)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
    SELECT
      c.crop_id,
      c.organization_id,
      c.plot_id,
      pl.name::TEXT AS plot_name,
      pr.name::TEXT AS property_name,
      c.product_id,
      p.name::TEXT AS product_name,
      c.status::TEXT,
      c.growth_stage::TEXT,
      c.planting_date,
      c.estimated_harvest_date,
      c.actual_harvest_date,
      COALESCE(c.area_ha, c.area_planted) AS area_ha,
      c.notes,
      c.created_at,
      c.created_by,
      c.updated_at,
      c.updated_by
    FROM public.crop c
    LEFT JOIN public.product p ON p.product_id = c.product_id
    LEFT JOIN public.plot pl ON c.plot_id = pl.plot_id
    LEFT JOIN public.property pr ON pl.property_id = pr.property_id
    WHERE c.organization_id = p_organization_id
      AND (p_include_deleted OR c.deleted_at IS NULL)
      AND (p_plot_id IS NULL OR c.plot_id = p_plot_id)
      AND (p_status  IS NULL OR c.status::TEXT ILIKE p_status)
      AND (p_q       IS NULL OR c.notes  ILIKE '%' || p_q || '%'
                             OR c.status::TEXT ILIKE '%' || p_q || '%'
                             OR p.name   ILIKE '%' || p_q || '%')
    ORDER BY c.created_at DESC
    LIMIT  GREATEST(p_limit, 1)
    OFFSET GREATEST(p_offset, 0);

  PERFORM public.fn_log_audit_event(
    'crop', 'LIST', 'READLIST',
    p_organization_id, p_user_id,
    jsonb_build_object('plot_id', p_plot_id, 'status', p_status, 'q', p_q)
  );
END;
$function$;
`);
  console.log("fn_crop_list updated successfully.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
