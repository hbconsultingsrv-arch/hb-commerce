-- Types d'incidents stock : casse, perte, dommage
-- À exécuter après migration-business-expenses.sql

alter table public.business_expenses drop constraint if exists business_expenses_expense_type_check;

alter table public.business_expenses add constraint business_expenses_expense_type_check
  check (expense_type in (
    'livraison', 'stock', 'logistique', 'fournisseur',
    'casse', 'perte', 'dommage', 'autre'
  ));
