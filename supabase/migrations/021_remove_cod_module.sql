-- 021_remove_cod_module.sql
-- The COD module was removed from the portal. Drop its id from per-user module grants.
-- Historical COD tables (cod_email_log, cod_settings keys) are intentionally kept for audit.
update profiles
set allowed_modules = array_remove(allowed_modules, 'cod')
where allowed_modules is not null and 'cod' = any(allowed_modules);
