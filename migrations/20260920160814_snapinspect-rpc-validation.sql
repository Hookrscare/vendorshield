-- Reject nullable RPC arguments and enforce revision checks for direct callers.
create or replace function public.save_inspection_document(target_org uuid, target_client_id text, expected_revision integer, new_title text, new_document_key text, new_document_url text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare record public.inspections; caller_role text;
begin
  select role into caller_role from public.organization_members where organization_id = target_org and user_id = auth.uid();
  if caller_role is null or caller_role not in ('owner','admin','member') then raise exception 'inspection_write_forbidden' using errcode='42501'; end if;
  if expected_revision is null or target_client_id is null or new_title is null or new_document_key is null or new_document_url is null or target_client_id !~ '^[a-zA-Z0-9_-]{1,100}$' or char_length(new_title) not between 1 and 240 or expected_revision < 0 then raise exception 'invalid_inspection'; end if;
  if new_document_key not like target_org::text || '/' || target_client_id || '/%' or new_document_key like '%..%' then raise exception 'invalid_document_key'; end if;
  -- Serialize both initial insertion and subsequent updates for this tenant/id.
  perform pg_advisory_xact_lock(hashtextextended(target_org::text || ':' || target_client_id, 0));
  select * into record from public.inspections where organization_id = target_org and client_id = target_client_id for update;
  if found then
    if record.revision is distinct from expected_revision then raise exception 'revision_conflict' using errcode='40001'; end if;
    update public.inspections set title=new_title, document_key=new_document_key, document_url=new_document_url, revision=revision+1, updated_at=now()
      where id=record.id returning * into record;
  else
    if expected_revision <> 0 then raise exception 'revision_conflict' using errcode='40001'; end if;
    insert into public.inspections(organization_id,client_id,title,created_by,document_key,document_url,revision)
      values(target_org,target_client_id,new_title,auth.uid(),new_document_key,new_document_url,1) returning * into record;
  end if;
  return jsonb_build_object('id',record.id,'clientId',record.client_id,'revision',record.revision,'updatedAt',record.updated_at);
end $$;
revoke all on function public.save_inspection_document(uuid,text,integer,text,text,text) from public,anon;
grant execute on function public.save_inspection_document(uuid,text,integer,text,text,text) to authenticated;

create or replace function public.set_inspection_share(target_org uuid, target_client_id text, expected_revision integer, token_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare record public.inspections; caller_role text;
begin
  select role into caller_role from public.organization_members where organization_id=target_org and user_id=auth.uid();
  if caller_role is null or caller_role not in ('owner','admin','member') then raise exception 'inspection_share_forbidden' using errcode='42501'; end if;
  if token_hash is not null and token_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid_share_token'; end if;
  select * into record from public.inspections where organization_id=target_org and client_id=target_client_id for update;
  if not found or record.document_key is null then raise exception 'inspection_not_found'; end if;
  if record.revision is distinct from expected_revision then raise exception 'revision_conflict' using errcode='40001'; end if;
  update public.inspections set share_token_hash=token_hash,
    share_document_key=case when token_hash is null then null else document_key end,
    share_expires_at=case when token_hash is null then null else now()+interval '7 days' end
    where id=record.id returning * into record;
  return jsonb_build_object('expiresAt',record.share_expires_at);
end $$;
revoke all on function public.set_inspection_share(uuid,text,integer,text) from public,anon;
grant execute on function public.set_inspection_share(uuid,text,integer,text) to authenticated;
