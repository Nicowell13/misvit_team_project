-- Admin member management without deleting Supabase Auth accounts.
CREATE OR REPLACE FUNCTION public.admin_update_member_roles(target_member UUID, new_roles TEXT[])
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor_org UUID; target_user UUID;
BEGIN
  SELECT organization_id INTO actor_org FROM public.organization_members
    WHERE user_id=auth.uid() AND 'admin'=ANY(roles) LIMIT 1;
  IF actor_org IS NULL THEN RAISE EXCEPTION 'admin_required'; END IF;
  IF cardinality(new_roles)=0 OR NOT(new_roles <@ ARRAY['admin','manager','finance','member']::TEXT[]) THEN RAISE EXCEPTION 'invalid_roles'; END IF;
  SELECT user_id INTO target_user FROM public.organization_members WHERE id=target_member AND organization_id=actor_org FOR UPDATE;
  IF target_user IS NULL THEN RAISE EXCEPTION 'member_not_found'; END IF;
  IF target_user=auth.uid() AND NOT('admin'=ANY(new_roles)) THEN RAISE EXCEPTION 'cannot_remove_own_admin_role'; END IF;
  UPDATE public.organization_members SET roles=new_roles WHERE id=target_member;
  INSERT INTO public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,metadata)
    VALUES(actor_org,auth.uid(),'UPDATE_ROLES','organization_member',target_member,jsonb_build_object('roles',new_roles));
  RETURN jsonb_build_object('updated',true,'roles',new_roles);
END $$;

CREATE OR REPLACE FUNCTION public.admin_remove_member(target_member UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor_org UUID; target_user UUID;
BEGIN
  SELECT organization_id INTO actor_org FROM public.organization_members
    WHERE user_id=auth.uid() AND 'admin'=ANY(roles) LIMIT 1;
  IF actor_org IS NULL THEN RAISE EXCEPTION 'admin_required'; END IF;
  SELECT user_id INTO target_user FROM public.organization_members WHERE id=target_member AND organization_id=actor_org FOR UPDATE;
  IF target_user IS NULL THEN RAISE EXCEPTION 'member_not_found'; END IF;
  IF target_user=auth.uid() THEN RAISE EXCEPTION 'cannot_remove_self'; END IF;
  INSERT INTO public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,metadata)
    VALUES(actor_org,auth.uid(),'REMOVE','organization_member',target_member,jsonb_build_object('user_id',target_user));
  DELETE FROM public.organization_members WHERE id=target_member;
  RETURN jsonb_build_object('removed',true);
END $$;

REVOKE ALL ON FUNCTION public.admin_update_member_roles(UUID,TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_remove_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_member_roles(UUID,TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_member(UUID) TO authenticated;
