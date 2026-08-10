-- Normalize subscription payment_method labels to Name + last4.
-- Idempotent: only rewrites known legacy strings.

update public.subscription_requests
set
  payment_method = 'Khaled SS (1195)',
  updated_at = now()
where payment_method in (
  'Khaled SS Credit SS WLL (1195)',
  'Khaled SS Credit SS WLL',
  'Credit Card SS WLL',
  'Khaled SS'
);

update public.subscription_requests
set
  payment_method = 'Adeel SS (8864)',
  updated_at = now()
where payment_method = 'Adeel SS';

update public.subscription_requests
set
  payment_method = 'Hannah SW (3223)',
  updated_at = now()
where payment_method = 'Hannah SW';

update public.subscription_requests
set
  payment_method = 'SS AMEX (8015)',
  updated_at = now()
where payment_method = 'SS AMEX';
