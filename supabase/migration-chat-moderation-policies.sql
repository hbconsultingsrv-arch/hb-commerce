-- Renforcer les droits de moderation du chat (admin + agent commercial)

drop policy if exists "Admin moderate chat messages" on public.chat_messages;
create policy "Admin moderate chat messages" on public.chat_messages for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Commercial agent moderate assigned chat" on public.chat_messages;
create policy "Commercial agent moderate assigned chat" on public.chat_messages for update
  using (public.is_assigned_commercial_agent(company_id))
  with check (public.is_assigned_commercial_agent(company_id));
